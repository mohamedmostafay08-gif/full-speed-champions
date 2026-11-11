// ════════════════════════ Config ════════════════════════

/**
 * Full Speed Champions — configuration.
 *
 * Values here are defaults. Anything in the "FS Config" tab overrides them,
 * so the operations team can change the season, the window or the nudge
 * delay without touching code. Bonus tiers live in the "FS Bonus Tiers" tab.
 */

var APP = {
  // The spreadsheet the program is linked to. If the script is bound to the
  // sheet (Extensions → Apps Script), this can be left empty.
  SHEET_ID: '1CGf_CJLStWuRAHp6dNc3Ty1FJoHLDl7sRIqMno_NS54',

  NAME: 'Full Speed Champions',
  SLOGAN: 'Not Just faster, Smarter'
};

/** Defaults for the "FS Config" tab (key → value). */
var CONFIG_DEFAULTS = {
  PROGRAM_START_DATE: '2026-11-01',   // hires before this day are ignored
  BONUS_WINDOW_MONTHS: 2,             // calendar months from the hire date
  NUDGE_AFTER_DAYS: 3,                // flag a stuck candidate after N days
  COMPANY_REF_CODE: '3901026',        // the shared Talabat code external partners use
  TALABAT_REF_BASE: 'https://rider-eg.talabat.com/?utm_source=raf&utm_medium=raf&utm_campaign=raf&utm_content=raf_',
  SESSION_DAYS: 7,
  MAX_LOGIN_FAILURES: 5,              // then the account is locked for LOCK_MINUTES
  LOCK_MINUTES: 15,
  PUBLIC_APPLY_PER_HOUR: 30,          // per referral link
  MIN_PASSWORD_LENGTH: 6,
  SUPPORT_WHATSAPP: '201097865980'
};

/** Tab names. Existing tabs keep their current names. */
var TABS = {
  RIDERS: 'Normal Riders Handle',     // hires exported from Talabat (source of truth)
  HEADCOUNT: 'Headcount',             // IMPORTRANGE — read only, never written
  APPLICANTS: 'New Applicants',       // candidates submitted through the program
  DAILY_ORDERS: 'Daily Orders',       // date | rider code | completed orders
  USERS: 'FS Users',
  SESSIONS: 'FS Sessions',
  CONFIG: 'FS Config',
  TIERS: 'FS Bonus Tiers',
  LOG: 'FS Log',
  // Legacy tabs, read once by the migration and then left untouched.
  LEGACY_PASSWORDS: 'Passwords',
  LEGACY_PARTNERS: 'External Partners',
  LEGACY_SESSIONS: 'Sessions'
};

/**
 * Column headers, matched by name (case, spaces and punctuation ignored),
 * never by position — inserting a column in the sheet no longer breaks
 * anything. The first name is the one the setup writes.
 */
var COLUMNS = {
  RIDERS: {
    hireDate: ['تاريخ التعيين', 'Hire Date'],
    code: ['كود المندوب', 'Code', 'Rider Code'],
    name: ['Name', 'الاسم', 'اسم المندوب'],
    zone: ['Zone', 'المنطقة'],
    phone: ['Phone', 'الموبايل'],
    vehicle: ['Vehicle', 'المركبة'],
    orders: ['Orders', 'الأوردرات'],
    referralCode: ['Referral Code', 'مرشح بواسطة (الكود)', 'مرشح بواسطة'],
    referralName: ['Referral Name']
  },
  HEADCOUNT: {
    code: ['Code'],
    name: ['Rider COD Rider Name', 'Name'],
    zone: ['Zone'],
    supervisor: ['SPV', 'Supervisor'],
    manager: ['Manger', 'Manager'],
    phone: ['Phone'],
    vehicle: ['Vehicle'],
    active: ['Active ?', 'Active']
  },
  APPLICANTS: {
    timestamp: ['Timestamp', 'تاريخ التقديم'],
    refCode: ['Referral Code', 'كود المرشِّح'],
    name: ['الاسم الرباعي'],
    phone: ['الموبايل'],
    nationalId: ['الرقم القومي'],
    address: ['العنوان'],
    zone: ['المنطقة'],
    licenseExpiry: ['انتهاء الرخصة'],
    idExpiry: ['انتهاء البطاقة'],
    birthDate: ['تاريخ الميلاد'],
    plate: ['اللوحة'],
    status: ['الحالة'],
    note: ['ملاحظات الإدارة'],
    link: ['لينك الترشيح'],
    refType: ['نوع المرشِّح'],
    statusUpdated: ['آخر تحديث للحالة'],
    hiredCode: ['كود بعد التعيين'],
    hiredDate: ['تاريخ التعيين الفعلي']
  },
  DAILY_ORDERS: {
    date: ['التاريخ', 'Date'],
    code: ['كود المندوب', 'Rider Code', 'Code'],
    orders: ['أوردرات مكتملة', 'Completed Orders', 'Orders']
  },
  USERS: {
    type: ['Type'],
    code: ['Code'],
    name: ['Name'],
    phone: ['Phone'],
    refId: ['Ref ID'],
    hash: ['Password Hash'],
    status: ['Status'],
    created: ['Created'],
    lastLogin: ['Last Login']
  },
  SESSIONS: {
    tokenHash: ['Token Hash'],
    code: ['Code'],
    type: ['Type'],
    created: ['Created'],
    expires: ['Expires']
  }
};

/**
 * Candidate pipeline. The order is the timeline shown to the referrer.
 * "اشتغل" is also set automatically once the candidate's phone appears in
 * the riders tab (see syncApplicants).
 */
var STATUSES = ['جديد', 'تم التواصل', 'قيد التعيين', 'تم حضور المحاضرة', 'اشتغل', 'مرفوض'];
var STATUS_HIRED = 'اشتغل';
var STATUS_REJECTED = 'مرفوض';

/** Values found in the old sheet, mapped onto the new pipeline. */
var LEGACY_STATUS_MAP = {
  'ارفع استمارة': 'جديد',            // candidate just recruited, form not processed yet
  'تم التعيين': 'اشتغل',
  'شغال': 'اشتغل',
  'استلم ونزل': 'اشتغل',
  'معلق': 'مرفوض'
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    APP: APP, CONFIG_DEFAULTS: CONFIG_DEFAULTS, TABS: TABS, COLUMNS: COLUMNS,
    STATUSES: STATUSES, STATUS_HIRED: STATUS_HIRED, STATUS_REJECTED: STATUS_REJECTED,
    LEGACY_STATUS_MAP: LEGACY_STATUS_MAP
  };
}


// ════════════════════════ Core ════════════════════════

/**
 * Full Speed — Core logic.
 *
 * Pure functions only: no SpreadsheetApp / CacheService calls here, so the
 * same file runs in Apps Script (V8) and in Node for the test suite.
 *
 * Contents:
 *   1. Dates      — tolerant parsing of sheet values, calendar-month math
 *   2. Identity   — Egyptian phone numbers and national IDs
 *   3. Bonus      — tiers and per-referral evaluation
 *   4. Duplicates — "is this candidate really new to Full Speed?"
 */

var DAY_MS = 24 * 60 * 60 * 1000;

/* ───────────────────────────── 1. Dates ───────────────────────────── */

var MONTHS_ = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
};

/** Strips the time part, keeping the local calendar day. */
function dateOnly(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d, n) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

/** Whole calendar days from a to b (b - a). Rounds to survive DST shifts. */
function diffDays(a, b) {
  return Math.round((dateOnly(b) - dateOnly(a)) / DAY_MS);
}

/** Builds a date and rejects impossible ones such as 31 February. */
function makeDate_(y, m, d) {
  var dt = new Date(y, m, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m || dt.getDate() !== d) return null;
  return dt;
}

function fullYear_(y) {
  y = parseInt(y, 10);
  return y < 100 ? 2000 + y : y;
}

/**
 * Turns whatever is in a sheet cell into a date (time stripped), or null.
 *
 * Handles: Date objects, Sheets serial numbers, "2026-11-08",
 * "8-Nov", "8 Nov 2026", "8-Nov-26", "11/4/2026 17:25:30".
 *
 * Dates written without a year ("8-Nov", as Talabat exports them) get the
 * most recent year that does not put them in the future, so "1-Jan" read on
 * 5 Jan 2027 is 2027, not 2026.
 *
 * opts.today       reference day for year inference (default: now)
 * opts.slashOrder  'MDY' or 'DMY' for ambiguous "4/11/2026" (default 'MDY',
 *                  matching the sheet's US locale)
 */
function parseSheetDate(value, opts) {
  opts = opts || {};
  if (value === null || value === undefined || value === '') return null;

  if (Object.prototype.toString.call(value) === '[object Date]') {
    return isNaN(value.getTime()) ? null : dateOnly(value);
  }

  if (typeof value === 'number') {
    // Google Sheets serial day (days since 1899-12-30).
    if (value < 20000 || value > 80000) return null;
    var u = new Date(Math.round((value - 25569) * DAY_MS));
    return new Date(u.getUTCFullYear(), u.getUTCMonth(), u.getUTCDate());
  }

  var s = String(value).trim().replace(/[T\s]+\d{1,2}:\d{2}(:\d{2})?.*$/, '');
  var m;

  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return makeDate_(+m[1], +m[2] - 1, +m[3]);

  m = s.match(/^(\d{1,2})[\s\-\/]+([A-Za-z]{3,})\.?(?:[\s\-\/,]+(\d{2,4}))?$/);
  if (m) {
    var mon = MONTHS_[m[2].slice(0, 3).toLowerCase()];
    if (mon === undefined) return null;
    if (m[3]) return makeDate_(fullYear_(m[3]), mon, +m[1]);
    return inferYear_(mon, +m[1], opts.today);
  }

  m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (m) {
    var a = +m[1], b = +m[2], y = fullYear_(m[3]);
    var order = a > 12 ? 'DMY' : b > 12 ? 'MDY' : (opts.slashOrder || 'MDY');
    return order === 'DMY' ? makeDate_(y, b - 1, a) : makeDate_(y, a - 1, b);
  }

  return null;
}

function inferYear_(month, day, today) {
  var ref = dateOnly(today || new Date());
  var d = makeDate_(ref.getFullYear(), month, day);
  // A few days of slack so a hire entered slightly early isn't pushed back a year.
  if (d && diffDays(ref, d) > 7) d = makeDate_(ref.getFullYear() - 1, month, day);
  return d;
}

/* ──────────────────────────── 2. Identity ─────────────────────────── */

/**
 * Canonical Egyptian mobile: "01XXXXXXXXX", or null if it isn't one.
 * Accepts 1148005931 (leading zero lost in the sheet), +201148005931,
 * 00201148005931, "0114 800 5931" …
 */
function canonicalPhone(raw) {
  var d = String(raw === null || raw === undefined ? '' : raw).replace(/\D/g, '');
  if (d.indexOf('0020') === 0) d = d.slice(4);
  else if (d.indexOf('20') === 0 && d.length === 12) d = d.slice(2);
  if (d.length === 11 && d.charAt(0) === '0') d = d.slice(1);
  return /^1[0125]\d{8}$/.test(d) ? '0' + d : null;
}

/** "01148005931" → "201148005931" for wa.me / tel: links. */
function internationalPhone(canonical) {
  return canonical ? '20' + canonical.slice(1) : '';
}

var GOVERNORATE_CODES_ = {
  '01': 'القاهرة', '02': 'الإسكندرية', '03': 'بورسعيد', '04': 'السويس',
  '11': 'دمياط', '12': 'الدقهلية', '13': 'الشرقية', '14': 'القليوبية',
  '15': 'كفر الشيخ', '16': 'الغربية', '17': 'المنوفية', '18': 'البحيرة',
  '19': 'الإسماعيلية', '21': 'الجيزة', '22': 'بني سويف', '23': 'الفيوم',
  '24': 'المنيا', '25': 'أسيوط', '26': 'سوهاج', '27': 'قنا', '28': 'أسوان',
  '29': 'الأقصر', '31': 'البحر الأحمر', '32': 'الوادي الجديد', '33': 'مطروح',
  '34': 'شمال سيناء', '35': 'جنوب سيناء', '88': 'خارج الجمهورية'
};

/**
 * Parses an Egyptian national ID. Returns null unless the embedded birth
 * date and governorate code are real — catches most typos, not just length.
 */
function parseNationalId(raw) {
  var s = String(raw === null || raw === undefined ? '' : raw).replace(/\D/g, '');
  if (!/^[23]\d{13}$/.test(s)) return null;

  var century = s.charAt(0) === '2' ? 1900 : 2000;
  var birth = makeDate_(century + +s.slice(1, 3), +s.slice(3, 5) - 1, +s.slice(5, 7));
  var gov = s.slice(7, 9);
  if (!birth || !GOVERNORATE_CODES_[gov]) return null;

  return {
    id: s,
    birthDate: birth,
    governorate: GOVERNORATE_CODES_[gov],
    gender: (+s.charAt(12)) % 2 === 1 ? 'male' : 'female'
  };
}

/** Age in whole years on a given day. */
function ageOn(birthDate, day) {
  var age = day.getFullYear() - birthDate.getFullYear();
  var hadBirthday = day.getMonth() > birthDate.getMonth() ||
    (day.getMonth() === birthDate.getMonth() && day.getDate() >= birthDate.getDate());
  return hadBirthday ? age : age - 1;
}

/* ───────────────────────────── 3. Bonus ───────────────────────────── */

/** 250→600, +50 orders → +200 EGP, up to 850→3000 (the November poster). */
function buildLinearTiers(firstOrders, stepOrders, firstBonus, stepBonus, maxOrders) {
  var tiers = [];
  for (var o = firstOrders, b = firstBonus; o <= maxOrders; o += stepOrders, b += stepBonus) {
    tiers.push({ orders: o, bonus: b });
  }
  return tiers;
}

var DEFAULT_TIERS = buildLinearTiers(250, 50, 600, 200, 850);
var DEFAULT_WINDOW_MONTHS = 2;

/** Tier reached for an order count. tiers must be sorted ascending. */
function tierFor(orders, tiers) {
  var current = null, next = null;
  for (var i = 0; i < tiers.length; i++) {
    if (orders >= tiers[i].orders) current = tiers[i];
    else { next = tiers[i]; break; }
  }
  return { current: current, next: next, bonus: current ? current.bonus : 0 };
}

/**
 * Last day whose orders still count, for a window of N calendar months.
 *   hired 8 Nov  → counts through 7 Jan
 *   hired 1 Nov  → counts through 31 Dec
 *   hired 31 Dec → counts through end of February (no 31 Feb)
 */
function lastBonusDay(hireDate, months) {
  var y = hireDate.getFullYear(), m = hireDate.getMonth() + months, d = hireDate.getDate();
  var monthLength = new Date(y, m + 1, 0).getDate();
  if (d > monthLength) return new Date(y, m, monthLength);
  return new Date(y, m, d - 1);
}

/**
 * Evaluates one referred rider.
 *
 * input.hireDate     Date
 * input.dailyOrders  [{ date: Date, orders: number }] completed orders per day
 * input.today        Date
 * input.tiers        optional, defaults to DEFAULT_TIERS
 * input.windowMonths optional, defaults to 2
 *
 * Only orders inside the window count, so the bonus freezes at whatever was
 * reached by the last day — it never drops to zero afterwards, and orders
 * made after the window can never push it up.
 *
 * state: 'upcoming' (hire date in the future) | 'active' | 'maxed' | 'closed'
 */
function evaluateReferral(input) {
  var tiers = input.tiers || DEFAULT_TIERS;
  var months = input.windowMonths || DEFAULT_WINDOW_MONTHS;
  var maxTier = tiers[tiers.length - 1];
  var hire = dateOnly(input.hireDate);
  var today = dateOnly(input.today || new Date());
  var lastDay = lastBonusDay(hire, months);

  var days = (input.dailyOrders || [])
    .filter(function (r) { return r && r.date && r.date >= hire && r.date <= lastDay; })
    .sort(function (a, b) { return a.date - b.date; });

  var orders = 0, maxReachedOn = null;
  for (var i = 0; i < days.length; i++) {
    var n = Math.max(0, Math.floor(Number(days[i].orders) || 0));
    orders += n;
    if (!maxReachedOn && orders >= maxTier.orders) maxReachedOn = dateOnly(days[i].date);
  }

  // No daily breakdown: fall back to a single total typed by hand into the
  // riders tab. We then know *that* the max was reached, but not the day.
  var manual = !days.length && input.totalOrders !== undefined && input.totalOrders !== null && input.totalOrders !== '';
  if (manual) orders = Math.max(0, Math.floor(Number(input.totalOrders) || 0));
  var reachedMax = orders >= maxTier.orders;
  if (manual && reachedMax && !maxReachedOn) maxReachedOn = today < lastDay ? today : lastDay;

  var t = tierFor(orders, tiers);
  var state;
  if (today < hire) state = 'upcoming';
  else if (reachedMax) state = 'maxed';
  else if (today > lastDay) state = 'closed';
  else state = 'active';

  var floor = t.current ? t.current.orders : 0;
  var progress = t.next ? (orders - floor) / (t.next.orders - floor) : 1;

  return {
    hireDate: hire,
    lastDay: lastDay,
    orders: orders,
    bonus: t.bonus,
    currentTier: t.current,
    nextTier: t.next,
    ordersToNext: t.next ? t.next.orders - orders : 0,
    progress: Math.max(0, Math.min(1, progress)),
    state: state,
    // 0 means today is the last counting day.
    daysLeft: state === 'active' ? diffDays(today, lastDay) : (state === 'upcoming' ? diffDays(hire, lastDay) : 0),
    maxReachedOn: maxReachedOn,
    // Paid once the window ends, or early when the maximum is reached.
    payoutDate: maxReachedOn || addDays(lastDay, 1),
    ordersSource: manual ? 'manual' : 'daily'
  };
}

/** For the simulator: riders × average orders, same tiers as the real thing. */
function simulateBonus(riderCount, avgOrders, tiers) {
  var per = tierFor(Math.max(0, Math.floor(avgOrders || 0)), tiers || DEFAULT_TIERS).bonus;
  return { perRider: per, total: per * Math.max(0, Math.floor(riderCount || 0)) };
}

/* ─────────────────────────── 4. Duplicates ────────────────────────── */

/**
 * Builds a lookup of every phone / national ID Full Speed already knows.
 *
 * records: [{ source: 'Headcount' | 'Normal Riders Handle' | 'New Applicants' | …,
 *             phone, nationalId, label }]
 */
function buildIdentityIndex(records) {
  var index = {};
  function add(key, rec) {
    if (!key) return;
    (index[key] = index[key] || []).push({ source: rec.source, label: rec.label || '' });
  }
  for (var i = 0; i < records.length; i++) {
    var r = records[i];
    var phone = canonicalPhone(r.phone);
    var nid = parseNationalId(r.nationalId);
    add(phone && 'p:' + phone, r);
    add(nid && 'n:' + nid.id, r);
  }
  return index;
}

/**
 * Everything that matches the candidate. Empty array = genuinely new.
 * Any match blocks the submission: the rule is "new to Full Speed".
 */
function findDuplicates(candidate, index) {
  var hits = [];
  var phone = canonicalPhone(candidate.phone);
  var nid = parseNationalId(candidate.nationalId);
  (phone && index['p:' + phone] || []).forEach(function (h) {
    hits.push({ field: 'phone', source: h.source, label: h.label });
  });
  (nid && index['n:' + nid.id] || []).forEach(function (h) {
    hits.push({ field: 'nationalId', source: h.source, label: h.label });
  });
  return hits;
}

/* Node (tests) only — Apps Script has no `module` and ignores this. */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    dateOnly: dateOnly, addDays: addDays, diffDays: diffDays, parseSheetDate: parseSheetDate,
    canonicalPhone: canonicalPhone, internationalPhone: internationalPhone,
    parseNationalId: parseNationalId, ageOn: ageOn,
    buildLinearTiers: buildLinearTiers, DEFAULT_TIERS: DEFAULT_TIERS, tierFor: tierFor,
    lastBonusDay: lastBonusDay, evaluateReferral: evaluateReferral, simulateBonus: simulateBonus,
    buildIdentityIndex: buildIdentityIndex, findDuplicates: findDuplicates
  };
}


// ════════════════════════ Logic ════════════════════════

/**
 * Full Speed — business logic on plain records.
 *
 * Sheets.js turns tabs into arrays of objects; everything here works on those
 * arrays only, so it is fully testable in Node.
 */

if (typeof module !== 'undefined' && module.exports) {
  Object.assign(globalThis, require('./Core.js'), require('./Config.js'));
}

/* ───────────────────────── Text normalisation ─────────────────────── */

/** Folds Arabic spelling variants so "المحاضره" equals "المحاضرة". */
function normalizeArabic(s) {
  return String(s === null || s === undefined ? '' : s)
    .replace(/[ً-ْـ]/g, '')   // harakat + tatweel
    .replace(/[إأآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .trim();
}

/** Header key: case, whitespace and punctuation don't matter. */
function headerKey(s) {
  return normalizeArabic(s).toLowerCase().replace(/[\s_\-?:().\/]+/g, '');
}

/** { field: columnIndex | -1 } for a header row and a COLUMNS spec. */
function mapHeaders(headerRow, spec) {
  var keys = headerRow.map(headerKey);
  var map = {};
  Object.keys(spec).forEach(function (field) {
    map[field] = -1;
    for (var i = 0; i < spec[field].length; i++) {
      var idx = keys.indexOf(headerKey(spec[field][i]));
      if (idx !== -1) { map[field] = idx; break; }
    }
  });
  return map;
}

/** Sheet values (header row first) → [{ _row, field: value }]. Blank rows skipped. */
function rowsToRecords(values, spec) {
  if (!values || values.length < 1) return [];
  var map = mapHeaders(values[0], spec);
  var out = [];
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    if (!row || row.every(function (c) { return c === '' || c === null; })) continue;
    var rec = { _row: r + 1 };
    Object.keys(map).forEach(function (f) { rec[f] = map[f] === -1 ? '' : row[map[f]]; });
    out.push(rec);
  }
  return out;
}

function cleanText(v) {
  var s = String(v === null || v === undefined ? '' : v).trim();
  return /^#(REF|N\/A|VALUE|ERROR|NAME)/i.test(s) ? '' : s;
}

/** Codes come back from the sheet as numbers sometimes (5037723 or 5037723.0). */
function cleanCode(v) {
  var s = cleanText(v);
  return /^\d+(\.0+)?$/.test(s) ? String(parseInt(s, 10)) : s;
}

/** Stops "=IMPORTXML(...)" typed in a form from running as a formula. */
function safeCell(v) {
  var s = String(v === null || v === undefined ? '' : v).trim().slice(0, 300);
  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
}

/* ──────────────────────────── Statuses ────────────────────────────── */

var STATUS_KEYS_ = null;

/** Any spelling found in the sheet → one of STATUSES (or '' if unknown). */
function normalizeStatus(raw) {
  if (!STATUS_KEYS_) {
    STATUS_KEYS_ = {};
    STATUSES.forEach(function (s) { STATUS_KEYS_[headerKey(s)] = s; });
    Object.keys(LEGACY_STATUS_MAP).forEach(function (k) { STATUS_KEYS_[headerKey(k)] = LEGACY_STATUS_MAP[k]; });
  }
  var key = headerKey(raw);
  if (!key) return STATUSES[0];
  return STATUS_KEYS_[key] || '';
}

/* ───────────────────────────── Config ─────────────────────────────── */

/** Merges "FS Config" rows over CONFIG_DEFAULTS and parses the types. */
function resolveConfig(rows, tierRows) {
  var cfg = {};
  Object.keys(CONFIG_DEFAULTS).forEach(function (k) { cfg[k] = CONFIG_DEFAULTS[k]; });
  (rows || []).forEach(function (r) {
    var k = cleanText(r[0]);
    if (k && Object.prototype.hasOwnProperty.call(CONFIG_DEFAULTS, k) && cleanText(r[1]) !== '') cfg[k] = r[1];
  });
  ['BONUS_WINDOW_MONTHS', 'NUDGE_AFTER_DAYS', 'SESSION_DAYS', 'MAX_LOGIN_FAILURES', 'LOCK_MINUTES',
    'PUBLIC_APPLY_PER_HOUR', 'MIN_PASSWORD_LENGTH'].forEach(function (k) {
    cfg[k] = parseInt(cfg[k], 10) || CONFIG_DEFAULTS[k];
  });
  cfg.COMPANY_REF_CODE = cleanCode(cfg.COMPANY_REF_CODE);
  cfg.PROGRAM_START_DATE = parseSheetDate(cfg.PROGRAM_START_DATE) || parseSheetDate(CONFIG_DEFAULTS.PROGRAM_START_DATE);

  var tiers = (tierRows || [])
    .map(function (r) { return { orders: parseInt(r[0], 10), bonus: parseInt(String(r[1]).replace(/[^\d]/g, ''), 10) }; })
    .filter(function (t) { return t.orders > 0 && t.bonus > 0; })
    .sort(function (a, b) { return a.orders - b.orders; });
  cfg.TIERS = tiers.length ? tiers : DEFAULT_TIERS;
  return cfg;
}

/* ───────────────────────────── World ──────────────────────────────── */

/**
 * Normalises raw tab records into one in-memory picture of the program.
 * raw = { riders, headcount, applicants, dailyOrders, users } (rowsToRecords output)
 */
function buildWorld(raw, cfg, today) {
  var opts = { today: today };

  var riders = (raw.riders || []).map(function (r) {
    return {
      row: r._row,
      code: cleanCode(r.code),
      name: cleanText(r.name),
      zone: cleanText(r.zone),
      phone: canonicalPhone(r.phone),
      vehicle: cleanText(r.vehicle),
      hireDate: parseSheetDate(r.hireDate, opts),
      orders: cleanText(r.orders) === '' ? null : Number(r.orders) || 0,
      referralCode: cleanCode(r.referralCode)
    };
  }).filter(function (r) { return r.code; });

  var headcount = (raw.headcount || []).map(function (h) {
    return {
      code: cleanCode(h.code), name: cleanText(h.name), zone: cleanText(h.zone),
      supervisor: cleanText(h.supervisor), manager: cleanText(h.manager),
      phone: canonicalPhone(h.phone), vehicle: cleanText(h.vehicle), active: cleanText(h.active)
    };
  }).filter(function (h) { return h.code; });

  var applicants = (raw.applicants || []).map(function (a) {
    var nid = parseNationalId(a.nationalId);
    return {
      row: a._row,
      timestamp: parseSheetDate(a.timestamp, opts),
      refCode: cleanText(a.refCode),
      name: cleanText(a.name),
      phone: canonicalPhone(a.phone),
      nationalId: nid ? nid.id : cleanText(a.nationalId).replace(/\D/g, ''),
      zone: cleanText(a.zone),
      rawStatus: cleanText(a.status),
      status: normalizeStatus(a.status),
      note: cleanText(a.note),
      statusUpdated: parseSheetDate(a.statusUpdated, opts),
      hiredCode: cleanCode(a.hiredCode)
    };
  });

  var dailyOrders = {};
  (raw.dailyOrders || []).forEach(function (d) {
    var code = cleanCode(d.code), date = parseSheetDate(d.date, opts);
    if (!code || !date) return;
    (dailyOrders[code] = dailyOrders[code] || []).push({ date: date, orders: Number(d.orders) || 0 });
  });

  var ridersByPhone = {}, ridersByCode = {}, headcountByCode = {};
  riders.forEach(function (r) {
    ridersByCode[r.code] = r;
    if (r.phone && !ridersByPhone[r.phone]) ridersByPhone[r.phone] = r;
  });
  headcount.forEach(function (h) { headcountByCode[h.code] = h; });

  // Earliest application per phone decides who referred that person.
  var appsByPhone = {};
  applicants.slice().sort(function (a, b) { return (a.timestamp || 0) - (b.timestamp || 0); })
    .forEach(function (a) { if (a.phone && !appsByPhone[a.phone]) appsByPhone[a.phone] = a; });

  return {
    cfg: cfg, today: dateOnly(today),
    riders: riders, headcount: headcount, applicants: applicants, dailyOrders: dailyOrders,
    ridersByPhone: ridersByPhone, ridersByCode: ridersByCode, headcountByCode: headcountByCode,
    appsByPhone: appsByPhone
  };
}

/* ─────────────────────────── Attribution ──────────────────────────── */

/**
 * The key a user's referrals are stored under:
 * internal riders → their Talabat code, external partners → their phone.
 */
function ownerKey(user) {
  return user.type === 'external' ? canonicalPhone(user.phone || user.code) : cleanCode(user.code);
}

/** Normalises the "Referral Code" cell of an application to an owner key. */
function appOwnerKey(refCode) {
  return canonicalPhone(refCode) || cleanCode(refCode);
}

/**
 * Who gets the bonus for a hired rider.
 *
 * Talabat's own referral code wins — except the shared company code that all
 * external partners use. Riders under that code (or with no code) belong to
 * whoever submitted their application in the program.
 */
function riderOwner(rider, world) {
  if (rider.referralCode && rider.referralCode !== world.cfg.COMPANY_REF_CODE) return rider.referralCode;
  var app = rider.phone && world.appsByPhone[rider.phone];
  return app ? appOwnerKey(app.refCode) : '';
}

/* ──────────────────────────── Dashboard ───────────────────────────── */

function stageIndex(status) {
  var i = STATUSES.indexOf(status);
  return i === -1 ? 0 : i;
}

/** Everything the app shows a signed-in user, in one object. */
function buildDashboard(world, user) {
  var cfg = world.cfg, today = world.today, key = ownerKey(user);
  var start = cfg.PROGRAM_START_DATE;

  // ── Team: hired riders credited to this user ──
  var team = world.riders
    .filter(function (r) { return r.hireDate && r.hireDate >= start && r.code !== key && riderOwner(r, world) === key; })
    .map(function (r) {
      var ev = evaluateReferral({
        hireDate: r.hireDate,
        dailyOrders: world.dailyOrders[r.code] || [],
        totalOrders: r.orders,
        today: today,
        tiers: cfg.TIERS,
        windowMonths: cfg.BONUS_WINDOW_MONTHS
      });
      return {
        code: r.code, name: r.name, zone: r.zone, phone: r.phone, vehicle: r.vehicle,
        hireDate: ev.hireDate, lastDay: ev.lastDay, payoutDate: ev.payoutDate,
        orders: ev.orders, bonus: ev.bonus, state: ev.state, daysLeft: ev.daysLeft,
        ordersToNext: ev.ordersToNext, progress: ev.progress,
        nextBonus: ev.nextTier ? ev.nextTier.bonus : null, nextOrders: ev.nextTier ? ev.nextTier.orders : null
      };
    })
    .sort(function (a, b) {
      var rank = { active: 0, upcoming: 1, maxed: 2, closed: 3 };
      return (rank[a.state] - rank[b.state]) || (a.daysLeft - b.daysLeft) || (b.hireDate - a.hireDate);
    });

  // ── Pipeline: applications submitted for this user ──
  var pipeline = world.applicants
    .filter(function (a) { return appOwnerKey(a.refCode) === key && a.timestamp && a.timestamp >= start; })
    .map(function (a) {
      var hired = a.phone && world.ridersByPhone[a.phone];
      var status = hired ? STATUS_HIRED : (a.status || STATUSES[0]);
      var since = a.statusUpdated || a.timestamp;
      var waiting = diffDays(since, today);
      return {
        name: a.name, phone: a.phone, zone: a.zone, note: a.note,
        submitted: a.timestamp, status: status, rawStatus: a.rawStatus,
        stage: stageIndex(status), rejected: status === STATUS_REJECTED,
        hiredCode: hired ? hired.code : '', hiredDate: hired ? hired.hireDate : null,
        daysWaiting: waiting,
        nudge: status !== STATUS_HIRED && status !== STATUS_REJECTED && waiting >= cfg.NUDGE_AFTER_DAYS
      };
    })
    .sort(function (a, b) { return b.submitted - a.submitted; });

  // ── Totals ──
  var totals = { bonus: 0, payable: 0, pending: 0, orders: 0, riders: team.length, active: 0, maxed: 0, closed: 0 };
  var nextPayout = null;
  team.forEach(function (t) {
    totals.bonus += t.bonus;
    totals.orders += t.orders;
    if (t.state === 'active' || t.state === 'upcoming') { totals.active++; totals.pending += t.bonus; }
    if (t.state === 'maxed') totals.maxed++;
    if (t.state === 'closed') totals.closed++;
    if (t.state === 'maxed' || t.state === 'closed') totals.payable += t.bonus;
    if (t.bonus > 0 && t.payoutDate >= today && (!nextPayout || t.payoutDate < nextPayout)) nextPayout = t.payoutDate;
  });
  totals.nextPayout = nextPayout;
  totals.applicants = pipeline.length;
  totals.nudges = pipeline.filter(function (p) { return p.nudge; }).length;

  return {
    user: buildProfile(world, user),
    team: team,
    pipeline: pipeline,
    totals: totals,
    season: {
      start: start,
      windowMonths: cfg.BONUS_WINDOW_MONTHS,
      tiers: cfg.TIERS,
      nudgeAfterDays: cfg.NUDGE_AFTER_DAYS
    },
    statuses: STATUSES,
    today: today
  };
}

function buildProfile(world, user) {
  var cfg = world.cfg;
  if (user.type === 'external') {
    return {
      type: 'external', code: user.refId || '', name: user.name, phone: canonicalPhone(user.phone || user.code),
      zone: '', supervisor: '', vehicle: '',
      talabatLink: cfg.TALABAT_REF_BASE + cfg.COMPANY_REF_CODE,
      refParam: user.refId || ''
    };
  }
  var code = cleanCode(user.code);
  var h = world.headcountByCode[code] || {};
  var r = world.ridersByCode[code] || {};
  return {
    type: 'internal', code: code,
    name: r.name || h.name || user.name || '',
    phone: r.phone || h.phone || '',
    zone: r.zone || h.zone || '',
    supervisor: h.supervisor || '',
    vehicle: r.vehicle || h.vehicle || '',
    talabatLink: cfg.TALABAT_REF_BASE + code,
    refParam: code
  };
}

/* ───────────────────────── Applicant sync ─────────────────────────── */

/**
 * Applications whose candidate now appears in the riders tab but whose row
 * doesn't say "اشتغل" yet. Returns [{ row, code, hireDate }] for Sheets.js.
 */
function findNewlyHired(world) {
  var out = [];
  world.applicants.forEach(function (a) {
    var r = a.phone && world.ridersByPhone[a.phone];
    if (!r) return;
    if (a.status === STATUS_HIRED && a.hiredCode === r.code) return;
    out.push({ row: a.row, code: r.code, hireDate: r.hireDate });
  });
  return out;
}

/* ─────────────────────────── Validation ───────────────────────────── */

/**
 * Validates a candidate form. Returns { ok, errors: {field: message}, clean }.
 * world is needed for the "new to Full Speed" rule.
 */
function validateCandidate(form, world) {
  var errors = {};
  var name = cleanText(form.fullName).replace(/\s+/g, ' ');
  var phone = canonicalPhone(form.mobile);
  var nid = parseNationalId(form.nationalId);

  if (name.split(' ').length < 3) errors.fullName = 'اكتب الاسم ثلاثي على الأقل زي البطاقة.';
  if (!phone) errors.mobile = 'رقم موبايل مصري صحيح (11 رقم يبدأ بـ 010 أو 011 أو 012 أو 015).';
  if (!nid) errors.nationalId = 'الرقم القومي غلط — راجع الـ 14 رقم.';
  else {
    var age = ageOn(nid.birthDate, world.today);
    if (age < 18) errors.nationalId = 'السن أقل من 18 سنة حسب الرقم القومي.';
  }
  if (!cleanText(form.address)) errors.address = 'العنوان مطلوب.';
  if (!cleanText(form.zone)) errors.zone = 'اختار منطقة الشغل.';
  var idExp = parseSheetDate(form.idExpiry);
  if (!idExp) errors.idExpiry = 'تاريخ انتهاء البطاقة مطلوب.';
  else if (idExp < world.today) errors.idExpiry = 'البطاقة منتهية.';

  if (!Object.keys(errors).length) {
    var dupes = findDuplicates({ phone: phone, nationalId: nid.id }, identityIndexFor(world));
    if (dupes.length) {
      var d = dupes[0];
      var where = d.source === TABS.APPLICANTS ? 'مترشح قبل كده في البرنامج' : 'مسجل عندنا في Full Speed قبل كده';
      errors[d.field === 'phone' ? 'mobile' : 'nationalId'] =
        (d.field === 'phone' ? 'رقم الموبايل ده ' : 'الرقم القومي ده ') + where + ' — الترشيح لازم يكون لحد جديد.';
    }
  }

  return {
    ok: !Object.keys(errors).length,
    errors: errors,
    clean: {
      name: name, phone: phone, nationalId: nid ? nid.id : '',
      birthDate: nid ? nid.birthDate : null,
      address: cleanText(form.address), zone: cleanText(form.zone),
      licenseExpiry: parseSheetDate(form.licenseExpiry), idExpiry: idExp,
      plate: cleanText(form.plate) || 'عجلة / بدون لوحة'
    }
  };
}

function identityIndexFor(world) {
  if (world._identity) return world._identity;
  var records = [];
  world.headcount.forEach(function (h) { records.push({ source: TABS.HEADCOUNT, phone: h.phone, label: h.code }); });
  world.riders.forEach(function (r) { records.push({ source: TABS.RIDERS, phone: r.phone, label: r.code }); });
  world.applicants.forEach(function (a) { records.push({ source: TABS.APPLICANTS, phone: a.phone, nationalId: a.nationalId, label: a.name }); });
  world._identity = buildIdentityIndex(records);
  return world._identity;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    normalizeArabic: normalizeArabic, headerKey: headerKey, mapHeaders: mapHeaders, rowsToRecords: rowsToRecords,
    cleanCode: cleanCode, safeCell: safeCell, normalizeStatus: normalizeStatus, resolveConfig: resolveConfig,
    buildWorld: buildWorld, ownerKey: ownerKey, riderOwner: riderOwner, buildDashboard: buildDashboard,
    findNewlyHired: findNewlyHired, validateCandidate: validateCandidate
  };
}


// ════════════════════════ Sheets ════════════════════════

/**
 * Full Speed — spreadsheet access, one-time setup and background sync.
 *
 * Reads go through loadWorld_(), which reads each tab once per request.
 * Writes are kept to: FS * tabs, the Daily Orders tab and New Applicants.
 * Headcount and Normal Riders Handle are treated as read-only imports.
 */

var SS_ = null, WORLD_ = null, CFG_ = null;

function ss_() {
  if (!SS_) SS_ = APP.SHEET_ID ? SpreadsheetApp.openById(APP.SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
  return SS_;
}

function tab_(name) {
  return ss_().getSheetByName(name);
}

function values_(name) {
  var sh = tab_(name);
  if (!sh) return [];
  var rows = sh.getLastRow(), cols = sh.getLastColumn();
  return rows && cols ? sh.getRange(1, 1, rows, cols).getValues() : [];
}

function loadConfig_() {
  if (CFG_) return CFG_;
  var cfgRows = values_(TABS.CONFIG).slice(1);
  var tierRows = values_(TABS.TIERS).slice(1);
  CFG_ = resolveConfig(cfgRows, tierRows);
  return CFG_;
}

function loadWorld_() {
  if (WORLD_) return WORLD_;
  var raw = {
    riders: rowsToRecords(values_(TABS.RIDERS), COLUMNS.RIDERS),
    headcount: rowsToRecords(values_(TABS.HEADCOUNT), COLUMNS.HEADCOUNT),
    applicants: rowsToRecords(values_(TABS.APPLICANTS), COLUMNS.APPLICANTS),
    dailyOrders: rowsToRecords(values_(TABS.DAILY_ORDERS), COLUMNS.DAILY_ORDERS)
  };
  WORLD_ = buildWorld(raw, loadConfig_(), new Date());
  return WORLD_;
}

/** Forget cached reads after a write in the same request. */
function invalidate_() {
  WORLD_ = null;
}

function log_(action, details) {
  try {
    var sh = tab_(TABS.LOG);
    if (sh) sh.appendRow([new Date(), action, safeCell(details)]);
  } catch (e) { /* logging must never break a request */ }
}

/* ───────────────────────────── Users ──────────────────────────────── */

var USER_HEADERS_ = ['Type', 'Code', 'Name', 'Phone', 'Ref ID', 'Password Hash', 'Status', 'Created', 'Last Login'];
var SESSION_HEADERS_ = ['Token Hash', 'Code', 'Type', 'Created', 'Expires'];

function readUsers_() {
  return rowsToRecords(values_(TABS.USERS), COLUMNS.USERS).map(function (u) {
    return {
      row: u._row, type: cleanText(u.type), code: cleanCode(u.code), name: cleanText(u.name),
      phone: canonicalPhone(u.phone), refId: cleanText(u.refId), hash: cleanText(u.hash),
      status: cleanText(u.status) || 'active'
    };
  });
}

/** Internal users are keyed by Talabat code, external ones by phone. */
function findUser_(type, code) {
  var key = type === 'external' ? canonicalPhone(code) : cleanCode(code);
  if (!key) return null;
  var users = readUsers_();
  for (var i = 0; i < users.length; i++) {
    var u = users[i];
    if (u.type !== type) continue;
    if ((type === 'external' ? u.phone : u.code) === key) return u;
  }
  return null;
}

function findUserByRefId_(refId) {
  var users = readUsers_();
  for (var i = 0; i < users.length; i++) if (users[i].refId && users[i].refId === refId) return users[i];
  return null;
}

function addUser_(u) {
  var sh = tab_(TABS.USERS);
  sh.appendRow([u.type, "'" + u.code, safeCell(u.name), u.phone ? "'" + u.phone : '', u.refId || '', u.hash, 'active', new Date(), '']);
}

function updateUserCells_(row, fields) {
  var sh = tab_(TABS.USERS);
  if (fields.hash) sh.getRange(row, USER_HEADERS_.indexOf('Password Hash') + 1).setValue(fields.hash);
  if (fields.lastLogin) sh.getRange(row, USER_HEADERS_.indexOf('Last Login') + 1).setValue(fields.lastLogin);
}

function newRefId_() {
  // Short, unguessable, safe to share — keeps partners' phone numbers out of links.
  return 'P' + Utilities.getUuid().replace(/-/g, '').slice(0, 8).toUpperCase();
}

/* ──────────────────────────── Applicants ──────────────────────────── */

/** Appends a candidate, writing each value under its named column. */
function appendApplicant_(clean, owner) {
  var sh = tab_(TABS.APPLICANTS);
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var map = mapHeaders(headers, COLUMNS.APPLICANTS);
  var row = new Array(headers.length);
  for (var i = 0; i < row.length; i++) row[i] = '';

  function put(field, value) { if (map[field] !== -1) row[map[field]] = value; }
  var fmt = function (d) { return d ? Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd') : ''; };

  put('timestamp', new Date());
  put('refCode', "'" + owner.key);
  put('name', safeCell(clean.name));
  put('phone', "'" + clean.phone);
  put('nationalId', "'" + clean.nationalId);
  put('address', safeCell(clean.address));
  put('zone', safeCell(clean.zone));
  put('licenseExpiry', fmt(clean.licenseExpiry) || 'غير مطلوب / عجلة');
  put('idExpiry', fmt(clean.idExpiry));
  put('birthDate', fmt(clean.birthDate));
  put('plate', safeCell(clean.plate));
  put('status', STATUSES[0]);
  put('link', owner.talabatLink);
  put('refType', owner.type === 'external' ? 'شريك خارجي' : 'طيار داخلي');
  put('statusUpdated', new Date());
  sh.appendRow(row);
  invalidate_();
}

/* ─────────────────────────── Background sync ─────────────────────── */

/**
 * Marks candidates as "اشتغل" once their phone shows up in the riders tab,
 * and records their rider code and hire date. Runs hourly (see setup).
 */
function syncApplicants() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return;
  try {
    var world = loadWorld_();
    var hires = findNewlyHired(world);
    if (!hires.length) return;
    var sh = tab_(TABS.APPLICANTS);
    var map = mapHeaders(sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0], COLUMNS.APPLICANTS);
    hires.forEach(function (h) {
      if (map.status !== -1) sh.getRange(h.row, map.status + 1).setValue(STATUS_HIRED);
      if (map.hiredCode !== -1) sh.getRange(h.row, map.hiredCode + 1).setValue("'" + h.code);
      if (map.hiredDate !== -1 && h.hireDate) sh.getRange(h.row, map.hiredDate + 1).setValue(h.hireDate);
      if (map.statusUpdated !== -1) sh.getRange(h.row, map.statusUpdated + 1).setValue(new Date());
    });
    log_('sync', hires.length + ' مرشح اتسجلوا "اشتغل" تلقائياً');
  } finally {
    lock.releaseLock();
  }
}

/** Installable onEdit: stamps the date whenever someone changes a status by hand. */
function onApplicantEdit(e) {
  try {
    var sh = e.range.getSheet();
    if (sh.getName() !== TABS.APPLICANTS || e.range.getRow() < 2) return;
    var map = mapHeaders(sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0], COLUMNS.APPLICANTS);
    if (map.status === -1 || map.statusUpdated === -1) return;
    var c = e.range.getColumn() - 1;
    if (c > map.status || c + e.range.getNumColumns() - 1 < map.status) return;
    sh.getRange(e.range.getRow(), map.statusUpdated + 1, e.range.getNumRows(), 1)
      .setValues(Array.apply(null, Array(e.range.getNumRows())).map(function () { return [new Date()]; }));
  } catch (err) { /* never block an edit */ }
}

/* ───────────────────────────── Setup ──────────────────────────────── */

/**
 * One-click setup. Safe to run again at any time: it only adds what is
 * missing and never deletes data.
 *
 *  1. Creates FS Config, FS Bonus Tiers, Daily Orders, FS Users, FS Sessions, FS Log
 *  2. New Applicants: adds missing columns, phone / national ID as text,
 *     status dropdown, maps old statuses onto the new pipeline
 *  3. Moves accounts from Passwords + External Partners into FS Users
 *  4. Installs the hourly sync, the daily cleanup and the edit stamp
 */
function setupFullSpeed() {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  var report = [];
  try {
    var ss = ss_();
    ss.setSpreadsheetTimeZone('Africa/Cairo');

    ensureTab_(TABS.CONFIG, ['Key', 'Value', 'شرح'], function (sh) {
      var notes = {
        PROGRAM_START_DATE: 'أول يوم تعيين يتحسب في البرنامج',
        BONUS_WINDOW_MONTHS: 'مدة البونص بالشهور من تاريخ التعيين',
        NUDGE_AFTER_DAYS: 'بعد كام يوم من غير تحديث نبّه المرشِّح',
        COMPANY_REF_CODE: 'كود طلبات الموحد اللي بيستخدمه الشركاء الخارجيين',
        TALABAT_REF_BASE: 'أول لينك الإحالة — الكود بيتحط في آخره',
        SESSION_DAYS: 'مدة بقاء المستخدم مسجل دخول',
        MAX_LOGIN_FAILURES: 'عدد المحاولات الغلط قبل قفل الحساب مؤقتاً',
        LOCK_MINUTES: 'مدة القفل بالدقايق',
        PUBLIC_APPLY_PER_HOUR: 'أقصى عدد طلبات من لينك واحد في الساعة',
        MIN_PASSWORD_LENGTH: 'أقل طول لكلمة المرور',
        SUPPORT_WHATSAPP: 'رقم واتساب الدعم (بصيغة دولية)'
      };
      var rows = Object.keys(CONFIG_DEFAULTS).map(function (k) { return [k, CONFIG_DEFAULTS[k], notes[k] || '']; });
      sh.getRange(2, 1, rows.length, 3).setValues(rows);
      sh.getRange('B2:B').setNumberFormat('@');
      report.push('اتعمل تاب ' + TABS.CONFIG);
    });

    ensureTab_(TABS.TIERS, ['عدد الأوردرات', 'قيمة البونص (ج)'], function (sh) {
      var rows = DEFAULT_TIERS.map(function (t) { return [t.orders, t.bonus]; });
      sh.getRange(2, 1, rows.length, 2).setValues(rows);
      report.push('اتعمل تاب ' + TABS.TIERS + ' (' + rows.length + ' شريحة)');
    });

    ensureTab_(TABS.DAILY_ORDERS, ['التاريخ', 'كود المندوب', 'أوردرات مكتملة'], function (sh) {
      sh.getRange('A2:A').setNumberFormat('yyyy-mm-dd');
      sh.getRange('B2:B').setNumberFormat('@');
      sh.getRange('C2:C').setDataValidation(SpreadsheetApp.newDataValidation()
        .requireNumberGreaterThanOrEqualTo(0).setAllowInvalid(false).build());
      report.push('اتعمل تاب ' + TABS.DAILY_ORDERS);
    });

    ensureTab_(TABS.USERS, USER_HEADERS_, function (sh) {
      sh.getRange('B2:B').setNumberFormat('@');
      sh.getRange('D2:D').setNumberFormat('@');
      sh.protect().setDescription('حسابات البرنامج — ماتعدلش بإيدك').setWarningOnly(true);
      report.push('اتعمل تاب ' + TABS.USERS);
    });

    ensureTab_(TABS.SESSIONS, SESSION_HEADERS_, function (sh) {
      sh.protect().setDescription('جلسات الدخول — ماتعدلش بإيدك').setWarningOnly(true);
    });

    ensureTab_(TABS.LOG, ['الوقت', 'العملية', 'تفاصيل'], function () {});

    report = report.concat(upgradeApplicants_());
    report = report.concat(migrateLegacyUsers_());
    report = report.concat(installTriggers_());

    log_('setup', report.join(' | '));
    return report;
  } finally {
    lock.releaseLock();
  }
}

function ensureTab_(name, headers, onCreate) {
  var sh = tab_(name);
  if (sh) return sh;
  sh = ss_().insertSheet(name);
  sh.getRange(1, 1, 1, headers.length).setValues([headers])
    .setFontWeight('bold').setBackground('#0E1812').setFontColor('#5BD06F');
  sh.setFrozenRows(1);
  onCreate(sh);
  return sh;
}

function upgradeApplicants_() {
  var report = [];
  var sh = tab_(TABS.APPLICANTS);
  if (!sh) {
    sh = ss_().insertSheet(TABS.APPLICANTS);
    sh.getRange(1, 1).setValue(COLUMNS.APPLICANTS.timestamp[0]);
  }

  // 1. Missing columns go at the end, so existing formulas keep pointing right.
  var headers = sh.getRange(1, 1, 1, Math.max(1, sh.getLastColumn())).getValues()[0];
  var map = mapHeaders(headers, COLUMNS.APPLICANTS);
  var added = [];
  Object.keys(COLUMNS.APPLICANTS).forEach(function (f) {
    if (map[f] === -1) {
      headers.push(COLUMNS.APPLICANTS[f][0]);
      added.push(COLUMNS.APPLICANTS[f][0]);
    }
  });
  if (added.length) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    report.push('أعمدة جديدة في ' + TABS.APPLICANTS + ': ' + added.join('، '));
  }
  sh.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sh.setFrozenRows(1);
  map = mapHeaders(headers, COLUMNS.APPLICANTS);

  // 2. Phone and national ID stay text, so the leading 0 survives.
  ['phone', 'nationalId', 'refCode', 'hiredCode'].forEach(function (f) {
    sh.getRange(2, map[f] + 1, sh.getMaxRows() - 1, 1).setNumberFormat('@');
  });

  // 3. Old status words → new pipeline, then lock the column to a dropdown.
  var last = sh.getLastRow();
  if (last >= 2) {
    var col = sh.getRange(2, map.status + 1, last - 1, 1);
    var vals = col.getValues(), changed = 0, unknown = {};
    vals.forEach(function (r) {
      var n = normalizeStatus(r[0]);
      if (!n) { unknown[r[0]] = true; return; }
      if (n !== r[0]) { r[0] = n; changed++; }
    });
    if (changed) { col.setValues(vals); report.push('اتظبطت ' + changed + ' حالة قديمة على الحالات الجديدة'); }
    var unk = Object.keys(unknown);
    if (unk.length) report.push('حالات مش معروفة سبتها زي ما هي (راجعها بإيدك): ' + unk.join('، '));
  }
  sh.getRange(2, map.status + 1, sh.getMaxRows() - 1, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).setAllowInvalid(false)
      .setHelpText('اختار الحالة من القائمة').build());

  // 4. Colour the statuses so the team can scan the sheet.
  var range = sh.getRange(2, map.status + 1, sh.getMaxRows() - 1, 1);
  var colours = { 'جديد': '#E7EEE6', 'تم التواصل': '#DCEBFF', 'قيد التعيين': '#FFF2CC', 'تم حضور المحاضرة': '#E8DBFF', 'اشتغل': '#C8F2D2', 'مرفوض': '#FFD6D3' };
  var rules = sh.getConditionalFormatRules().filter(function (r) {
    return !r.getRanges().some(function (rg) { return rg.getColumn() === map.status + 1; });
  });
  Object.keys(colours).forEach(function (s) {
    rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(s).setBackground(colours[s]).setRanges([range]).build());
  });
  sh.setConditionalFormatRules(rules);
  report.push('عمود الحالة بقى قايمة اختيار: ' + STATUSES.join(' ← '));
  return report;
}

/** Copies accounts from the old Passwords / External Partners tabs. Old tabs are left as they are. */
function migrateLegacyUsers_() {
  var existing = readUsers_();
  var have = {};
  existing.forEach(function (u) { have[u.type + ':' + (u.type === 'external' ? u.phone : u.code)] = true; });
  var rows = [], now = new Date();

  function legacyHash(v) {
    var s = cleanText(v);
    if (/^[0-9a-f]{64}$/i.test(s)) return 'sha256$' + s.toLowerCase();
    return s ? hashPassword_(s) : '';   // a password still stored as plain text
  }

  values_(TABS.LEGACY_PASSWORDS).slice(1).forEach(function (r) {
    var code = cleanCode(r[0]), hash = legacyHash(r[1]);
    if (!code || !hash || have['internal:' + code]) return;
    have['internal:' + code] = true;
    rows.push(['internal', "'" + code, '', '', '', hash, 'active', now, '']);
  });

  values_(TABS.LEGACY_PARTNERS).slice(1).forEach(function (r) {
    var phone = canonicalPhone(r[0]), hash = legacyHash(r[2]);
    if (!phone || !hash || have['external:' + phone]) return;
    have['external:' + phone] = true;
    rows.push(['external', "'" + phone, safeCell(r[1]), "'" + phone, newRefId_(), hash, 'active', now, '']);
  });

  if (rows.length) {
    var sh = tab_(TABS.USERS);
    sh.getRange(sh.getLastRow() + 1, 1, rows.length, USER_HEADERS_.length).setValues(rows);
  }
  return rows.length ? ['اتنقل ' + rows.length + ' حساب قديم لتاب ' + TABS.USERS + ' (بنفس كلمات المرور)'] : [];
}

function installTriggers_() {
  var wanted = { syncApplicants: 'hourly', cleanupSessions: 'daily', onApplicantEdit: 'edit' };
  var have = {};
  ScriptApp.getProjectTriggers().forEach(function (t) { have[t.getHandlerFunction()] = true; });
  var added = [];
  Object.keys(wanted).forEach(function (fn) {
    if (have[fn]) return;
    if (wanted[fn] === 'hourly') ScriptApp.newTrigger(fn).timeBased().everyHours(1).create();
    if (wanted[fn] === 'daily') ScriptApp.newTrigger(fn).timeBased().everyDays(1).atHour(4).create();
    if (wanted[fn] === 'edit') ScriptApp.newTrigger(fn).forSpreadsheet(ss_()).onEdit().create();
    added.push(fn);
  });
  return added.length ? ['اتفعّلت المهام التلقائية: ' + added.join('، ')] : [];
}

/** Adds a "Full Speed" menu when the spreadsheet is opened (bound scripts). */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Full Speed')
    .addItem('تجهيز / تحديث الشيت', 'menuSetup_')
    .addItem('مزامنة المرشحين دلوقتي', 'syncApplicants')
    .addToUi();
}

function menuSetup_() {
  var report = setupFullSpeed();
  SpreadsheetApp.getUi().alert('تم التجهيز ✅\n\n' + (report.length ? report.join('\n') : 'كل حاجة متظبطة بالفعل.'));
}


// ════════════════════════ Auth ════════════════════════

/**
 * Full Speed — passwords, sessions and brute-force protection.
 *
 * Passwords: PBKDF2-HMAC-SHA256 with a random salt per user, stored as
 *   pbkdf2$<iterations>$<salt>$<base64>
 * Accounts copied from the old tabs keep their old hash ("sha256$<hex>")
 * until the user's next successful login, when it is upgraded silently.
 *
 * Sessions: the browser keeps a random 64-character token; the sheet only
 * keeps its SHA-256, so someone reading FS Sessions can't sign in as anyone.
 */

var PBKDF2_ITERATIONS = 1000;

function bytes_(s) {
  return Utilities.newBlob(String(s)).getBytes();
}

function sha256Hex_(s) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(s), Utilities.Charset.UTF_8)
    .map(function (b) { return ((b + 256) % 256).toString(16); })
    .map(function (h) { return h.length === 1 ? '0' + h : h; })
    .join('');
}

function pbkdf2_(password, salt, iterations) {
  var key = bytes_(password);
  var u = Utilities.computeHmacSha256Signature(bytes_(salt).concat([0, 0, 0, 1]), key);
  var out = u.slice();
  for (var i = 1; i < iterations; i++) {
    u = Utilities.computeHmacSha256Signature(u, key);
    for (var j = 0; j < out.length; j++) out[j] ^= u[j];
  }
  return Utilities.base64Encode(out);
}

function hashPassword_(password) {
  var salt = Utilities.getUuid().replace(/-/g, '');
  return ['pbkdf2', PBKDF2_ITERATIONS, salt, pbkdf2_(password, salt, PBKDF2_ITERATIONS)].join('$');
}

/** Compares without stopping at the first different character. */
function safeEqual_(a, b) {
  a = String(a); b = String(b);
  var diff = a.length ^ b.length;
  for (var i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

/** { ok, upgrade } — upgrade is a new hash to store when the old format matched. */
function verifyPassword_(password, stored) {
  var parts = String(stored || '').split('$');
  if (parts[0] === 'pbkdf2' && parts.length === 4) {
    return { ok: safeEqual_(pbkdf2_(password, parts[2], parseInt(parts[1], 10)), parts[3]) };
  }
  if (parts[0] === 'sha256' && parts.length === 2) {
    // The old program trimmed passwords before hashing.
    var ok = safeEqual_(sha256Hex_(String(password).trim()), parts[1]);
    return { ok: ok, upgrade: ok ? hashPassword_(password) : null };
  }
  return { ok: false };
}

/* ────────────────────────── Brute force ───────────────────────────── */

function lockKey_(type, code) { return 'lock:' + type + ':' + code; }
function failKey_(type, code) { return 'fail:' + type + ':' + code; }

/** Minutes left on a lock, or 0. */
function lockedFor_(type, code) {
  var until = Number(CacheService.getScriptCache().get(lockKey_(type, code)) || 0);
  return until > Date.now() ? Math.ceil((until - Date.now()) / 60000) : 0;
}

function recordFailure_(type, code, cfg) {
  var cache = CacheService.getScriptCache();
  var n = Number(cache.get(failKey_(type, code)) || 0) + 1;
  if (n >= cfg.MAX_LOGIN_FAILURES) {
    cache.put(lockKey_(type, code), String(Date.now() + cfg.LOCK_MINUTES * 60000), cfg.LOCK_MINUTES * 60);
    cache.remove(failKey_(type, code));
    log_('lock', type + ' ' + code + ' اتقفل ' + cfg.LOCK_MINUTES + ' دقيقة بعد محاولات غلط');
    return 0;
  }
  cache.put(failKey_(type, code), String(n), cfg.LOCK_MINUTES * 60);
  return cfg.MAX_LOGIN_FAILURES - n;
}

function clearFailures_(type, code) {
  CacheService.getScriptCache().remove(failKey_(type, code));
}

/** Simple counter per key per hour (public form spam guard). */
function underRate_(key, perHour) {
  var cache = CacheService.getScriptCache();
  var k = 'rate:' + key + ':' + Math.floor(Date.now() / 3600000);
  var n = Number(cache.get(k) || 0);
  if (n >= perHour) return false;
  cache.put(k, String(n + 1), 3700);
  return true;
}

/* ──────────────────────────── Sessions ────────────────────────────── */

function createSession_(user, cfg) {
  var token = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
  var now = new Date();
  var expires = new Date(now.getTime() + cfg.SESSION_DAYS * 86400000);
  tab_(TABS.SESSIONS).appendRow([sha256Hex_(token), "'" + (user.type === 'external' ? user.phone : user.code), user.type, now, expires]);
  return token;
}

/** { type, code } for a valid token, or null. Cached for 10 minutes. */
function readSession_(token) {
  if (!token || !/^[0-9a-f]{64}$/.test(String(token))) return null;
  var hash = sha256Hex_(token);
  var cache = CacheService.getScriptCache();
  var hit = cache.get('sess:' + hash);
  if (hit) {
    var s = JSON.parse(hit);
    return s.expires > Date.now() ? s : null;
  }
  var rows = rowsToRecords(values_(TABS.SESSIONS), COLUMNS.SESSIONS);
  for (var i = rows.length - 1; i >= 0; i--) {
    if (rows[i].tokenHash !== hash) continue;
    var exp = rows[i].expires instanceof Date ? rows[i].expires.getTime() : 0;
    if (exp <= Date.now()) return null;
    var sess = { type: cleanText(rows[i].type), code: cleanCode(rows[i].code), expires: exp };
    cache.put('sess:' + hash, JSON.stringify(sess), 600);
    return sess;
  }
  return null;
}

function endSession_(token) {
  if (!token) return;
  var hash = sha256Hex_(token);
  CacheService.getScriptCache().remove('sess:' + hash);
  var sh = tab_(TABS.SESSIONS);
  var vals = sh.getDataRange().getValues();
  for (var i = vals.length - 1; i >= 1; i--) {
    if (vals[i][0] === hash) { sh.deleteRow(i + 1); break; }
  }
}

/** Ends every session of one account (after a password change). */
function endAllSessions_(type, code) {
  var sh = tab_(TABS.SESSIONS);
  var vals = sh.getDataRange().getValues();
  var keep = vals.filter(function (r, i) { return i === 0 || !(cleanCode(r[1]) === code && r[2] === type); });
  if (keep.length === vals.length) return;
  sh.getRange(1, 1, vals.length, vals[0].length).clearContent();
  sh.getRange(1, 1, keep.length, keep[0].length).setValues(keep);
}

/** Daily: rewrites FS Sessions without expired rows, in one write. */
function cleanupSessions() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return;
  try {
    var sh = tab_(TABS.SESSIONS);
    if (!sh) return;
    var vals = sh.getDataRange().getValues();
    var now = Date.now();
    var keep = vals.filter(function (r, i) { return i === 0 || (r[4] instanceof Date && r[4].getTime() > now); });
    if (keep.length === vals.length) return;
    sh.getRange(1, 1, vals.length, vals[0].length).clearContent();
    sh.getRange(1, 1, keep.length, keep[0].length).setValues(keep);
    log_('cleanup', (vals.length - keep.length) + ' جلسة منتهية اتمسحت');
  } finally {
    lock.releaseLock();
  }
}


// ════════════════════════ Code ════════════════════════

/**
 * Full Speed Champions — web app entry point and API.
 *
 * The page calls one function, api(action, payload), and always gets back
 * { ok: true, data } or { ok: false, error, fields? } — never an exception.
 */

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Full Speed Champions')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
}

var ACTIONS_ = {
  bootstrap: bootstrap_,
  login: login_,
  activate: activate_,
  session: session_,
  logout: logout_,
  submitCandidate: submitCandidate_,
  publicApply: publicApply_,
  changePassword: changePassword_
};

function api(action, payload) {
  try {
    var fn = ACTIONS_[action];
    if (!fn) return fail_('طلب غير معروف.');
    return toWire_(fn(payload || {}));
  } catch (err) {
    log_('error', action + ': ' + (err && err.stack || err));
    return fail_('حصلت مشكلة في السيرفر. جرّب تاني بعد دقيقة.');
  }
}

function ok_(data) { return { ok: true, data: data }; }
function fail_(error, fields) { return { ok: false, error: error, fields: fields || null }; }

/** google.script.run can't carry Date objects: send them as yyyy-MM-dd. */
function toWire_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  if (Array.isArray(v)) return v.map(toWire_);
  if (v && typeof v === 'object') {
    var o = {};
    Object.keys(v).forEach(function (k) { if (k.charAt(0) !== '_') o[k] = toWire_(v[k]); });
    return o;
  }
  return v;
}

function withLock_(fn) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return fail_('السيستم مشغول ثواني، جرّب تاني.');
  try { return fn(); } finally { lock.releaseLock(); }
}

/* ───────────────────────────── Public ─────────────────────────────── */

/** Zones for the forms, plus who owns a ?ref= link (first name only). */
function bootstrap_(p) {
  var world = loadWorld_();
  var cache = CacheService.getScriptCache();
  var zones = JSON.parse(cache.get('zones:v3') || 'null');
  if (!zones) {
    var set = {};
    world.headcount.concat(world.riders).forEach(function (r) { if (r.zone) set[r.zone] = true; });
    zones = Object.keys(set).sort();
    cache.put('zones:v3', JSON.stringify(zones), 1800);
  }
  var referrer = null;
  if (p.ref) {
    var owner = resolveRef_(String(p.ref));
    referrer = owner ? { valid: true, firstName: String(owner.name || '').split(' ')[0] } : { valid: false };
  }
  return ok_({
    zones: zones,
    referrer: referrer,
    support: loadConfig_().SUPPORT_WHATSAPP,
    appUrl: ScriptApp.getService().getUrl(),
    tiers: loadConfig_().TIERS,
    windowMonths: loadConfig_().BONUS_WINDOW_MONTHS
  });
}

/** A ?ref= value → { type, key, name, talabatLink } or null. */
function resolveRef_(ref) {
  var world = loadWorld_(), cfg = loadConfig_();
  ref = String(ref || '').trim();
  if (/^P[0-9A-F]{8}$/.test(ref)) {
    var u = findUserByRefId_(ref);
    if (!u || u.status === 'blocked') return null;
    return { type: 'external', key: u.phone, name: u.name, talabatLink: cfg.TALABAT_REF_BASE + cfg.COMPANY_REF_CODE };
  }
  var code = cleanCode(ref);
  var who = world.ridersByCode[code] || world.headcountByCode[code];
  if (!who) return null;
  return { type: 'internal', key: code, name: who.name, talabatLink: cfg.TALABAT_REF_BASE + code };
}

/** Internal rider: is this Talabat code ours, and what phone do we have for it? */
function lookupRider_(code) {
  var world = loadWorld_();
  var r = world.ridersByCode[code], h = world.headcountByCode[code];
  if (!r && !h) return null;
  return { name: (r && r.name) || (h && h.name) || '', phones: [r && r.phone, h && h.phone].filter(Boolean) };
}

function login_(p) {
  var cfg = loadConfig_();
  var type = p.type === 'external' ? 'external' : 'internal';
  var code = type === 'external' ? canonicalPhone(p.code) : cleanCode(p.code);
  if (!code || !p.password) return fail_('اكتب ' + (type === 'external' ? 'رقم الموبايل' : 'الكود') + ' وكلمة المرور.');

  var wait = lockedFor_(type, code);
  if (wait) return fail_('محاولات كتير غلط. الحساب مقفول ' + wait + ' دقيقة.');

  var user = findUser_(type, code);
  if (!user) {
    return fail_(type === 'external'
      ? 'الرقم ده مش متسجل كشريك. اعمل حساب جديد الأول.'
      : 'الكود ده لسه ما اتفعّلش. اضغط "أول مرة؟ فعّل حسابك".');
  }
  if (user.status === 'blocked') return fail_('الحساب ده موقوف من الإدارة.');

  var check = verifyPassword_(String(p.password), user.hash);
  if (!check.ok) {
    var left = recordFailure_(type, code, cfg);
    return fail_(left ? 'كلمة المرور غلط. باقي ' + left + ' محاولات.' : 'محاولات كتير غلط. الحساب اتقفل ' + cfg.LOCK_MINUTES + ' دقيقة.');
  }
  clearFailures_(type, code);

  return withLock_(function () {
    updateUserCells_(user.row, { hash: check.upgrade || null, lastLogin: new Date() });
    var token = createSession_(user, cfg);
    return ok_({ token: token, dashboard: dashboardFor_(user) });
  });
}

/**
 * First-time activation.
 *  internal — the Talabat code must exist AND the phone must match our records,
 *             so nobody can claim someone else's code.
 *  external — any valid Egyptian mobile that isn't registered yet.
 */
function activate_(p) {
  var cfg = loadConfig_();
  var type = p.type === 'external' ? 'external' : 'internal';
  var password = String(p.password || '');
  var phone = canonicalPhone(p.phone);
  var fields = {};

  if (password.length < cfg.MIN_PASSWORD_LENGTH) fields.password = 'كلمة المرور ' + cfg.MIN_PASSWORD_LENGTH + ' حروف أو أرقام على الأقل.';
  if (/^(\d)\1+$/.test(password) || /^(123456|1234567|12345678|654321|password)$/i.test(password)) fields.password = 'كلمة المرور سهلة أوي، اختار حاجة أصعب.';
  if (!phone) fields.phone = 'رقم موبايل مصري صحيح (11 رقم).';

  if (type === 'internal') {
    var code = cleanCode(p.code);
    if (!/^\d{5,9}$/.test(code)) fields.code = 'اكتب كود طلبات بتاعك (أرقام بس).';
    if (Object.keys(fields).length) return fail_('راجع البيانات.', fields);

    var wait = lockedFor_('activate', code);
    if (wait) return fail_('محاولات كتير. جرّب بعد ' + wait + ' دقيقة.');

    var rider = lookupRider_(code);
    if (!rider) return fail_('الكود ده مش موجود في سجلات Full Speed.', { code: 'الكود مش موجود.' });
    if (!rider.phones.length) return fail_('مافيش رقم موبايل متسجل للكود ده. كلّم المشرف بتاعك يضيفه.');
    if (rider.phones.indexOf(phone) === -1) {
      recordFailure_('activate', code, cfg);
      return fail_('رقم الموبايل مش مطابق للرقم المتسجل على الكود ده عندنا.', { phone: 'مش مطابق لسجلاتنا.' });
    }
    return withLock_(function () {
      if (findUser_('internal', code)) return fail_('الكود ده متفعّل بالفعل. ادخل بكلمة المرور، ولو نسيتها كلّم الإدارة.');
      var user = { type: 'internal', code: code, name: rider.name, phone: phone, hash: hashPassword_(password) };
      addUser_(user);
      log_('activate', 'internal ' + code);
      return ok_({ token: createSession_(user, cfg), dashboard: dashboardFor_(user) });
    });
  }

  var name = cleanText(p.name).replace(/\s+/g, ' ');
  if (name.split(' ').length < 2) fields.name = 'اكتب اسمك ثنائي على الأقل.';
  if (Object.keys(fields).length) return fail_('راجع البيانات.', fields);
  return withLock_(function () {
    if (findUser_('external', phone)) return fail_('الرقم ده متسجل بالفعل. ادخل بكلمة المرور.', { phone: 'متسجل بالفعل.' });
    var user = { type: 'external', code: phone, name: name, phone: phone, refId: newRefId_(), hash: hashPassword_(password) };
    addUser_(user);
    log_('activate', 'external ' + phone.slice(0, 4) + '…' + phone.slice(-3));
    return ok_({ token: createSession_(user, cfg), dashboard: dashboardFor_(user) });
  });
}

/* ──────────────────────────── Signed in ───────────────────────────── */

function currentUser_(token) {
  var s = readSession_(token);
  if (!s) return null;
  var u = findUser_(s.type, s.code);
  return u && u.status !== 'blocked' ? u : null;
}

function dashboardFor_(user) {
  invalidate_();
  return buildDashboard(loadWorld_(), user);
}

function session_(p) {
  var user = currentUser_(p.token);
  if (!user) return fail_('SESSION_EXPIRED');
  return ok_({ dashboard: dashboardFor_(user) });
}

function logout_(p) {
  return withLock_(function () { endSession_(p.token); return ok_({}); });
}

function changePassword_(p) {
  var cfg = loadConfig_();
  var user = currentUser_(p.token);
  if (!user) return fail_('SESSION_EXPIRED');
  if (!verifyPassword_(String(p.current || ''), user.hash).ok) return fail_('كلمة المرور الحالية غلط.', { current: 'غلط.' });
  var next = String(p.next || '');
  if (next.length < cfg.MIN_PASSWORD_LENGTH) return fail_('كلمة المرور الجديدة قصيرة.', { next: 'على الأقل ' + cfg.MIN_PASSWORD_LENGTH + '.' });
  return withLock_(function () {
    updateUserCells_(user.row, { hash: hashPassword_(next) });
    var key = user.type === 'external' ? user.phone : user.code;
    endAllSessions_(user.type, key);
    return ok_({ token: createSession_(user, cfg) });
  });
}

function ownerFor_(user) {
  var cfg = loadConfig_();
  if (user.type === 'external') return { type: 'external', key: user.phone, talabatLink: cfg.TALABAT_REF_BASE + cfg.COMPANY_REF_CODE };
  return { type: 'internal', key: user.code, talabatLink: cfg.TALABAT_REF_BASE + user.code };
}

function submitCandidate_(p) {
  var user = currentUser_(p.token);
  if (!user) return fail_('SESSION_EXPIRED');
  return saveCandidate_(p.form || {}, ownerFor_(user), function () { return { dashboard: dashboardFor_(user) }; });
}

/** The ?ref= form a candidate fills in by themselves. */
function publicApply_(p) {
  var cfg = loadConfig_();
  var owner = resolveRef_(p.ref);
  if (!owner) return fail_('لينك الترشيح ده مش صحيح. اطلب اللينك تاني من اللي رشّحك.');
  if (!underRate_('apply:' + owner.key, cfg.PUBLIC_APPLY_PER_HOUR) || !underRate_('apply:all', cfg.PUBLIC_APPLY_PER_HOUR * 10)) {
    return fail_('في طلبات كتير من اللينك ده دلوقتي. جرّب بعد ساعة.');
  }
  return saveCandidate_(p.form || {}, owner, function () { return { referrer: String(owner.name || '').split(' ')[0] }; });
}

function saveCandidate_(form, owner, after) {
  return withLock_(function () {
    invalidate_();
    var check = validateCandidate(form, loadWorld_());
    if (!check.ok) return fail_(check.errors[Object.keys(check.errors)[0]], check.errors);
    appendApplicant_(check.clean, owner);
    log_('candidate', owner.type + ' ' + String(owner.key).slice(-4));
    var data = after();
    data.message = 'تم تسجيل ' + check.clean.name.split(' ')[0] + ' ✅ هنكلمه قريب.';
    return ok_(data);
  });
}
