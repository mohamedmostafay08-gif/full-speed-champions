/**
 * A small fake of the Apps Script services the server uses, so the real
 * src/*.js files can run end to end in Node: setup, login, activation,
 * candidate submission, sync. Not a full emulator — only what we call.
 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

const signed = (buf) => Array.from(buf, (b) => (b > 127 ? b - 256 : b));
const unsigned = (arr) => Buffer.from(arr.map((b) => (b + 256) % 256));

function a1ToRange(a1, sheet) {
  const m = a1.match(/^([A-Z]+)(\d+)?(?::([A-Z]+)(\d+)?)?$/);
  const col = (s) => s.split('').reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
  const r1 = +(m[2] || 1), c1 = col(m[1]);
  const c2 = m[3] ? col(m[3]) : c1;
  const r2 = m[4] ? +m[4] : (m[3] ? sheet.getMaxRows() : r1);
  return [r1, c1, r2 - r1 + 1, c2 - c1 + 1];
}

class Sheet {
  constructor(name, rows = []) { this.name = name; this.rows = rows.map((r) => r.slice()); this.validations = {}; this.formats = {}; this.cf = []; }
  getName() { return this.name; }
  getLastRow() {
    for (let r = this.rows.length; r > 0; r--) if (this.rows[r - 1].some((c) => c !== '' && c !== null && c !== undefined)) return r;
    return 0;
  }
  getLastColumn() { return this.rows.reduce((m, r) => { let l = r.length; while (l && (r[l - 1] === '' || r[l - 1] === undefined)) l--; return Math.max(m, l); }, 0); }
  getMaxRows() { return Math.max(1000, this.rows.length); }
  cell(r, c) { return (this.rows[r - 1] || [])[c - 1] ?? ''; }
  put(r, c, v) {
    while (this.rows.length < r) this.rows.push([]);
    const row = this.rows[r - 1];
    while (row.length < c) row.push('');
    row[c - 1] = typeof v === 'string' && v.startsWith("'") ? v.slice(1) : v;
  }
  getRange(r, c, nr = 1, nc = 1) {
    if (typeof r === 'string') [r, c, nr, nc] = a1ToRange(r, this);
    return new Range(this, r, c, nr, nc);
  }
  getDataRange() { return this.getRange(1, 1, Math.max(1, this.getLastRow()), Math.max(1, this.getLastColumn())); }
  appendRow(vals) { const r = this.getLastRow() + 1; vals.forEach((v, i) => this.put(r, i + 1, v)); }
  deleteRow(r) { this.rows.splice(r - 1, 1); }
  setFrozenRows() {}
  clear() { this.rows = []; }
  protect() { const p = { setDescription: () => p, setWarningOnly: () => p }; return p; }
  getConditionalFormatRules() { return this.cf; }
  setConditionalFormatRules(r) { this.cf = r; }
}

class Range {
  constructor(sheet, r, c, nr, nc) { Object.assign(this, { sheet, r, c, nr, nc }); }
  getValues() { return Array.from({ length: this.nr }, (_, i) => Array.from({ length: this.nc }, (_, j) => this.sheet.cell(this.r + i, this.c + j))); }
  setValues(v) { v.forEach((row, i) => row.forEach((x, j) => this.sheet.put(this.r + i, this.c + j, x))); return this; }
  setValue(v) { this.sheet.put(this.r, this.c, v); return this; }
  clearContent() { for (let i = 0; i < this.nr; i++) for (let j = 0; j < this.nc; j++) this.sheet.put(this.r + i, this.c + j, ''); return this; }
  setNumberFormat(f) { this.sheet.formats[this.c] = f; return this; }
  setDataValidation(v) { this.sheet.validations[this.c] = v; return this; }
  setFontWeight() { return this; } setBackground() { return this; } setFontColor() { return this; } setFontSize() { return this; }
  getSheet() { return this.sheet; } getRow() { return this.r; } getColumn() { return this.c; }
  getNumRows() { return this.nr; } getNumColumns() { return this.nc; }
}

function builder(kind) {
  const b = { kind, list: null };
  return new Proxy(b, {
    get(t, k) {
      if (k === 'build') return () => t;
      if (k === 'requireValueInList') return (l) => { t.list = l; return this.receiver; };
      if (k in t) return t[k];
      return function () { return this; };
    }
  });
}

function makeEnv(tabs) {
  const sheets = Object.fromEntries(Object.entries(tabs).map(([n, rows]) => [n, new Sheet(n, rows)]));
  const cache = new Map();
  const triggers = [];
  const ss = {
    getSheetByName: (n) => sheets[n] || null,
    insertSheet: (n) => (sheets[n] = new Sheet(n)),
    deleteSheet: (sh) => { delete sheets[sh.getName()]; },
    setSpreadsheetTimeZone() {}
  };
  const pad = (n) => String(n).padStart(2, '0');
  const g = {
    console,
    SpreadsheetApp: {
      openById: () => ss, getActiveSpreadsheet: () => ss,
      newDataValidation: () => { const v = { list: null }; const p = new Proxy(v, { get: (t, k) => k === 'build' ? () => t : k === 'requireValueInList' ? (l) => { t.list = l; return p; } : () => p }); return p; },
      newConditionalFormatRule: () => { const r = { ranges: [] }; const p = new Proxy(r, { get: (t, k) => k === 'build' ? () => ({ getRanges: () => t.ranges }) : k === 'setRanges' ? (x) => { t.ranges = x; return p; } : () => p }); return p; },
      getUi: () => ({ alert() {}, createMenu: () => ({ addItem() { return this; }, addToUi() {} }) })
    },
    Utilities: {
      DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' },
      computeDigest: (alg, s) => signed(crypto.createHash('sha256').update(String(s), 'utf8').digest()),
      newBlob: (s) => ({ getBytes: () => signed(Buffer.from(String(s), 'utf8')) }),
      computeHmacSha256Signature: (value, key) => signed(crypto.createHmac('sha256', unsigned(key)).update(unsigned(value)).digest()),
      base64Encode: (bytes) => unsigned(bytes).toString('base64'),
      getUuid: () => crypto.randomUUID(),
      formatDate: (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    },
    Session: { getScriptTimeZone: () => 'Africa/Cairo' },
    CacheService: { getScriptCache: () => ({ get: (k) => cache.get(k) ?? null, put: (k, v) => cache.set(k, v), remove: (k) => cache.delete(k),
      getAll: (ks) => Object.fromEntries(ks.filter((k) => cache.has(k)).map((k) => [k, cache.get(k)])),
      putAll: (o) => Object.entries(o).forEach(([k, v]) => cache.set(k, v)) }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, waitLock() {}, releaseLock() {} }) },
    ScriptApp: {
      getService: () => ({ getUrl: () => 'https://script.google.com/macros/s/TEST/exec' }),
      getProjectTriggers: () => triggers,
      newTrigger: (fn) => { const t = { getHandlerFunction: () => fn }; const chain = new Proxy({}, { get: (_, k) => k === 'create' ? () => triggers.push(t) : () => chain }); return chain; }
    },
    HtmlService: {
      createHtmlOutputFromFile: () => ({ getContent: () => 'LOCAL Full Speed Champions google.script' }),
      createHtmlOutput: (h) => { const o = { html: h, setTitle: () => o, addMetaTag: () => o }; return o; }
    },
    UrlFetchApp: { fetch: (url) => { g.__fetched = (g.__fetched || 0) + 1; return g.__remote(url); } },
    MailApp: { sendEmail: (o) => { (g.__mails = g.__mails || []).push(o); } },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (t) => ({ text: t, setMimeType() { return this; } }) }
  };
  const ctx = vm.createContext(g);
  const dir = path.join(__dirname, '..', 'src');
  if (process.env.FS_SINGLE) {
    // Run the combined dist/single-file/Code.gs exactly as it will be pasted.
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'dist', 'single-file', 'Code.gs'), 'utf8'), ctx, { filename: 'Code.gs' });
  } else {
    for (const f of ['Config.js', 'Core.js', 'Logic.js', 'Sheets.js', 'Auth.js', 'Code.js', 'Admin.js']) {
      vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), ctx, { filename: f });
    }
  }
  // Each api() call is a fresh Apps Script execution: per-request memo is reset.
  const api = (action, payload) => { vm.runInContext('SS_ = null; WORLD_ = null; CFG_ = null;', ctx); return ctx.api(action, payload); };
  return { ctx, sheets, cache, triggers, api };
}

module.exports = { makeEnv };
