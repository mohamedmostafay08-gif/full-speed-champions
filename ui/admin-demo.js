/**
 * Demo backend for the admin dashboard preview. Generates ~3 months of
 * fictional activity and runs the real Logic.js on it, so every number and
 * chart behaves like production. Changes made in the demo live in memory.
 */
(function () {
  var seed = 20261111;
  function rnd() { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
  function pick(a) { return a[Math.floor(rnd() * a.length)]; }
  function int(a, b) { return a + Math.floor(rnd() * (b - a + 1)); }
  var today = dateOnly(new Date());
  var ago = function (n) { return addDays(today, -n); };
  var pad = function (n, w) { return String(n).padStart(w, '0'); };
  var iso = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1, 2) + '-' + pad(d.getDate(), 2); };

  var FIRST = ['أحمد', 'محمد', 'محمود', 'عمر', 'يوسف', 'كريم', 'مصطفى', 'إسلام', 'حسن', 'علي', 'خالد', 'طارق', 'سيد', 'عادل', 'شريف', 'هاني', 'وليد', 'ياسر', 'إبراهيم', 'مينا', 'بيتر', 'زياد', 'عبد الرحمن', 'أنس'];
  var LAST = ['سعيد', 'فتحي', 'جمال', 'رمضان', 'عبد الله', 'حسين', 'سامي', 'نبيل', 'منصور', 'عزت', 'فوزي', 'شوقي', 'الشريف', 'عبده', 'السيد', 'نصر'];
  var ZONES = ['Maadi', 'Nasr city', 'Heliopolis', 'Haram', 'Mohandiseen', 'Tagamoa north', 'Ain shams', 'October', 'Shobra', 'Alexandria', 'Hadayek el qobba', 'Sheikh zayed'];
  var ZW = [16, 14, 10, 12, 9, 8, 6, 7, 5, 4, 4, 5];
  function zone() { var t = ZW.reduce(function (s, x) { return s + x; }, 0), r = rnd() * t; for (var i = 0; i < ZONES.length; i++) { r -= ZW[i]; if (r < 0) return ZONES[i]; } return ZONES[0]; }
  function name(n) { var p = [pick(FIRST)]; for (var i = 1; i < n; i++) p.push(pick(FIRST.concat(LAST))); return p.join(' '); }
  var usedPhones = {};
  function phone() { var p; do { p = pick(['010', '011', '012', '015']) + pad(int(0, 99999999), 8); } while (usedPhones[p]); usedPhones[p] = 1; return p; }
  function nid() { var y = int(85, 104), cent = y >= 100 ? '3' : '2'; return cent + pad(y % 100, 2) + pad(int(1, 12), 2) + pad(int(1, 28), 2) + pick(['01', '02', '12', '13', '14', '21']) + pad(int(0, 9999), 4) + int(0, 9); }

  var COMPANY = '3901026';
  // Fictional supervisors, one or two per zone, each with their own "quality".
  var SVS = {};
  ZONES.forEach(function (z, i) { SVS[z] = [{ name: 'SV ' + pick(FIRST) + ' — ' + z, q: .55 + rnd() * .6 }].concat(i < 4 ? [{ name: 'SV ' + pick(FIRST) + ' ' + pick(LAST) + ' — ' + z, q: .5 + rnd() * .6 }] : []); });
  function svFor(z) { return pick(SVS[z] || SVS.Maadi); }
  var hiring = [];
  var cfg = resolveConfig([['PROGRAM_START_DATE', iso(ago(90))], ['ANNOUNCEMENT', 'الأسبوع ده كل تعيين في المعادي عليه 500 ج زيادة 🔥']], []);

  // ── Referrers: 24 riders and 6 outside partners ──
  var refs = [], headcount = [], users = [];
  for (var i = 0; i < 24; i++) {
    var code = String(4700000 + int(1000, 99999)), ph = phone(), nm = name(3) + ' _FULL SPEED';
    var skill = rnd();
    refs.push({ key: code, type: 'internal', weight: skill < .25 ? 6 : skill < .6 ? 2.5 : 1, quality: .2 + rnd() * .5, phone: ph });
    var hz = zone();
    headcount.push({ code: code, name: nm, zone: hz, supervisor: svFor(hz).name, manager: 'Full Speed', phone: ph, vehicle: pick(['Bike', 'Bike', 'Bicycle']), active: i === 9 || i === 17 ? 'No Contract' : 'Active', spStatus: 'With SP', batch: int(1, 5) });
    if (rnd() < .85) users.push({ type: 'internal', code: code, name: nm, phone: ph, refId: '', status: 'active', created: ago(int(60, 120)), lastLogin: ago(int(0, 14)) });
  }
  for (var j = 0; j < 6; j++) {
    var pp = phone(), pn = name(2);
    refs.push({ key: pp, type: 'external', weight: j < 2 ? 5 : 1.5, quality: .25 + rnd() * .35, phone: pp });
    users.push({ type: 'external', code: pp, name: pn, phone: pp, refId: 'P' + pad(int(0, 99999999), 8).replace(/\d/g, function (d) { return 'ABCDEF0123'[d]; }), status: j === 5 ? 'blocked' : 'active', created: ago(int(30, 90)), lastLogin: ago(int(0, 30)) });
  }
  var totalW = refs.reduce(function (s, r) { return s + r.weight; }, 0);
  function pickRef() { var r = rnd() * totalW; for (var i = 0; i < refs.length; i++) { r -= refs[i].weight; if (r < 0) return refs[i]; } return refs[0]; }

  // ── Applications and the hires that came out of them ──
  var applicants = [], riders = [], daily = [], row = 2, riderCode = 5010000;
  var STAGES = ['جديد', 'تم التواصل', 'قيد التعيين', 'تم حضور المحاضرة'];
  for (var d = 95; d >= 0; d--) {
    var n = Math.round((2 + (95 - d) / 18) * (0.6 + rnd() * .8));
    for (var k = 0; k < n; k++) {
      var ref = pickRef(), sub = ago(d), p = phone(), z = zone(), age = d;
      var hiredChance = ref.quality * (age > 5 ? 1 : .2);
      var status, note = '', upd = sub;
      if (age > 4 && rnd() < hiredChance) status = 'اشتغل';
      else if (age > 3 && rnd() < .16) { status = 'مرفوض'; note = pick(['البطاقة منتهية', 'مش عنده رخصة', 'السن أقل من المطلوب', 'مردّش على التليفون', 'شغال مع 4PL تانية', 'المنطقة مقفولة']); upd = addDays(sub, int(1, 5)); }
      else { var st = Math.min(3, Math.floor(rnd() * Math.min(4, age / 3 + 1))); status = STAGES[st]; upd = addDays(sub, Math.min(age, int(0, 6))); }
      if (status === 'تم حضور المحاضرة' && rnd() < .3) note = 'مستني الفيش الجنائي';
      applicants.push({ _row: row++, timestamp: sub, refCode: ref.key, name: name(4), phone: p, nationalId: nid(), zone: z, status: status === 'اشتغل' ? 'قيد التعيين' : status, note: note, statusUpdated: upd > today ? today : upd, hiredCode: '' });
      if (status === 'اشتغل') {
        var hire = addDays(sub, int(2, 16));
        if (hire > today) hire = today;
        var code2 = String(riderCode += int(3, 40));
        var sv = svFor(z), veh = pick(['Bike', 'Bike', 'Bike', 'Bicycle', 'Walker']);
        var perDay = rnd() < .08 ? 0 : (4 + rnd() * 16) * sv.q * (veh === 'Bike' ? 1.15 : veh === 'Walker' ? .6 : .85);
        var tenure = diffDays(hire, today), spOn = perDay > 0 && rnd() > Math.min(.6, tenure / 160 + (1.2 - sv.q) * .25);
        hiring.push({ _row: hiring.length + 2, hireDate: hire, code: code2, zone: z, name: name(3) + ' _FULL SPEED', phone: p, status: perDay && tenure > 1 ? 'Active' : 'Inactive', sv: sv.name, sp: spOn ? 'With SP' : 'No SP', vehicle: veh });
        riders.push({ _row: riders.length + 2, code: code2, referralCode: ref.type === 'internal' ? ref.key : COMPANY });
        headcount.push({ code: code2, name: name(3), zone: z, supervisor: sv.name, manager: 'Full Speed', phone: p, vehicle: veh, active: 'Active', spStatus: spOn ? 'With SP' : 'No SP', batch: perDay ? Math.max(1, Math.min(7, Math.round(6.2 - perDay / 4 + (rnd() - .5) * 2))) : '' });
        for (var x = hire; x < today; x = addDays(x, 1)) if (perDay) daily.push({ date: x, code: code2, orders: Math.max(0, Math.round(perDay + (rnd() - .5) * 8)) });
      }
    }
  }
  // Hires that came without any referral (for the "share of hires" number)
  for (var u2 = 0; u2 < 70; u2++) {
    var c3 = String(riderCode += int(3, 40)), h3 = ago(int(0, 90));
    var z3 = zone();
    var sv3 = svFor(z3), pd3 = rnd() < .18 ? 0 : (3 + rnd() * 13) * sv3.q, t3 = diffDays(h3, today), sp3 = pd3 > 0 && rnd() > Math.min(.7, t3 / 130 + .1);
    hiring.push({ _row: hiring.length + 2, hireDate: h3, code: c3, zone: z3, name: name(3) + ' _FULL SPEED', phone: phone(), status: pd3 && t3 > 1 ? 'Active' : 'Inactive', sv: sv3.name, sp: sp3 ? 'With SP' : 'No SP', vehicle: pick(['Bike', 'Bike', 'Bicycle', 'Walker']) });
    headcount.push({ code: c3, name: name(3), zone: z3, supervisor: sv3.name, manager: 'Full Speed', phone: '', vehicle: 'Bike', active: 'Active', spStatus: sp3 ? 'With SP' : 'No SP', batch: pd3 ? Math.max(1, Math.min(7, Math.round(7 - pd3 / 3.5 + (rnd() - .5) * 2))) : '' });
    for (var x3 = h3; x3 < today; x3 = addDays(x3, 1)) if (pd3) daily.push({ date: x3, code: c3, orders: Math.max(0, Math.round(pd3 + (rnd() - .5) * 8)) });
  }
  // A few things the alerts page should catch
  var cheater = refs[3];
  applicants.push({ _row: row++, timestamp: ago(6), refCode: cheater.key, name: 'نفس المرشِّح بيرشح نفسه', phone: cheater.phone, nationalId: nid(), zone: 'Maadi', status: 'جديد', note: '', statusUpdated: ago(6), hiredCode: '' });
  for (var b = 0; b < 6; b++) applicants.push({ _row: row++, timestamp: ago(2), refCode: refs[7].key, name: name(4), phone: phone(), nationalId: nid(), zone: 'Haram', status: 'جديد', note: '', statusUpdated: ago(2), hiredCode: '' });

  var campaigns = [{ id: 'C-MAADI', name: 'أسبوع المعادي', start: ago(10), end: addDays(today, 4), zone: 'Maadi', extra: 500, active: 'نعم' }];
  var payouts = [];
  var world = function () { return buildWorld({ hiring: hiring, riders: riders, headcount: headcount, applicants: applicants, dailyOrders: daily, campaigns: campaigns, payouts: payouts }, cfg, today); };

  // Pay most of what was due more than a week ago, so the payouts log has history.
  (function () {
    var w = world(), methods = ['فودافون كاش', 'كاش', 'إنستاباي', 'مع المرتب'];
    buildAdminData(w, users).riders.filter(function (r) { return r.payStatus === 'due' && r.payoutDate < ago(5) && rnd() < .8; }).forEach(function (r) {
      var at = addDays(r.payoutDate, int(1, 4));
      payouts.push({ id: 'PO-' + r.code, riderCode: r.code, amount: r.bonus, method: pick(methods), reference: rnd() < .5 ? 'TX' + int(100000, 999999) : '', note: '', paidBy: pick(['منى (حسابات)', 'المدير']), paidAt: at, status: 'اتصرف', approvedBy: 'المدير', approvedAt: addDays(at, -1) });
    });
    // A few approved and waiting for finance
    buildAdminData(world(), users).riders.filter(function (r) { return r.payStatus === 'due'; }).slice(0, 4).forEach(function (r) {
      payouts.push({ id: 'PO-A' + r.code, riderCode: r.code, amount: r.bonus - r.paid, method: '', reference: '', note: '', paidBy: '', paidAt: null, status: 'معتمد', approvedBy: 'المدير', approvedAt: ago(1) });
    });
  })();

  var team = [
    { username: 'owner', name: 'المدير', role: 'owner', status: 'active', lastLogin: today, mustChange: false },
    { username: 'sara', name: 'سارة — تعيينات', role: 'recruiter', status: 'active', lastLogin: ago(0), mustChange: false },
    { username: 'mona', name: 'منى — حسابات', role: 'finance', status: 'active', lastLogin: ago(1), mustChange: false },
    { username: 'youssef', name: 'يوسف — متابعة', role: 'viewer', status: 'active', lastLogin: ago(6), mustChange: true }
  ];
  var audit = [];
  function log(action, target, before, after) { audit.unshift({ at: new Date().toISOString(), by: 'المدير (owner)', action: action, target: target, before: before || '', after: after || '' }); }
  [['غيّر الحالة', 'كريم سعيد', 'تم التواصل', 'قيد التعيين'], ['سجّل صرف بونص', 'Omar Khaled #5041120', '', '1,800 ج — فودافون كاش'], ['ملاحظة للمرشِّح', 'محمود سامي', '', 'مستني الفيش الجنائي'], ['عمل حملة', 'أسبوع المعادي', '', 'Maadi +500']].forEach(function (a, i) {
    audit.push({ at: new Date(Date.now() - (i + 1) * 3600e3 * 5).toISOString(), by: pick(['سارة — تعيينات (sara)', 'منى — حسابات (mona)', 'المدير (owner)']), action: a[0], target: a[1], before: a[2], after: a[3] });
  });

  var ROLE = 'owner';
  function me() { var perms = {}; Object.keys(PERMISSIONS).forEach(function (k) { perms[k] = ROLE === 'owner' || PERMISSIONS[k].indexOf(ROLE) !== -1; }); return { username: 'owner', name: 'المدير', role: ROLE, roleLabel: ROLES[ROLE], mustChange: false, can: perms }; }
  function wire(v) {
    if (v instanceof Date) return iso(v);
    if (Array.isArray(v)) return v.map(wire);
    if (v && typeof v === 'object') { var o = {}; Object.keys(v).forEach(function (k) { if (k[0] !== '_') o[k] = wire(v[k]); }); return o; }
    return v;
  }
  var ok = function (data) { return { ok: true, data: data || {} }; };
  var temp = function () { return 'fsd' + int(10000, 99999); };

  var H = {
    adminLogin: function () { return ok({ token: 'demo', me: me() }); },
    adminSession: function () { return ok({ me: me() }); },
    adminLogout: function () { return ok(); },
    adminChangePassword: function () { return ok({ token: 'demo', me: me() }); },
    adminData: function () {
      var data = buildAdminData(world(), users);
      data.me = me(); data.roles = ROLES; data.payoutMethods = PAYOUT_METHODS;
      data.config = {}; Object.keys(CONFIG_DEFAULTS).forEach(function (k) { data.config[k] = cfg[k] instanceof Date ? iso(cfg[k]) : cfg[k]; });
      data.audit = audit.slice(0, 400); data.team = team;
      return ok(wire(data));
    },
    adminUpdateApplicants: function (p) {
      if (p.status === 'مرفوض' && !String(p.note || '').trim()) return { ok: false, error: 'اكتب سبب الرفض عشان يظهر للي رشّح.', fields: { note: 'السبب مطلوب.' } };
      var done = 0;
      p.items.forEach(function (it) { var a = applicants.filter(function (x) { return x._row === +it.row; })[0]; if (!a) return;
        if (p.status !== undefined && a.status !== p.status) { log('غيّر الحالة', a.name, a.status, p.status); a.status = p.status; a.statusUpdated = today; }
        if (p.note !== undefined && a.note !== p.note) { log('ملاحظة للمرشِّح', a.name, a.note, p.note); a.note = p.note; }
        done++; });
      return ok({ done: done, skipped: 0 });
    },
    adminEditApplicant: function (p) { var a = applicants.filter(function (x) { return x._row === +p.row; })[0]; Object.keys(p.fields || {}).forEach(function (k) { if (a && p.fields[k]) a[k] = p.fields[k]; }); log('عدّل بيانات مرشح', a ? a.name : ''); return ok(); },
    adminApprovePayouts: function (p) {
      var rs = buildAdminData(world(), users).riders.filter(function (x) { return (p.codes || []).indexOf(x.code) !== -1 && x.payStatus === 'due'; }), total = 0;
      rs.forEach(function (r) { var amt = r.bonus - r.paid - r.approved; total += amt; payouts.push({ id: 'PO-' + Date.now() + r.code, riderCode: r.code, amount: amt, method: '', reference: '', note: '', paidBy: '', paidAt: null, status: 'معتمد', approvedBy: 'المدير', approvedAt: today }); });
      log('اعتمد صرف بونص', rs.length + ' طيار', '', total + ' ج'); return ok({ approved: rs.length, total: total, skipped: (p.codes || []).length - rs.length });
    },
    adminRefreshReports: function () { log('حدّث تاب التقارير', ''); return ok(); },
    adminRider: function (p) { return ok({ code: p.code, daily: wire(daily.filter(function (d) { return d.code === p.code; }).map(function (d) { return { date: d.date, orders: d.orders }; })) }); },
    adminSendReport: function () { return ok({ result: ['نسخة تجريبية — مفيش حاجة اتبعتت فعلاً'] }); },
    adminRecordPayout: function (p) {
      var po = payouts.filter(function (x) { return x.id === p.id && /معتمد/.test(x.status); })[0];
      if (!po) return { ok: false, error: 'لازم المدير يعتمد الصرف الأول.' };
      po.method = p.method; po.reference = p.reference; po.note = p.note; po.paidBy = 'منى (حسابات)'; po.paidAt = today; po.status = 'اتصرف';
      log('سجّل صرف بونص', po.riderCode, 'معتمد', po.amount + ' ج — ' + p.method); return ok({ id: po.id });
    },
    adminDeletePayout: function (p) { payouts = payouts.filter(function (x) { return x.id !== p.id; }); log('لغى صرف بونص', p.id); return ok(); },
    adminUserAction: function (p) {
      var u = users.filter(function (x) { return (x.type === 'external' ? x.phone : x.code) === p.key; })[0];
      if (!u) return { ok: false, error: 'الشخص ده لسه ما فعّلش حسابه في البرنامج.' };
      if (p.action === 'block') u.status = 'blocked'; if (p.action === 'unblock') u.status = 'active'; if (p.action === 'phone') u.phone = canonicalPhone(p.phone) || u.phone;
      log({ reset: 'عمل كلمة سر مؤقتة', block: 'أوقف حساب', unblock: 'فعّل حساب', logout: 'خرّج حساب من كل الأجهزة', phone: 'غيّر رقم موبايل' }[p.action], u.name);
      return ok(p.action === 'reset' ? { temp: temp(), phone: u.phone } : {});
    },
    adminSaveSettings: function (p) {
      Object.keys(p.config || {}).forEach(function (k) { if (k in CONFIG_DEFAULTS) cfg[k] = k === 'PROGRAM_START_DATE' ? (parseSheetDate(p.config[k]) || cfg[k]) : /^\d+$/.test(p.config[k]) && typeof CONFIG_DEFAULTS[k] === 'number' ? +p.config[k] : p.config[k]; });
      if (p.tiers) cfg.TIERS = p.tiers.map(function (t) { return { orders: +t.orders, bonus: +t.bonus }; }).filter(function (t) { return t.orders > 0 && t.bonus > 0; }).sort(function (a, b) { return a.orders - b.orders; });
      log('غيّر الإعدادات', ''); return ok();
    },
    adminSaveAnnouncement: function (p) { log('نشر إعلان للطيارين', '', cfg.ANNOUNCEMENT, p.text); cfg.ANNOUNCEMENT = p.text; return ok(); },
    adminSaveCampaign: function (p) {
      var c = p.campaign, row = { id: c.id || 'C-' + Date.now(), name: c.name, start: parseSheetDate(c.start), end: parseSheetDate(c.end), zone: c.zone, extra: +c.extra, active: c.active === false ? 'لا' : 'نعم' };
      if (!row.name || !row.start || !row.end || !(row.extra > 0)) return { ok: false, error: 'كمّل بيانات الحملة.' };
      campaigns = campaigns.filter(function (x) { return x.id !== row.id; }).concat([row]); log(c.id ? 'عدّل حملة' : 'عمل حملة', c.name); return ok({ id: row.id });
    },
    adminDeleteCampaign: function (p) { campaigns = campaigns.filter(function (x) { return x.id !== p.id; }); log('مسح حملة', p.id); return ok(); },
    adminTeam: function (p) {
      if (p.action === 'add') { team.push({ username: p.username, name: p.name, role: p.role, status: 'active', lastLogin: null, mustChange: true }); log('ضاف عضو للفريق', p.username); return ok({ temp: temp() }); }
      var m = team.filter(function (x) { return x.username === p.username; })[0]; if (!m) return { ok: false, error: 'مش موجود.' };
      if (p.action === 'role') m.role = p.role; if (p.action === 'disable') m.status = 'disabled'; if (p.action === 'enable') m.status = 'active';
      log('عدّل عضو', p.username); return ok(p.action === 'reset' ? { temp: temp() } : {});
    }
  };
  window.FS_ADMIN_DEMO = { call: function (a, p) { return new Promise(function (res) { setTimeout(function () { res(H[a] ? H[a](p || {}) : { ok: false, error: 'demo' }); }, 200); }); } };
})();
