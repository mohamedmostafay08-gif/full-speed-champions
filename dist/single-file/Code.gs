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
  SUPPORT_WHATSAPP: '201120339097',
  PUBLIC_APP_URL: 'https://mohamedmostafay08-gif.github.io/full-speed-champions/',  // the installable app (GitHub Pages)
  // Where the Google link reads its interface from. Empty = use the Index.html saved in Apps Script.
  ANNOUNCEMENT: '',                   // banner shown to every rider in the app (empty = none)
  REPORT_EMAILS: '',                  // comma-separated: who gets the daily report email
  UI_SOURCE_URL: 'https://raw.githubusercontent.com/mohamedmostafay08-gif/full-speed-champions/main/dist/single-file/Index.html'
};

/** Tab names. Existing tabs keep their current names. */
var TABS = {
  HIRING: 'Hiring tracker',           // daily raw export of hires: official hire date, SV, SP status
  RIDERS: 'Normal Riders Handle',     // Talabat export: the referral code of each hire
  HEADCOUNT: 'Headcount',             // IMPORTRANGE — read only, never written
  APPLICANTS: 'New Applicants',       // candidates submitted through the program
  DAILY_ORDERS: 'Daily Orders',       // date | rider code | completed orders
  USERS: 'FS Users',
  SESSIONS: 'FS Sessions',
  CONFIG: 'FS Config',
  TIERS: 'FS Bonus Tiers',
  LOG: 'FS Log',
  ADMINS: 'FS Admins',                // the operations team (admin dashboard accounts)
  PAYOUTS: 'FS Payouts',              // one row per bonus paid
  AUDIT: 'FS Audit',                  // who changed what, from the admin dashboard
  CAMPAIGNS: 'FS Campaigns',          // extra-bonus campaigns
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
  HIRING: {
    hireDate: ['Dates', 'Date', 'Hire Date', 'تاريخ التعيين'],
    code: ['Rider ID', 'Code', 'Rider Code', 'كود المندوب'],
    zone: ['Zones', 'Zone', 'المنطقة'],
    name: ['Rider Name', 'Name', 'الاسم'],
    phone: ['Phone Number', 'Phone', 'الموبايل'],
    status: ['Status', 'الحالة'],
    sv: ['SV', 'SPV', 'Supervisor'],
    sp: ['Has SP', 'SP Status', 'SP'],
    vehicle: ['Vehicle', 'المركبة']
  },
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
  ADMINS: {
    username: ['Username'], name: ['Name'], role: ['Role'], hash: ['Password Hash'],
    status: ['Status'], mustChange: ['Must Change Password'], created: ['Created'], lastLogin: ['Last Login']
  },
  PAYOUTS: {
    id: ['Payout ID'], riderCode: ['Rider Code'], riderName: ['Rider Name'], ownerKey: ['Referrer'],
    ownerName: ['Referrer Name'], amount: ['Amount'], method: ['Method'], reference: ['Reference'],
    note: ['Note'], paidBy: ['Paid By'], paidAt: ['Paid At']
  },
  CAMPAIGNS: {
    id: ['Campaign ID'], name: ['Name'], start: ['Start'], end: ['End'], zone: ['Zone'], extra: ['Extra Bonus'], active: ['Active']
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

/**
 * Admin roles. Each permission lists the roles allowed to do it; every
 * role can read the dashboard.
 */
var ROLES = {
  owner: 'مدير',
  recruiter: 'فريق التعيينات',
  finance: 'الحسابات',
  viewer: 'مشاهد'
};
var PERMISSIONS = {
  'applicants.edit': ['owner', 'recruiter'],
  'users.edit': ['owner', 'recruiter'],
  'payouts.edit': ['owner', 'finance'],
  'campaigns.edit': ['owner'],
  'settings.edit': ['owner'],
  'team.edit': ['owner']
};
var PAYOUT_METHODS = ['كاش', 'فودافون كاش', 'إنستاباي', 'تحويل بنكي', 'مع المرتب', 'أخرى'];

/** Values found in the old sheet, mapped onto the new pipeline. */
var LEGACY_STATUS_MAP = {
  'ارفع استمارة': 'جديد',            // candidate just recruited, form not processed yet
  'ارفع استعلام': 'جديد',            // same stage, spelling found in the live sheet
  'تم التعيين': 'اشتغل',
  'شغال': 'اشتغل',
  'استلم ونزل': 'اشتغل',
  'معلق': 'مرفوض'
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    APP: APP, CONFIG_DEFAULTS: CONFIG_DEFAULTS, TABS: TABS, COLUMNS: COLUMNS,
    STATUSES: STATUSES, ROLES: ROLES, PERMISSIONS: PERMISSIONS, PAYOUT_METHODS: PAYOUT_METHODS, STATUS_HIRED: STATUS_HIRED, STATUS_REJECTED: STATUS_REJECTED,
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

/**
 * Closest stage for wording that isn't in the list (typed by hand in the
 * old sheet). Order matters: "شغال مع ال 4pl" is about another company,
 * not about working with us.
 */
function guessStatus(raw) {
  var k = headerKey(raw);
  if (!k) return STATUSES[0];
  if (/[34]pl|شركه(تانيه|اخري)|مكان(تاني|اخر)/.test(k)) return STATUS_REJECTED;
  if (/رفض|مرفوض|معلق|ملغي|الغاء|مش(عايز|مهتم)/.test(k)) return STATUS_REJECTED;
  if (/محاضر/.test(k)) return 'تم حضور المحاضرة';
  if (/تعيين|تعين/.test(k)) return 'قيد التعيين';
  if (/تواصل|كلمناه|اتكلم/.test(k)) return 'تم التواصل';
  if (/شغال|اشتغل|استلم|نزل/.test(k)) return STATUS_HIRED;
  return STATUSES[0];   // استعلام / استمارة / anything else → still at the start
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

  // Hires come from two tabs:
  //  - Hiring tracker: the official hire date, SV and SP status (daily raw export)
  //  - Normal Riders Handle: Talabat's referral code (and a hand-typed order total)
  // A rider in either tab is a hire. When both have a date, Hiring tracker wins.
  var byCode = {}, order = [];
  function rider(code) {
    if (!byCode[code]) { byCode[code] = { code: code, name: '', zone: '', phone: null, vehicle: '', hireDate: null, orders: null, referralCode: '', sv: '', sp: null, status: '', inTracker: false }; order.push(code); }
    return byCode[code];
  }
  (raw.hiring || []).forEach(function (h) {
    var code = cleanCode(h.code); if (!code) return;
    var r = rider(code);
    r.inTracker = true;
    r.row = h._row;
    r.hireDate = parseSheetDate(h.hireDate, opts) || r.hireDate;
    r.name = cleanText(h.name) || r.name;
    r.zone = cleanText(h.zone) || r.zone;
    r.phone = canonicalPhone(h.phone) || r.phone;
    r.vehicle = cleanText(h.vehicle) || r.vehicle;
    r.sv = cleanText(h.sv) || r.sv;
    r.status = cleanText(h.status);
    var sp = headerKey(h.sp);
    r.sp = sp ? (/^with/.test(sp) || sp === 'yes' ? true : /^no/.test(sp) ? false : null) : null;
  });
  (raw.riders || []).forEach(function (n) {
    var code = cleanCode(n.code); if (!code) return;
    var r = rider(code);
    if (!r.inTracker) { r.row = n._row; r.hireDate = parseSheetDate(n.hireDate, opts); }
    r.name = r.name || cleanText(n.name);
    r.zone = r.zone || cleanText(n.zone);
    r.phone = r.phone || canonicalPhone(n.phone);
    r.vehicle = r.vehicle || cleanText(n.vehicle);
    r.orders = cleanText(n.orders) === '' ? null : Number(n.orders) || 0;
    r.referralCode = cleanCode(n.referralCode);
  });
  var riders = order.map(function (c) { return byCode[c]; });

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
      status: normalizeStatus(a.status) || guessStatus(a.status),
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
  riders.forEach(function (r) { if (!r.sv && headcountByCode[r.code]) r.sv = headcountByCode[r.code].supervisor; });

  // Earliest application per phone decides who referred that person.
  var appsByPhone = {};
  applicants.slice().sort(function (a, b) { return (a.timestamp || 0) - (b.timestamp || 0); })
    .forEach(function (a) { if (a.phone && !appsByPhone[a.phone]) appsByPhone[a.phone] = a; });

  var campaigns = (raw.campaigns || []).map(function (c) {
    return {
      id: cleanText(c.id), name: cleanText(c.name), zone: cleanText(c.zone),
      start: parseSheetDate(c.start, opts), end: parseSheetDate(c.end, opts),
      extra: Math.max(0, parseInt(String(c.extra).replace(/[^\d]/g, ''), 10) || 0),
      active: !/^(لا|no|false|0|off)$/i.test(cleanText(c.active))
    };
  }).filter(function (c) { return c.name && c.start && c.end && c.extra > 0; });

  var payoutsByCode = {};
  (raw.payouts || []).forEach(function (p) {
    var code = cleanCode(p.riderCode);
    if (!code) return;
    (payoutsByCode[code] = payoutsByCode[code] || []).push({
      id: cleanText(p.id), amount: Number(String(p.amount).replace(/[^\d.]/g, '')) || 0,
      method: cleanText(p.method), reference: cleanText(p.reference), note: cleanText(p.note),
      paidBy: cleanText(p.paidBy), paidAt: parseSheetDate(p.paidAt, opts), row: p._row
    });
  });

  return {
    cfg: cfg, today: dateOnly(today),
    riders: riders, headcount: headcount, applicants: applicants, dailyOrders: dailyOrders,
    ridersByPhone: ridersByPhone, ridersByCode: ridersByCode, headcountByCode: headcountByCode,
    appsByPhone: appsByPhone, campaigns: campaigns, payoutsByCode: payoutsByCode
  };
}

/** The supervisor of an internal referrer (Headcount SPV, else the Hiring tracker SV). External partners have none. */
function svOf(key, world) {
  if (!key || canonicalPhone(key)) return '';
  var h = world.headcountByCode[key], r = world.ridersByCode[key];
  return (h && h.supervisor) || (r && r.sv) || '';
}

/** Extra bonus from active campaigns: hire date inside the campaign, zone matches (or campaign is for all zones). */
function campaignExtra(rider, world) {
  var extra = 0, names = [];
  (world.campaigns || []).forEach(function (c) {
    if (!c.active || !rider.hireDate || rider.hireDate < c.start || rider.hireDate > c.end) return;
    if (c.zone && headerKey(c.zone) !== headerKey(rider.zone)) return;
    extra += c.extra; names.push(c.name);
  });
  return { extra: extra, names: names };
}

/**
 * One hired rider, fully evaluated: bonus (tiers + campaigns), window,
 * and payout state. Used by both the rider app and the admin dashboard.
 *
 * payStatus: 'paid' | 'due' (window over or max reached, not paid yet) | 'pending' | 'none' (no bonus earned)
 */
function evaluateRider(r, world) {
  var cfg = world.cfg;
  var ev = evaluateReferral({
    hireDate: r.hireDate,
    dailyOrders: world.dailyOrders[r.code] || [],
    totalOrders: r.orders,
    today: world.today,
    tiers: cfg.TIERS,
    windowMonths: cfg.BONUS_WINDOW_MONTHS
  });
  var camp = ev.bonus > 0 ? campaignExtra(r, world) : { extra: 0, names: [] };
  var payouts = (world.payoutsByCode && world.payoutsByCode[r.code]) || [];
  var paid = payouts.reduce(function (s, p) { return s + p.amount; }, 0);
  var total = ev.bonus + camp.extra;
  var finished = ev.state === 'maxed' || ev.state === 'closed';
  var payStatus = paid > 0 && paid >= total ? 'paid' : total <= 0 ? (finished ? 'none' : 'pending') : finished ? 'due' : 'pending';
  return {
    code: r.code, name: r.name, zone: r.zone, phone: r.phone, vehicle: r.vehicle,
    hireDate: ev.hireDate, lastDay: ev.lastDay, payoutDate: ev.payoutDate,
    orders: ev.orders, tierBonus: ev.bonus, extra: camp.extra, campaigns: camp.names, bonus: total,
    state: ev.state, daysLeft: ev.daysLeft, ordersToNext: ev.ordersToNext, progress: ev.progress,
    nextBonus: ev.nextTier ? ev.nextTier.bonus + camp.extra : null, nextOrders: ev.nextTier ? ev.nextTier.orders : null,
    ordersSource: ev.ordersSource,
    paid: paid, payStatus: payStatus, payouts: payouts
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
  return app && appliedBeforeHire(app, rider) ? appOwnerKey(app.refCode) : '';
}

/**
 * An application only counts for a hire that came after it (a day of slack
 * for same-day paperwork). Someone hired before they were "referred" was
 * already ours — no referral, no bonus.
 */
function appliedBeforeHire(app, rider) {
  return !app.timestamp || !rider.hireDate || app.timestamp <= addDays(rider.hireDate, 1);
}

/** The rider a candidate became, if their phone was hired after the application. */
function hiredFrom(app, world) {
  var r = app.phone && world.ridersByPhone[app.phone];
  return r && appliedBeforeHire(app, r) ? r : null;
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
      var e = evaluateRider(r, world);
      delete e.payouts;
      return e;
    })
    .sort(function (a, b) {
      var rank = { active: 0, upcoming: 1, maxed: 2, closed: 3 };
      return (rank[a.state] - rank[b.state]) || (a.daysLeft - b.daysLeft) || (b.hireDate - a.hireDate);
    });

  // ── Pipeline: applications submitted for this user ──
  var pipeline = world.applicants
    .filter(function (a) { return appOwnerKey(a.refCode) === key && a.timestamp && a.timestamp >= start; })
    .map(function (a) {
      var hired = hiredFrom(a, world);
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
  var totals = { bonus: 0, payable: 0, pending: 0, paid: 0, orders: 0, riders: team.length, active: 0, maxed: 0, closed: 0 };
  var nextPayout = null;
  team.forEach(function (t) {
    totals.bonus += t.bonus;
    totals.orders += t.orders;
    if (t.state === 'active' || t.state === 'upcoming') { totals.active++; totals.pending += t.bonus; }
    if (t.state === 'maxed') totals.maxed++;
    if (t.state === 'closed') totals.closed++;
    if (t.payStatus === 'due') totals.payable += t.bonus - t.paid;
    totals.paid += t.paid;
    if (t.bonus > 0 && t.payStatus !== 'paid' && t.payoutDate >= today && (!nextPayout || t.payoutDate < nextPayout)) nextPayout = t.payoutDate;
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
    announcement: cleanText(cfg.ANNOUNCEMENT),
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
    supervisor: h.supervisor || r.sv || '',
    vehicle: r.vehicle || h.vehicle || '',
    talabatLink: cfg.TALABAT_REF_BASE + code,
    refParam: code
  };
}

/* ─────────────────────────── Admin data ───────────────────────────── */

var FLAG_LABELS = {
  self: 'رشّح نفسه',
  burst: 'ترشيحات كتير في يوم واحد',
  dupe: 'نفس الرقم أو الرقم القومي متكرر',
  known: 'كان متعيّن عندنا قبل ما يترشح',
  suspended: 'موقوف (No SP)',
  quiet: 'اتعين ومش بيشتغل'
};

/**
 * Everything the admin dashboard needs, as flat lists. Analytics are
 * computed in the browser from these, so date filters are instant.
 *
 * users: rows from FS Users (readUsers_ shape).
 */
function buildAdminData(world, users) {
  var cfg = world.cfg, today = world.today;

  // ── Who is who: registered users, plus Talabat referrers who never signed up ──
  var people = {};
  (users || []).forEach(function (u) {
    var key = u.type === 'external' ? u.phone : u.code;
    if (!key) return;
    people[key] = {
      key: key, type: u.type, code: u.code, name: u.name, phone: u.phone, refId: u.refId || '',
      status: u.status || 'active', registered: true, created: u.created || null, lastLogin: u.lastLogin || null,
      applicants: 0, hires: 0, active: 0, bonus: 0, paid: 0, due: 0, orders: 0
    };
  });
  function person(key) {
    if (!key) return null;
    if (!people[key]) {
      var r = world.ridersByCode[key] || world.headcountByCode[key] || {};
      var phone = canonicalPhone(key);
      people[key] = {
        key: key, type: phone ? 'external' : 'internal', code: phone ? '' : key, name: r.name || '', phone: phone || r.phone || '',
        refId: '', status: 'active', registered: false, created: null, lastLogin: null,
        applicants: 0, hires: 0, active: 0, bonus: 0, paid: 0, due: 0, orders: 0
      };
    }
    var p = people[key];
    if (!p.name) { var rr = world.ridersByCode[key] || world.headcountByCode[key]; if (rr) p.name = rr.name; }
    if (!p.phone && !canonicalPhone(key)) { var hh = world.headcountByCode[key] || world.ridersByCode[key]; if (hh) p.phone = hh.phone; }
    return p;
  }

  // ── Hired riders since the program start ──
  var riders = world.riders.filter(function (r) { return r.hireDate && r.hireDate >= cfg.PROGRAM_START_DATE; }).map(function (r) {
    var owner = riderOwner(r, world);
    if (owner === r.code) owner = '';
    var e = evaluateRider(r, world);
    var p = person(owner);
    var app = r.phone && world.appsByPhone[r.phone];
    e.ownerKey = owner;
    e.ownerName = p ? p.name : '';
    e.sv = r.sv || '';
    e.sp = r.sp;
    e.trackerStatus = r.status || '';
    e.inTracker = !!r.inTracker;
    e.ownerSv = svOf(owner, world);
    e.ownerType = p ? p.type : '';
    e.source = !owner ? 'none' : (r.referralCode && r.referralCode !== cfg.COMPANY_REF_CODE ? 'talabat' : 'app');
    e.appliedOn = app ? app.timestamp : null;
    e.daysToHire = app && app.timestamp ? Math.max(0, diffDays(app.timestamp, r.hireDate)) : null;
    if (!owner) { e.bonus = 0; e.payStatus = 'none'; }
    e.flags = [];
    if (e.state === 'active' && diffDays(r.hireDate, today) >= 14 && e.orders === 0) e.flags.push('quiet');
    if (owner && r.sp === false) e.flags.push('suspended');
    if (p) {
      p.hires++; p.orders += e.orders; p.bonus += e.bonus; p.paid += e.paid;
      if (e.state === 'active' || e.state === 'upcoming') p.active++;
      if (e.payStatus === 'due') p.due += e.bonus - e.paid;
    }
    return e;
  });

  // ── Applications ──
  var byNid = {}, byPhone = {}, perRefDay = {};
  world.applicants.forEach(function (a) {
    if (a.nationalId) byNid[a.nationalId] = (byNid[a.nationalId] || 0) + 1;
    if (a.phone) byPhone[a.phone] = (byPhone[a.phone] || 0) + 1;
    var k = appOwnerKey(a.refCode) + '|' + (a.timestamp ? a.timestamp.getTime() : '');
    perRefDay[k] = (perRefDay[k] || 0) + 1;
  });

  var applicants = world.applicants.map(function (a) {
    var key = appOwnerKey(a.refCode);
    var p = person(key);
    var hired = hiredFrom(a, world);
    var status = hired ? STATUS_HIRED : (a.status || STATUSES[0]);
    var since = a.statusUpdated || a.timestamp;
    var waiting = since ? diffDays(since, today) : 0;
    var flags = [];
    if (p && a.phone && p.phone === a.phone) flags.push('self');
    if ((perRefDay[key + '|' + (a.timestamp ? a.timestamp.getTime() : '')] || 0) >= 5) flags.push('burst');
    if ((a.nationalId && byNid[a.nationalId] > 1) || (a.phone && byPhone[a.phone] > 1)) flags.push('dupe');
    var before = a.phone && world.ridersByPhone[a.phone];
    if (before && !hired) flags.push('known');
    if (p) p.applicants++;
    return {
      row: a.row, submitted: a.timestamp, refKey: key, refName: p ? p.name : '', refType: p ? p.type : '', refSv: svOf(key, world),
      name: a.name, phone: a.phone, nationalId: a.nationalId, zone: a.zone,
      status: status, sheetStatus: a.rawStatus, note: a.note, statusUpdated: a.statusUpdated,
      daysWaiting: waiting, stage: stageIndex(status),
      hiredCode: hired ? hired.code : '', hiredDate: hired ? hired.hireDate : null,
      nudge: status !== STATUS_HIRED && status !== STATUS_REJECTED && waiting >= cfg.NUDGE_AFTER_DAYS,
      flags: flags
    };
  });

  var payouts = [];
  Object.keys(world.payoutsByCode || {}).forEach(function (code) {
    world.payoutsByCode[code].forEach(function (p) {
      var r = world.ridersByCode[code] || {};
      payouts.push({ id: p.id, riderCode: code, riderName: r.name || '', amount: p.amount, method: p.method,
        reference: p.reference, note: p.note, paidBy: p.paidBy, paidAt: p.paidAt });
    });
  });
  payouts.sort(function (a, b) { return (b.paidAt || 0) - (a.paidAt || 0); });

  return {
    today: today,
    season: { start: cfg.PROGRAM_START_DATE, windowMonths: cfg.BONUS_WINDOW_MONTHS, tiers: cfg.TIERS, nudgeAfterDays: cfg.NUDGE_AFTER_DAYS },
    statuses: STATUSES,
    flagLabels: FLAG_LABELS,
    applicants: applicants,
    riders: riders,
    users: Object.keys(people).map(function (k) { return people[k]; }),
    payouts: payouts,
    campaigns: world.campaigns || [],
    svs: Object.keys(world.riders.reduce(function (m, r) { if (r.sv) m[r.sv] = 1; return m; }, world.headcount.reduce(function (m, h) { if (h.supervisor) m[h.supervisor] = 1; return m; }, {}))).sort(),
    zones: Object.keys(world.riders.concat(world.headcount).reduce(function (m, r) { if (r.zone) m[r.zone] = 1; return m; }, {})).sort()
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
    var r = hiredFrom(a, world);
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
  world.riders.forEach(function (r) { records.push({ source: TABS.RIDERS, phone: r.phone, label: r.code }); });
  world.applicants.forEach(function (a) { records.push({ source: TABS.APPLICANTS, phone: a.phone, nationalId: a.nationalId, label: a.name }); });
  world._identity = buildIdentityIndex(records);
  return world._identity;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    normalizeArabic: normalizeArabic, headerKey: headerKey, mapHeaders: mapHeaders, rowsToRecords: rowsToRecords,
    cleanCode: cleanCode, safeCell: safeCell, normalizeStatus: normalizeStatus, guessStatus: guessStatus, resolveConfig: resolveConfig,
    buildWorld: buildWorld, ownerKey: ownerKey, riderOwner: riderOwner, buildDashboard: buildDashboard,
    findNewlyHired: findNewlyHired, buildAdminData: buildAdminData, evaluateRider: evaluateRider, campaignExtra: campaignExtra, validateCandidate: validateCandidate
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
    hiring: rowsToRecords(values_(TABS.HIRING), COLUMNS.HIRING),
    riders: rowsToRecords(values_(TABS.RIDERS), COLUMNS.RIDERS),
    headcount: rowsToRecords(values_(TABS.HEADCOUNT), COLUMNS.HEADCOUNT),
    applicants: rowsToRecords(values_(TABS.APPLICANTS), COLUMNS.APPLICANTS),
    dailyOrders: rowsToRecords(values_(TABS.DAILY_ORDERS), COLUMNS.DAILY_ORDERS),
    campaigns: rowsToRecords(values_(TABS.CAMPAIGNS), COLUMNS.CAMPAIGNS),
    payouts: rowsToRecords(values_(TABS.PAYOUTS), COLUMNS.PAYOUTS)
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
      status: cleanText(u.status) || 'active',
      created: u.created instanceof Date ? u.created : null, lastLogin: u.lastLogin instanceof Date ? u.lastLogin : null
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
        SUPPORT_WHATSAPP: 'رقم واتساب الدعم (بصيغة دولية)',
        PUBLIC_APP_URL: 'لينك التطبيق على GitHub Pages — ده اللي بيتبعت للمرشحين'
      };
      var rows = Object.keys(CONFIG_DEFAULTS).map(function (k) { return [k, CONFIG_DEFAULTS[k], notes[k] || '']; });
      sh.getRange(2, 1, rows.length, 3).setValues(rows);
      sh.getRange('B2:B').setNumberFormat('@');
      report.push('اتعمل تاب ' + TABS.CONFIG);
    });

    var cfgSheet = tab_(TABS.CONFIG);
    var haveKeys = cfgSheet.getRange(1, 1, Math.max(1, cfgSheet.getLastRow()), 1).getValues().map(function (r) { return cleanText(r[0]); });
    var missing = Object.keys(CONFIG_DEFAULTS).filter(function (k) { return haveKeys.indexOf(k) === -1; });
    if (missing.length) {
      cfgSheet.getRange(cfgSheet.getLastRow() + 1, 1, missing.length, 3)
        .setValues(missing.map(function (k) { return [k, CONFIG_DEFAULTS[k], k === 'PUBLIC_APP_URL' ? 'لينك التطبيق على GitHub Pages — ده اللي بيتبعت للمرشحين' : k === 'UI_SOURCE_URL' ? 'لينك Google بياخد الواجهة من هنا (GitHub). فاضي = النسخة اللي في Apps Script' : '']; }));
      report.push('إعدادات جديدة اتضافت لـ ' + TABS.CONFIG + ': ' + missing.join('، '));
    }

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
    report = report.concat(setupAdminTabs_());

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
  var wanted = { syncApplicants: 'hourly', cleanupSessions: 'daily', onApplicantEdit: 'edit', dailyReport: 'morning' };
  var have = {};
  ScriptApp.getProjectTriggers().forEach(function (t) { have[t.getHandlerFunction()] = true; });
  var added = [];
  Object.keys(wanted).forEach(function (fn) {
    if (have[fn]) return;
    if (wanted[fn] === 'hourly') ScriptApp.newTrigger(fn).timeBased().everyHours(1).create();
    if (wanted[fn] === 'daily') ScriptApp.newTrigger(fn).timeBased().everyDays(1).atHour(4).create();
    if (wanted[fn] === 'morning') ScriptApp.newTrigger(fn).timeBased().everyDays(1).atHour(9).create();
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
  return HtmlService.createHtmlOutput(pageHtml_())
    .setTitle('Full Speed Champions')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
}

/**
 * The interface is read from GitHub (UI_SOURCE_URL in FS Config), so a push
 * to the repo updates the Google link too — no pasting. Cached 10 minutes.
 * If GitHub can't be reached, or the file looks wrong, the Index.html saved
 * in this project is used instead, so the app never goes down.
 */
var UI_MARKER_ = 'Full Speed Champions';

function pageHtml_() {
  var url = '';
  try { url = String(loadConfig_().UI_SOURCE_URL || '').trim(); } catch (e) { /* config unreadable → local file */ }
  if (url) {
    var cache = CacheService.getScriptCache();
    var parts = cache.getAll(['ui:0', 'ui:1', 'ui:2', 'ui:3']);
    var cached = ['ui:0', 'ui:1', 'ui:2', 'ui:3'].map(function (k) { return parts[k] || ''; }).join('');
    if (cached.indexOf(UI_MARKER_) !== -1) return cached;
    try {
      var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
      var html = res.getResponseCode() === 200 ? res.getContentText('UTF-8') : '';
      if (html.indexOf(UI_MARKER_) !== -1 && html.indexOf('google.script') !== -1) {
        // CacheService holds at most 100 KB per key: store the page in chunks.
        var size = 90000, chunks = {};
        for (var i = 0; i * size < html.length && i < 4; i++) chunks['ui:' + i] = html.slice(i * size, (i + 1) * size);
        if (html.length <= size * 4) cache.putAll(chunks, 600);
        return html;
      }
    } catch (e) { /* GitHub unreachable → local file */ }
  }
  return HtmlService.createHtmlOutputFromFile('Index').getContent();
}

/**
 * The installable app on GitHub Pages talks to the same api() through here:
 * POST { action, payload } as plain text → JSON back.
 */
function doPost(e) {
  var out;
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    out = api(String(body.action || ''), body.payload || {});
  } catch (err) {
    out = fail_('طلب غير صالح.');
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
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
    var fn = ACTIONS_[action] || (typeof ADMIN_ACTIONS_ !== 'undefined' && ADMIN_ACTIONS_[action]);
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
    appUrl: loadConfig_().PUBLIC_APP_URL || ScriptApp.getService().getUrl(),
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


// ════════════════════════ Admin ════════════════════════

/**
 * Full Speed — admin dashboard API.
 *
 * Team members sign in with a username (FS Admins tab). Every change made
 * from the dashboard is checked against the member's role (PERMISSIONS in
 * Config.js) and written to FS Audit with the before/after values.
 */

var ADMIN_HEADERS_ = ['Username', 'Name', 'Role', 'Password Hash', 'Status', 'Must Change Password', 'Created', 'Last Login'];
var PAYOUT_HEADERS_ = ['Payout ID', 'Rider Code', 'Rider Name', 'Referrer', 'Referrer Name', 'Amount', 'Method', 'Reference', 'Note', 'Paid By', 'Paid At'];
var AUDIT_HEADERS_ = ['الوقت', 'المسؤول', 'العملية', 'على', 'قبل', 'بعد'];
var CAMPAIGN_HEADERS_ = ['Campaign ID', 'Name', 'Start', 'End', 'Zone', 'Extra Bonus', 'Active'];

var ADMIN_ACTIONS_ = {
  adminLogin: adminLogin_,
  adminSession: adminSession_,
  adminLogout: adminLogout_,
  adminChangePassword: adminChangePassword_,
  adminData: adminData_,
  adminUpdateApplicants: adminUpdateApplicants_,
  adminEditApplicant: adminEditApplicant_,
  adminRecordPayout: adminRecordPayout_,
  adminDeletePayout: adminDeletePayout_,
  adminUserAction: adminUserAction_,
  adminSaveSettings: adminSaveSettings_,
  adminSaveAnnouncement: adminSaveAnnouncement_,
  adminSaveCampaign: adminSaveCampaign_,
  adminDeleteCampaign: adminDeleteCampaign_,
  adminTeam: adminTeam_
};

/* ───────────────────────────── Setup ──────────────────────────────── */

/** Creates the admin tabs, and the first owner account if there is none. */
function setupAdminTabs_() {
  var report = [];
  ensureTab_(TABS.ADMINS, ADMIN_HEADERS_, function (sh) {
    sh.protect().setDescription('حسابات فريق الإدارة — ماتعدلش بإيدك').setWarningOnly(true);
  });
  ensureTab_(TABS.PAYOUTS, PAYOUT_HEADERS_, function (sh) {
    sh.getRange('B2:B').setNumberFormat('@');
    sh.getRange('D2:D').setNumberFormat('@');
    sh.protect().setDescription('سجل صرف البونص — بيتعدل من لوحة الإدارة').setWarningOnly(true);
  });
  ensureTab_(TABS.AUDIT, AUDIT_HEADERS_, function (sh) {
    sh.protect().setDescription('سجل التعديلات — ماينفعش يتعدل').setWarningOnly(true);
  });
  ensureTab_(TABS.CAMPAIGNS, CAMPAIGN_HEADERS_, function (sh) {
    sh.getRange('C2:D').setNumberFormat('yyyy-mm-dd');
  });
  if (!readAdmins_().length) {
    var temp = tempPassword_();
    tab_(TABS.ADMINS).appendRow(['owner', 'المدير', 'owner', hashPassword_(temp), 'active', 'yes', new Date(), '']);
    report.push('اتعمل حساب المدير: اسم المستخدم owner — كلمة السر المؤقتة ' + temp + ' (هتتغير أول ما تدخل)');
  }
  return report;
}

/* ──────────────────────────── Accounts ────────────────────────────── */

function readAdmins_() {
  return rowsToRecords(values_(TABS.ADMINS), COLUMNS.ADMINS).map(function (a) {
    return {
      row: a._row, username: cleanText(a.username).toLowerCase(), name: cleanText(a.name), role: cleanText(a.role) || 'viewer',
      hash: cleanText(a.hash), status: cleanText(a.status) || 'active', mustChange: /^(yes|true|1)$/i.test(cleanText(a.mustChange)),
      created: a.created instanceof Date ? a.created : null, lastLogin: a.lastLogin instanceof Date ? a.lastLogin : null
    };
  }).filter(function (a) { return a.username; });
}

function findAdmin_(username) {
  var u = String(username || '').trim().toLowerCase();
  return readAdmins_().filter(function (a) { return a.username === u; })[0] || null;
}

function setAdminCells_(row, fields) {
  var sh = tab_(TABS.ADMINS);
  Object.keys(fields).forEach(function (k) {
    var col = ADMIN_HEADERS_.indexOf(k);
    if (col !== -1) sh.getRange(row, col + 1).setValue(fields[k]);
  });
}

/** 8 characters, easy to read out over the phone, never trivial. */
function tempPassword_() {
  var letters = 'abcdefghjkmnpqrstuvwxyz', out = '';
  var raw = Utilities.getUuid().replace(/-/g, '');
  for (var i = 0; i < 3; i++) out += letters.charAt(parseInt(raw.substr(i * 2, 2), 16) % letters.length);
  return out + (10000 + parseInt(raw.substr(8, 6), 16) % 90000);
}

function can_(admin, perm) {
  return admin.role === 'owner' || (PERMISSIONS[perm] || []).indexOf(admin.role) !== -1;
}

function currentAdmin_(token) {
  var s = readSession_(token);
  if (!s || s.type !== 'admin') return null;
  var a = findAdmin_(s.code);
  return a && a.status === 'active' ? a : null;
}

/** Runs fn(admin) if the token is valid and the role allows perm. */
function asAdmin_(p, perm, fn) {
  var admin = currentAdmin_(p.token);
  if (!admin) return fail_('SESSION_EXPIRED');
  if (perm && !can_(admin, perm)) return fail_('صلاحياتك مش بتسمح بالعملية دي. كلّم المدير.');
  return fn(admin);
}

function meOf_(a) {
  var perms = {};
  Object.keys(PERMISSIONS).forEach(function (k) { perms[k] = can_(a, k); });
  return { username: a.username, name: a.name, role: a.role, roleLabel: ROLES[a.role] || a.role, mustChange: a.mustChange, can: perms };
}

function audit_(admin, action, target, before, after) {
  try {
    var sh = tab_(TABS.AUDIT);
    if (!sh) return;
    var fmt = function (v) { return v === undefined || v === null ? '' : safeCell(typeof v === 'object' ? JSON.stringify(v) : String(v)); };
    sh.appendRow([new Date(), admin.name + ' (' + admin.username + ')', action, fmt(target), fmt(before), fmt(after)]);
  } catch (e) { /* never block the change itself */ }
}

/* ───────────────────────────── Session ────────────────────────────── */

function adminLogin_(p) {
  var cfg = loadConfig_();
  var username = String(p.username || '').trim().toLowerCase();
  if (!username || !p.password) return fail_('اكتب اسم المستخدم وكلمة المرور.');
  var wait = lockedFor_('admin', username);
  if (wait) return fail_('محاولات كتير غلط. الحساب مقفول ' + wait + ' دقيقة.');
  var a = findAdmin_(username);
  if (!a || a.status !== 'active') { recordFailure_('admin', username, cfg); return fail_('اسم المستخدم أو كلمة المرور غلط.'); }
  var check = verifyPassword_(String(p.password), a.hash);
  if (!check.ok) {
    var left = recordFailure_('admin', username, cfg);
    return fail_(left ? 'اسم المستخدم أو كلمة المرور غلط. باقي ' + left + ' محاولات.' : 'محاولات كتير غلط. الحساب اتقفل ' + cfg.LOCK_MINUTES + ' دقيقة.');
  }
  clearFailures_('admin', username);
  return withLock_(function () {
    setAdminCells_(a.row, { 'Last Login': new Date() });
    var token = createSession_({ type: 'admin', code: a.username }, cfg);
    audit_(a, 'دخول', '', '', '');
    return ok_({ token: token, me: meOf_(a) });
  });
}

function adminSession_(p) {
  return asAdmin_(p, null, function (a) { return ok_({ me: meOf_(a) }); });
}

function adminLogout_(p) {
  return withLock_(function () { endSession_(p.token); return ok_({}); });
}

function adminChangePassword_(p) {
  var cfg = loadConfig_();
  return asAdmin_(p, null, function (a) {
    if (!verifyPassword_(String(p.current || ''), a.hash).ok) return fail_('كلمة المرور الحالية غلط.', { current: 'غلط.' });
    var next = String(p.next || '');
    if (next.length < 8) return fail_('كلمة مرور الإدارة لازم 8 حروف أو أرقام على الأقل.', { next: 'على الأقل 8.' });
    return withLock_(function () {
      setAdminCells_(a.row, { 'Password Hash': hashPassword_(next), 'Must Change Password': '' });
      endAllSessions_('admin', a.username);
      audit_(a, 'غيّر كلمة المرور', a.username, '', '');
      a.mustChange = false;
      return ok_({ token: createSession_({ type: 'admin', code: a.username }, cfg), me: meOf_(a) });
    });
  });
}

/* ────────────────────────────── Data ──────────────────────────────── */

function adminData_(p) {
  return asAdmin_(p, null, function (a) {
    invalidate_();
    var world = loadWorld_();
    var data = buildAdminData(world, readUsers_());
    var cfg = loadConfig_();
    data.me = meOf_(a);
    data.roles = ROLES;
    data.payoutMethods = PAYOUT_METHODS;
    data.config = {};
    Object.keys(CONFIG_DEFAULTS).forEach(function (k) {
      var v = cfg[k];
      data.config[k] = v instanceof Date ? Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd') : v;
    });
    data.audit = values_(TABS.AUDIT).slice(1).slice(-400).reverse().map(function (r) {
      return { at: r[0] instanceof Date ? r[0].toISOString() : String(r[0]), by: r[1], action: r[2], target: r[3], before: r[4], after: r[5] };
    });
    if (a.role === 'owner') {
      data.team = readAdmins_().map(function (x) {
        return { username: x.username, name: x.name, role: x.role, status: x.status, lastLogin: x.lastLogin, mustChange: x.mustChange };
      });
    }
    return ok_(data);
  });
}

/* ─────────────────────────── Applicants ───────────────────────────── */

function applicantSheet_() {
  var sh = tab_(TABS.APPLICANTS);
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  return { sh: sh, map: mapHeaders(headers, COLUMNS.APPLICANTS) };
}

/**
 * Status and/or note for one or many applications.
 * items: [{ row, phone }] — the phone guards against rows that moved since the page loaded.
 */
function adminUpdateApplicants_(p) {
  return asAdmin_(p, 'applicants.edit', function (a) {
    var items = (p.items || []).slice(0, 500);
    if (!items.length) return fail_('اختار مرشح واحد على الأقل.');
    if (p.status !== undefined && STATUSES.indexOf(p.status) === -1) return fail_('الحالة دي مش في القايمة.');
    if (p.status === STATUS_REJECTED && !cleanText(p.note)) return fail_('اكتب سبب الرفض عشان يظهر للي رشّح.', { note: 'السبب مطلوب.' });
    return withLock_(function () {
      var t = applicantSheet_(), done = 0, skipped = 0;
      items.forEach(function (it) {
        var row = parseInt(it.row, 10);
        if (!(row >= 2) || row > t.sh.getLastRow()) { skipped++; return; }
        var current = t.sh.getRange(row, 1, 1, t.sh.getLastColumn()).getValues()[0];
        if (it.phone && canonicalPhone(current[t.map.phone]) !== canonicalPhone(it.phone)) { skipped++; return; }
        var name = cleanText(current[t.map.name]);
        if (p.status !== undefined && t.map.status !== -1 && current[t.map.status] !== p.status) {
          audit_(a, 'غيّر الحالة', name, current[t.map.status], p.status);
          t.sh.getRange(row, t.map.status + 1).setValue(p.status);
          if (t.map.statusUpdated !== -1) t.sh.getRange(row, t.map.statusUpdated + 1).setValue(new Date());
        }
        if (p.note !== undefined && t.map.note !== -1 && cleanText(current[t.map.note]) !== cleanText(p.note)) {
          audit_(a, 'ملاحظة للمرشِّح', name, current[t.map.note], p.note);
          t.sh.getRange(row, t.map.note + 1).setValue(safeCell(p.note));
        }
        done++;
      });
      invalidate_();
      return ok_({ done: done, skipped: skipped });
    });
  });
}

function adminEditApplicant_(p) {
  return asAdmin_(p, 'applicants.edit', function (a) {
    var f = p.fields || {}, errors = {};
    if (f.phone !== undefined && !canonicalPhone(f.phone)) errors.phone = 'رقم موبايل غير صحيح.';
    if (f.nationalId !== undefined && !parseNationalId(f.nationalId)) errors.nationalId = 'رقم قومي غير صحيح.';
    if (f.name !== undefined && cleanText(f.name).split(/\s+/).length < 3) errors.name = 'الاسم ثلاثي على الأقل.';
    if (Object.keys(errors).length) return fail_(errors[Object.keys(errors)[0]], errors);
    return withLock_(function () {
      var t = applicantSheet_(), row = parseInt(p.row, 10);
      if (!(row >= 2) || row > t.sh.getLastRow()) return fail_('المرشح ده مش موجود. حدّث الصفحة.');
      var current = t.sh.getRange(row, 1, 1, t.sh.getLastColumn()).getValues()[0];
      if (p.phone && canonicalPhone(current[t.map.phone]) !== canonicalPhone(p.phone)) return fail_('الشيت اتغير من ساعة ما فتحت. حدّث الصفحة.');
      var write = {
        name: f.name !== undefined ? safeCell(cleanText(f.name)) : undefined,
        phone: f.phone !== undefined ? "'" + canonicalPhone(f.phone) : undefined,
        nationalId: f.nationalId !== undefined ? "'" + parseNationalId(f.nationalId).id : undefined,
        zone: f.zone !== undefined ? safeCell(f.zone) : undefined,
        address: f.address !== undefined ? safeCell(f.address) : undefined
      };
      Object.keys(write).forEach(function (k) {
        if (write[k] === undefined || t.map[k] === -1) return;
        var before = current[t.map[k]], after = String(write[k]).replace(/^'/, '');
        if (String(before) === after) return;
        audit_(a, 'عدّل بيانات مرشح (' + k + ')', cleanText(current[t.map.name]), before, after);
        t.sh.getRange(row, t.map[k] + 1).setValue(write[k]);
      });
      invalidate_();
      return ok_({});
    });
  });
}

/* ──────────────────────────── Payouts ─────────────────────────────── */

function adminRecordPayout_(p) {
  return asAdmin_(p, 'payouts.edit', function (a) {
    var amount = Math.round(Number(p.amount) || 0);
    if (amount <= 0) return fail_('اكتب المبلغ.', { amount: 'المبلغ مطلوب.' });
    if (PAYOUT_METHODS.indexOf(p.method) === -1) return fail_('اختار طريقة الصرف.', { method: 'مطلوب.' });
    return withLock_(function () {
      invalidate_();
      var world = loadWorld_();
      var code = cleanCode(p.code);
      var r = world.ridersByCode[code];
      if (!r) return fail_('الطيار ده مش موجود.');
      var owner = riderOwner(r, world);
      if (!owner || owner === code) return fail_('الطيار ده مش متسجل على حد، مالوش بونص ترشيح.');
      var ev = evaluateRider(r, world);
      if (ev.paid + amount > ev.bonus && !(p.allowOver && a.role === 'owner')) {
        return fail_('المبلغ أكبر من المستحق. المستحق ' + ev.bonus + ' ج واتصرف قبل كده ' + ev.paid + ' ج.', { amount: 'أكبر من المستحق.' });
      }
      var data = buildAdminData(world, readUsers_());
      var ownerRow = data.users.filter(function (u) { return u.key === owner; })[0] || {};
      var id = 'PO-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyMMdd') + '-' + Utilities.getUuid().slice(0, 4).toUpperCase();
      tab_(TABS.PAYOUTS).appendRow([id, "'" + code, safeCell(r.name), "'" + owner, safeCell(ownerRow.name || ''), amount, p.method,
        safeCell(p.reference || ''), safeCell(p.note || ''), a.name, new Date()]);
      audit_(a, 'سجّل صرف بونص', r.name + ' #' + code, '', amount + ' ج — ' + p.method);
      invalidate_();
      return ok_({ id: id });
    });
  });
}

function adminDeletePayout_(p) {
  return asAdmin_(p, 'payouts.edit', function (a) {
    return withLock_(function () {
      var sh = tab_(TABS.PAYOUTS), vals = sh.getDataRange().getValues();
      for (var i = vals.length - 1; i >= 1; i--) {
        if (String(vals[i][0]) === String(p.id)) {
          audit_(a, 'لغى صرف بونص', vals[i][2] + ' #' + vals[i][1], vals[i][5] + ' ج — ' + vals[i][6], '');
          sh.deleteRow(i + 1);
          invalidate_();
          return ok_({});
        }
      }
      return fail_('العملية دي مش موجودة.');
    });
  });
}

/* ───────────────────────────── Users ──────────────────────────────── */

function adminUserAction_(p) {
  return asAdmin_(p, 'users.edit', function (a) {
    var type = p.type === 'external' ? 'external' : 'internal';
    var u = findUser_(type, p.key);
    if (!u) return fail_('الشخص ده لسه ما فعّلش حسابه في البرنامج.');
    var label = (u.name || u.code) + ' (' + (type === 'external' ? u.phone : u.code) + ')';
    var key = type === 'external' ? u.phone : u.code;
    var sh = tab_(TABS.USERS);
    var col = function (h) { return USER_HEADERS_.indexOf(h) + 1; };
    return withLock_(function () {
      switch (p.action) {
        case 'reset':
          var temp = tempPassword_();
          sh.getRange(u.row, col('Password Hash')).setValue(hashPassword_(temp));
          endAllSessions_(type, key);
          audit_(a, 'عمل كلمة سر مؤقتة', label, '', '');
          return ok_({ temp: temp, phone: u.phone });
        case 'block':
          sh.getRange(u.row, col('Status')).setValue('blocked');
          endAllSessions_(type, key);
          audit_(a, 'أوقف حساب', label, 'active', 'blocked');
          return ok_({});
        case 'unblock':
          sh.getRange(u.row, col('Status')).setValue('active');
          audit_(a, 'فعّل حساب', label, 'blocked', 'active');
          return ok_({});
        case 'logout':
          endAllSessions_(type, key);
          audit_(a, 'خرّج حساب من كل الأجهزة', label, '', '');
          return ok_({});
        case 'phone':
          if (type !== 'internal') return fail_('رقم الشريك هو اسم الدخول بتاعه، مينفعش يتغير. اعمله حساب جديد.');
          var phone = canonicalPhone(p.phone);
          if (!phone) return fail_('رقم موبايل غير صحيح.', { phone: 'غير صحيح.' });
          sh.getRange(u.row, col('Phone')).setValue("'" + phone);
          audit_(a, 'غيّر رقم موبايل', label, u.phone, phone);
          return ok_({});
      }
      return fail_('عملية غير معروفة.');
    });
  });
}

/* ──────────────────────── Settings & campaigns ────────────────────── */

function setConfig_(key, value) {
  var sh = tab_(TABS.CONFIG), vals = sh.getDataRange().getValues();
  for (var i = 1; i < vals.length; i++) {
    if (cleanText(vals[i][0]) === key) { sh.getRange(i + 1, 2).setValue(value); return vals[i][1]; }
  }
  sh.appendRow([key, value, '']);
  return '';
}

var EDITABLE_SETTINGS_ = ['PROGRAM_START_DATE', 'BONUS_WINDOW_MONTHS', 'NUDGE_AFTER_DAYS', 'COMPANY_REF_CODE', 'SESSION_DAYS',
  'MAX_LOGIN_FAILURES', 'LOCK_MINUTES', 'PUBLIC_APPLY_PER_HOUR', 'MIN_PASSWORD_LENGTH', 'SUPPORT_WHATSAPP', 'REPORT_EMAILS', 'PUBLIC_APP_URL'];

function adminSaveSettings_(p) {
  return asAdmin_(p, 'settings.edit', function (a) {
    var cfg = p.config || {}, errors = {};
    if (cfg.PROGRAM_START_DATE !== undefined && !parseSheetDate(cfg.PROGRAM_START_DATE)) errors.PROGRAM_START_DATE = 'تاريخ غير صحيح.';
    ['BONUS_WINDOW_MONTHS', 'NUDGE_AFTER_DAYS', 'SESSION_DAYS', 'MAX_LOGIN_FAILURES', 'LOCK_MINUTES', 'PUBLIC_APPLY_PER_HOUR', 'MIN_PASSWORD_LENGTH'].forEach(function (k) {
      if (cfg[k] !== undefined && !(parseInt(cfg[k], 10) > 0)) errors[k] = 'رقم أكبر من صفر.';
    });
    var tiers = p.tiers ? p.tiers.map(function (t) { return { orders: parseInt(t.orders, 10), bonus: parseInt(t.bonus, 10) }; }) : null;
    if (tiers && (!tiers.length || tiers.some(function (t) { return !(t.orders > 0 && t.bonus > 0); }))) errors.tiers = 'كل شريحة محتاجة عدد أوردرات ومبلغ.';
    if (Object.keys(errors).length) return fail_(errors[Object.keys(errors)[0]], errors);
    return withLock_(function () {
      Object.keys(cfg).forEach(function (k) {
        if (EDITABLE_SETTINGS_.indexOf(k) === -1) return;
        var before = setConfig_(k, String(cfg[k]).trim());
        if (String(before) !== String(cfg[k]).trim()) audit_(a, 'غيّر إعداد', k, before, cfg[k]);
      });
      if (tiers) {
        tiers.sort(function (x, y) { return x.orders - y.orders; });
        var sh = tab_(TABS.TIERS), before = values_(TABS.TIERS).slice(1).map(function (r) { return r[0] + '→' + r[1]; }).join('، ');
        if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, 2).clearContent();
        sh.getRange(2, 1, tiers.length, 2).setValues(tiers.map(function (t) { return [t.orders, t.bonus]; }));
        audit_(a, 'غيّر شرايح البونص', '', before, tiers.map(function (t) { return t.orders + '→' + t.bonus; }).join('، '));
      }
      CFG_ = null; invalidate_();
      return ok_({});
    });
  });
}

function adminSaveAnnouncement_(p) {
  return asAdmin_(p, 'campaigns.edit', function (a) {
    return withLock_(function () {
      var text = cleanText(p.text).slice(0, 200);
      var before = setConfig_('ANNOUNCEMENT', text);
      audit_(a, text ? 'نشر إعلان للطيارين' : 'شال الإعلان', '', before, text);
      CFG_ = null;
      return ok_({});
    });
  });
}

function adminSaveCampaign_(p) {
  return asAdmin_(p, 'campaigns.edit', function (a) {
    var c = p.campaign || {}, errors = {};
    var start = parseSheetDate(c.start), end = parseSheetDate(c.end);
    if (!cleanText(c.name)) errors.name = 'اسم الحملة مطلوب.';
    if (!start) errors.start = 'تاريخ البداية مطلوب.';
    if (!end || (start && end < start)) errors.end = 'تاريخ النهاية لازم يكون بعد البداية.';
    if (!(parseInt(c.extra, 10) > 0)) errors.extra = 'المبلغ الإضافي مطلوب.';
    if (Object.keys(errors).length) return fail_(errors[Object.keys(errors)[0]], errors);
    return withLock_(function () {
      var sh = tab_(TABS.CAMPAIGNS), vals = sh.getDataRange().getValues();
      var row = [c.id || ('C-' + Utilities.getUuid().slice(0, 6).toUpperCase()), safeCell(c.name), start, end, safeCell(c.zone || ''), parseInt(c.extra, 10), c.active === false ? 'لا' : 'نعم'];
      for (var i = 1; i < vals.length; i++) {
        if (c.id && String(vals[i][0]) === String(c.id)) {
          sh.getRange(i + 1, 1, 1, row.length).setValues([row]);
          audit_(a, 'عدّل حملة', c.name, vals[i].slice(1, 7).join(' | '), row.slice(1).join(' | '));
          invalidate_();
          return ok_({ id: row[0] });
        }
      }
      sh.appendRow(row);
      audit_(a, 'عمل حملة', c.name, '', row.slice(1).join(' | '));
      invalidate_();
      return ok_({ id: row[0] });
    });
  });
}

function adminDeleteCampaign_(p) {
  return asAdmin_(p, 'campaigns.edit', function (a) {
    return withLock_(function () {
      var sh = tab_(TABS.CAMPAIGNS), vals = sh.getDataRange().getValues();
      for (var i = vals.length - 1; i >= 1; i--) {
        if (String(vals[i][0]) === String(p.id)) {
          audit_(a, 'مسح حملة', vals[i][1], vals[i].slice(1, 7).join(' | '), '');
          sh.deleteRow(i + 1);
          invalidate_();
          return ok_({});
        }
      }
      return fail_('الحملة دي مش موجودة.');
    });
  });
}

/* ────────────────────────────── Team ──────────────────────────────── */

function adminTeam_(p) {
  return asAdmin_(p, 'team.edit', function (a) {
    var username = String(p.username || '').trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,30}$/.test(username)) return fail_('اسم المستخدم: حروف إنجليزي صغيرة أو أرقام، من 3 لـ 30.', { username: 'غير صحيح.' });
    if (p.role !== undefined && !ROLES[p.role]) return fail_('اختار الدور.', { role: 'مطلوب.' });
    return withLock_(function () {
      var existing = findAdmin_(username);
      if (p.action === 'add') {
        if (existing) return fail_('اسم المستخدم ده موجود بالفعل.', { username: 'موجود.' });
        if (!cleanText(p.name)) return fail_('اكتب الاسم.', { name: 'مطلوب.' });
        var temp = tempPassword_();
        tab_(TABS.ADMINS).appendRow([username, safeCell(p.name), p.role || 'viewer', hashPassword_(temp), 'active', 'yes', new Date(), '']);
        audit_(a, 'ضاف عضو للفريق', username, '', ROLES[p.role || 'viewer']);
        return ok_({ temp: temp });
      }
      if (!existing) return fail_('العضو ده مش موجود.');
      if (existing.username === a.username && p.action !== 'reset') return fail_('مينفعش تغيّر دورك أو توقف حسابك بنفسك.');
      if (p.action === 'role') {
        setAdminCells_(existing.row, { Role: p.role });
        audit_(a, 'غيّر دور', username, ROLES[existing.role], ROLES[p.role]);
        return ok_({});
      }
      if (p.action === 'disable' || p.action === 'enable') {
        setAdminCells_(existing.row, { Status: p.action === 'disable' ? 'disabled' : 'active' });
        if (p.action === 'disable') endAllSessions_('admin', username);
        audit_(a, p.action === 'disable' ? 'أوقف عضو' : 'فعّل عضو', username, existing.status, p.action === 'disable' ? 'disabled' : 'active');
        return ok_({});
      }
      if (p.action === 'reset') {
        var t2 = tempPassword_();
        setAdminCells_(existing.row, { 'Password Hash': hashPassword_(t2), 'Must Change Password': 'yes' });
        endAllSessions_('admin', username);
        audit_(a, 'عمل كلمة سر مؤقتة لعضو', username, '', '');
        return ok_({ temp: t2 });
      }
      return fail_('عملية غير معروفة.');
    });
  });
}

/* ────────────────────────── Daily report ──────────────────────────── */

/** Morning email with yesterday's numbers to the addresses in REPORT_EMAILS. */
function dailyReport() {
  var cfg = loadConfig_();
  var to = String(cfg.REPORT_EMAILS || '').split(/[,\s]+/).filter(function (e) { return /@/.test(e); });
  if (!to.length) return;
  var data = buildAdminData(loadWorld_(), readUsers_());
  var yesterday = addDays(data.today, -1);
  var same = function (d) { return d && diffDays(d, yesterday) === 0; };
  var newApps = data.applicants.filter(function (x) { return same(x.submitted); }).length;
  var hires = data.riders.filter(function (r) { return same(r.hireDate) && r.ownerKey; }).length;
  var due = data.riders.filter(function (r) { return r.payStatus === 'due'; });
  var dueSum = due.reduce(function (s, r) { return s + r.bonus - r.paid; }, 0);
  var stuck = data.applicants.filter(function (x) { return x.nudge; }).length;
  var flagged = data.applicants.filter(function (x) { return x.flags.length; }).length + data.riders.filter(function (r) { return r.flags.length; }).length;
  var row = function (k, v) { return '<tr><td style="padding:6px 12px;color:#46594B">' + k + '</td><td style="padding:6px 12px;font-weight:700">' + v + '</td></tr>'; };
  var html = '<div dir="rtl" style="font-family:Tahoma,Arial;font-size:14px">' +
    '<h2 style="color:#187A31;margin:0 0 8px">Full Speed Champions — تقرير ' + Utilities.formatDate(yesterday, Session.getScriptTimeZone(), 'yyyy-MM-dd') + '</h2>' +
    '<table style="border-collapse:collapse;background:#F2F8F3;border-radius:8px">' +
    row('ترشيحات جديدة امبارح', newApps) + row('اتعيّنوا امبارح من ترشيحات', hires) +
    row('بونص مستحق ومستني الصرف', dueSum.toLocaleString('en-US') + ' ج (' + due.length + ' طيار)') +
    row('مرشحين محتاجين متابعة', stuck) + row('تنبيهات محتاجة مراجعة', flagged) +
    '</table>' + (cfg.PUBLIC_APP_URL ? '<p><a href="' + cfg.PUBLIC_APP_URL + 'admin/">افتح لوحة الإدارة</a></p>' : '') + '</div>';
  MailApp.sendEmail({ to: to.join(','), subject: 'Full Speed Champions — تقرير يومي', htmlBody: html });
}
