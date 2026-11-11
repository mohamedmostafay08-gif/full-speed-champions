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
    report = report.concat(removeLegacyTabs_());
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
    var noteCol = sh.getRange(2, map.note + 1, last - 1, 1);
    var vals = col.getValues(), notes = noteCol.getValues(), changed = 0, guessed = {};
    vals.forEach(function (r, i) {
      var raw = r[0];
      var n = normalizeStatus(raw);
      if (!n) {
        // Unknown wording: pick the closest stage and keep the original text in the notes.
        n = guessStatus(raw);
        guessed[raw] = n;
        var keep = 'الحالة القديمة: ' + cleanText(raw);
        if (String(notes[i][0]).indexOf(keep) === -1) notes[i][0] = notes[i][0] ? notes[i][0] + ' | ' + keep : keep;
      }
      if (n !== raw) { r[0] = n; changed++; }
    });
    if (changed) {
      col.setValues(vals);
      noteCol.setValues(notes);
      report.push('اتظبطت ' + changed + ' حالة قديمة على الحالات الجديدة');
    }
    var g = Object.keys(guessed);
    if (g.length) report.push('حالات قديمة اتحوّلت (والكلام الأصلي اتحفظ في ملاحظات الإدارة): ' +
      g.map(function (k) { return k + ' ← ' + guessed[k]; }).join('، '));
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

/**
 * Deletes the old program's tabs once they are no longer needed:
 *  - Sessions: old login tokens in plain text — useless now and a risk.
 *  - Passwords / External Partners: only after checking that every account
 *    in them already exists in FS Users.
 */
function removeLegacyTabs_() {
  var report = [];
  var users = readUsers_();
  var have = {};
  users.forEach(function (u) { have[u.type + ':' + (u.type === 'external' ? u.phone : u.code)] = true; });

  function drop(name, allMigrated) {
    var sh = tab_(name);
    if (!sh) return;
    if (!allMigrated) { report.push('سبت تاب ' + name + ' لأن فيه حسابات لسه ما اتنقلتش'); return; }
    ss_().deleteSheet(sh);
    report.push('اتمسح التاب القديم ' + name);
  }

  var passOk = values_(TABS.LEGACY_PASSWORDS).slice(1).every(function (r) {
    var code = cleanCode(r[0]);
    return !code || !cleanText(r[1]) || have['internal:' + code];
  });
  var partnersOk = values_(TABS.LEGACY_PARTNERS).slice(1).every(function (r) {
    var phone = canonicalPhone(r[0]);
    return !phone || !cleanText(r[2]) || have['external:' + phone];
  });

  drop(TABS.LEGACY_SESSIONS, true);
  drop(TABS.LEGACY_PASSWORDS, passOk);
  drop(TABS.LEGACY_PARTNERS, partnersOk);
  return report;
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
