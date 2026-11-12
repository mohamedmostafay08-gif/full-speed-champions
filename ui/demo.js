/**
 * Demo backend for the preview page. Runs the real Core/Logic code on
 * made-up sheet rows, so the numbers behave exactly like production.
 * All names, phones and codes below are fictional.
 */
(function () {
  var today = dateOnly(new Date());
  var ago = function (n) { return addDays(today, -n); };
  var iso = function (d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

  var ME = { type: 'internal', code: '4722422', name: 'Ziad Sharmoukh Mohammed', phone: '01148005931' };
  var PARTNER = { type: 'external', code: '01144077041', phone: '01144077041', name: 'أحمد مختار', refId: 'P7C21A9F0' };

  var riders = [
    ['تاريخ التعيين', 'كود المندوب', 'Name', 'Zone', 'Phone', 'Vehicle', 'Orders', 'Referral Code'],
    [ago(9), 5041120, 'Omar Khaled Mostafa _FULL SPEED', 'Maadi', '+201001112233', 'Bike', '', 4722422],
    [ago(25), 5036541, 'Youssef Adel Fawzy _FULL SPEED_BC', 'Nasr city', '+201023344556', 'Bicycle', '', 4722422],
    [ago(45), 5030967, 'Karim Atef Ezzat _FULL SPEED', 'Heliopolis', '+201112223344', 'Bike', '', 4722422],
    [ago(72), 5021894, 'Mostafa Salem Abdallah _FULL SPEED', 'Haram', '+201224455667', 'Bike', '', 4722422],
    [ago(2), 5043877, 'Hassan Tarek Nabil _FULL SPEED', 'Maadi', '+201556677889', 'Bike', '', 4722422],
    [ago(18), 5038002, 'Mahmoud Fathy Saad _FULL SPEED', 'Haram', '+201277788990', 'Bike', '', 3901026],
    [ago(6), 5042210, 'Ali Samir Gad _FULL SPEED', 'Mohandiseen', '+201099988877', 'Bike', '', 3901026],
    [ago(10), 4722422, 'Ziad Sharmoukh Mohammed', 'Maadi', '+201148005931', 'Bike', '', '']
  ];
  var headcount = [
    ['Code', 'Rider COD Rider Name', 'Zone', 'SPV', 'Manger', 'Phone', 'Vehicle', 'Active ?'],
    [4722422, 'Ziad Sharmoukh Mohammed', 'Maadi', 'Kabo Maadi', 'Full Speed', 201148005931, 'Bike', 'Active']
  ];
  var applicants = [
    ['Timestamp', 'Referral Code', 'الاسم الرباعي', 'الموبايل', 'الرقم القومي', 'المنطقة', 'الحالة', 'ملاحظات الإدارة', 'آخر تحديث للحالة'],
    [ago(12), 4722422, 'عمر خالد مصطفى حسن', '01001112233', '29801010100011', 'Maadi', 'تم حضور المحاضرة', '', ago(10)],
    [ago(1), 4722422, 'إسلام محمد عبد الله', '01033322211', '30002020100014', 'Maadi', 'جديد', '', ago(1)],
    [ago(6), 4722422, 'سيد رمضان علي محمود', '01144455566', '29905050100016', 'Nasr city', 'تم التواصل', '', ago(6)],
    [ago(8), 4722422, 'محمود سامي فتحي عبده', '01200011122', '29707070100015', 'Haram', 'تم حضور المحاضرة', 'مستني الفيش الجنائي', ago(4)],
    [ago(3), 4722422, 'أحمد جمال حسين', '01566677788', '30103030100013', 'Maadi', 'قيد التعيين', '', ago(2)],
    [ago(9), 4722422, 'عادل فوزي إبراهيم', '01011223344', '29606060100012', 'Haram', 'مرفوض', 'البطاقة منتهية — يجددها ويتقدم تاني', ago(7)],
    [ago(20), '01144077041', 'محمود فتحي سعد إبراهيم', '01277788990', '29808080100018', 'Haram', 'اشتغل', '', ago(18)],
    [ago(9), '01144077041', 'علي سمير جاد', '01099988877', '30009090100017', 'Mohandiseen', 'قيد التعيين', '', ago(8)],
    [ago(4), '01144077041', 'شريف ناصر عبد الحميد', '01155566677', '29910100100019', 'Maadi', 'تم التواصل', '', ago(4)]
  ];

  // Completed orders per day for each hired rider.
  var perDay = { 5041120: 14, 5036541: 20, 5030967: 23, 5021894: 8, 5043877: 6, 5038002: 17, 5042210: 12 };
  var daily = [['التاريخ', 'كود المندوب', 'أوردرات مكتملة']];
  riders.slice(1).forEach(function (r) {
    var n = perDay[r[1]];
    if (!n) return;
    for (var d = r[0]; d < today; d = addDays(d, 1)) daily.push([d, String(r[1]), n + ((d.getDate() * 7) % 5) - 2]);
  });

  var cfg = resolveConfig([['PROGRAM_START_DATE', iso(ago(80))]], []);
  var zones = ['Ain shams', 'Alexandria', 'Haram', 'Heliopolis', 'Maadi', 'Mohandiseen', 'Nasr city', 'Tagamoa north'];

  function world() {
    return buildWorld({
      riders: rowsToRecords(riders, COLUMNS.RIDERS),
      headcount: rowsToRecords(headcount, COLUMNS.HEADCOUNT),
      applicants: rowsToRecords(applicants, COLUMNS.APPLICANTS),
      dailyOrders: rowsToRecords(daily, COLUMNS.DAILY_ORDERS)
    }, cfg, today);
  }

  function wire(v) {
    if (v instanceof Date) return iso(v);
    if (Array.isArray(v)) return v.map(wire);
    if (v && typeof v === 'object') { var o = {}; Object.keys(v).forEach(function (k) { if (k[0] !== '_') o[k] = wire(v[k]); }); return o; }
    return v;
  }

  var session = null;
  // Fictional competitors so the monthly ranking has something to show.
  function demoBoard(d) {
    var mine = d.team.filter(function (r) { var h = new Date(r.hireDate); return h.getMonth() === today.getMonth() && h.getFullYear() === today.getFullYear(); }).length;
    var rows = [['كريم', 9], ['منة', 7], ['يوسف', 6], ['حسام', 5], ['نور', 4], ['عمرو', 3], ['سلمى', 2], ['مازن', 2], ['هادي', 1]].map(function (x) { return { name: x[0], hires: x[1], me: false }; });
    if (mine) rows.push({ name: String(d.user.name || 'إنت').split(' ')[0], hires: mine, me: true });
    rows.sort(function (a, b) { return b.hires - a.hires || (a.me ? -1 : 1); });
    var rank = 0, prev = null; rows.forEach(function (r, i) { if (r.hires !== prev) { rank = i + 1; prev = r.hires; } r.rank = rank; });
    var me = rows.filter(function (r) { return r.me; })[0], above = me ? rows.filter(function (r) { return r.rank < me.rank; }).pop() : null;
    return { month: new Date(today.getFullYear(), today.getMonth(), 1), total: rows.length, top: rows.slice(0, 10),
      me: me ? { rank: me.rank, hires: me.hires, toNext: above ? above.hires - me.hires + 1 : 0 } : { rank: null, hires: 0, toNext: 1 } };
  }
  var dash = function () { var d = buildDashboard(world(), session); d.leaderboard = demoBoard(d); return wire(d); };
  var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

  function save(form, owner) {
    var check = validateCandidate(form, world());
    if (!check.ok) return { ok: false, error: check.errors[Object.keys(check.errors)[0]], fields: check.errors };
    applicants.push([today, owner, check.clean.name, check.clean.phone, check.clean.nationalId, check.clean.zone, 'جديد', '', today]);
    return null;
  }

  var handlers = {
    bootstrap: function (p) {
      return { ok: true, data: { zones: zones, tiers: cfg.TIERS, windowMonths: 2, support: '201120339097', appUrl: 'https://script.google.com/macros/s/…/exec',
        referrer: p.ref ? { valid: true, firstName: 'Ziad' } : null } };
    },
    login: function (p) {
      if (!p.code || !p.password) return { ok: false, error: 'اكتب الكود وكلمة المرور.' };
      session = p.type === 'external' ? PARTNER : ME;
      return { ok: true, data: { token: 'demo', dashboard: dash() } };
    },
    activate: function (p) { return handlers.login({ type: p.type, code: p.code || p.phone, password: p.password }); },
    session: function () { return session ? { ok: true, data: { dashboard: dash() } } : { ok: false, error: 'SESSION_EXPIRED' }; },
    logout: function () { session = null; return { ok: true, data: {} }; },
    changePassword: function () { return { ok: true, data: { token: 'demo' } }; },
    submitCandidate: function (p) {
      var err = save(p.form, session.type === 'external' ? session.phone : session.code);
      return err || { ok: true, data: { dashboard: dash(), message: 'تم تسجيل ' + String(p.form.fullName).split(' ')[0] + ' ✅ هنكلمه قريب.' } };
    },
    publicApply: function (p) { return save(p.form, ME.code) || { ok: true, data: { referrer: 'Ziad' } }; }
  };

  window.FS_DEMO = {
    call: function (action, payload) {
      return wait(250).then(function () { return handlers[action] ? handlers[action](payload || {}) : { ok: false, error: 'demo' }; });
    },
    ref: function () { return Promise.resolve(location.hash === '#apply' ? '4722422' : ''); }
  };
})();
