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
    supervisor: h.supervisor || '',
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
  known: 'كان شغال عندنا قبل كده',
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
    e.ownerType = p ? p.type : '';
    e.source = !owner ? 'none' : (r.referralCode && r.referralCode !== cfg.COMPANY_REF_CODE ? 'talabat' : 'app');
    e.appliedOn = app ? app.timestamp : null;
    e.daysToHire = app && app.timestamp ? Math.max(0, diffDays(app.timestamp, r.hireDate)) : null;
    if (!owner) { e.bonus = 0; e.payStatus = 'none'; }
    e.flags = [];
    if (e.state === 'active' && diffDays(r.hireDate, today) >= 14 && e.orders === 0) e.flags.push('quiet');
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
  var headPhones = {};
  world.headcount.forEach(function (h) { if (h.phone) headPhones[h.phone] = true; });

  var applicants = world.applicants.map(function (a) {
    var key = appOwnerKey(a.refCode);
    var p = person(key);
    var hired = a.phone && world.ridersByPhone[a.phone];
    var status = hired ? STATUS_HIRED : (a.status || STATUSES[0]);
    var since = a.statusUpdated || a.timestamp;
    var waiting = since ? diffDays(since, today) : 0;
    var flags = [];
    if (p && a.phone && p.phone === a.phone) flags.push('self');
    if ((perRefDay[key + '|' + (a.timestamp ? a.timestamp.getTime() : '')] || 0) >= 5) flags.push('burst');
    if ((a.nationalId && byNid[a.nationalId] > 1) || (a.phone && byPhone[a.phone] > 1)) flags.push('dupe');
    if (a.phone && headPhones[a.phone] && !hired) flags.push('known');
    if (p) p.applicants++;
    return {
      row: a.row, submitted: a.timestamp, refKey: key, refName: p ? p.name : '', refType: p ? p.type : '',
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
    cleanCode: cleanCode, safeCell: safeCell, normalizeStatus: normalizeStatus, guessStatus: guessStatus, resolveConfig: resolveConfig,
    buildWorld: buildWorld, ownerKey: ownerKey, riderOwner: riderOwner, buildDashboard: buildDashboard,
    findNewlyHired: findNewlyHired, buildAdminData: buildAdminData, evaluateRider: evaluateRider, campaignExtra: campaignExtra, validateCandidate: validateCandidate
  };
}
