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
