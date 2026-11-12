/**
 * Full Speed — admin dashboard API.
 *
 * Team members sign in with a username (FS Admins tab). Every change made
 * from the dashboard is checked against the member's role (PERMISSIONS in
 * Config.js) and written to FS Audit with the before/after values.
 */

var ADMIN_HEADERS_ = ['Username', 'Name', 'Role', 'Password Hash', 'Status', 'Must Change Password', 'Created', 'Last Login'];
var PAYOUT_HEADERS_ = ['Payout ID', 'Rider Code', 'Rider Name', 'Referrer', 'Referrer Name', 'Amount', 'Method', 'Reference', 'Note', 'Paid By', 'Paid At', 'Status', 'Approved By', 'Approved At'];
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
  adminApprovePayouts: adminApprovePayouts_,
  adminRecordPayout: adminRecordPayout_,
  adminRefreshReports: adminRefreshReports_,
  adminSendReport: adminSendReport_,
  adminRider: adminRider_,
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
  var ps = tab_(TABS.PAYOUTS), ph = ps.getRange(1, 1, 1, Math.max(1, ps.getLastColumn())).getValues()[0];
  PAYOUT_HEADERS_.forEach(function (h) { if (ph.indexOf(h) === -1) { ph.push(h); ps.getRange(1, ph.length).setValue(h); } });
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
    // The WhatsApp key is a secret: say whether it's set, never send it to the browser.
    data.config.CALLMEBOT_APIKEY = cfg.CALLMEBOT_APIKEY ? '••••••' : '';
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

function payoutCol_(sh, header) { return sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].indexOf(header) + 1; }

/** Step 1 (owner): approve what is owed for one or more riders. */
function adminApprovePayouts_(p) {
  return asAdmin_(p, 'payouts.approve', function (a) {
    var codes = (p.codes || []).map(cleanCode).filter(Boolean).slice(0, 300);
    if (!codes.length) return fail_('اختار طيار واحد على الأقل.');
    return withLock_(function () {
      invalidate_();
      var world = loadWorld_(), data = buildAdminData(world, readUsers_());
      var byCode = {}; data.riders.forEach(function (r) { byCode[r.code] = r; });
      var sh = tab_(TABS.PAYOUTS), rows = [], total = 0, skipped = 0, now = new Date();
      codes.forEach(function (code) {
        var r = byCode[code];
        if (!r || r.payStatus !== 'due') { skipped++; return; }
        var amount = r.bonus - r.paid - r.approved;
        if (amount <= 0) { skipped++; return; }
        var id = 'PO-' + Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyMMdd') + '-' + Utilities.getUuid().slice(0, 4).toUpperCase();
        rows.push([id, "'" + code, safeCell(r.name), "'" + r.ownerKey, safeCell(r.ownerName), amount, '', '', '', '', '', 'معتمد', a.name, now]);
        total += amount;
      });
      if (rows.length) sh.getRange(sh.getLastRow() + 1, 1, rows.length, PAYOUT_HEADERS_.length).setValues(rows);
      audit_(a, 'اعتمد صرف بونص', rows.length + ' طيار', '', total + ' ج');
      invalidate_();
      return ok_({ approved: rows.length, total: total, skipped: skipped });
    });
  });
}

/** Step 2 (finance): mark an approved payout as paid. */
function adminRecordPayout_(p) {
  return asAdmin_(p, 'payouts.edit', function (a) {
    if (PAYOUT_METHODS.indexOf(p.method) === -1) return fail_('اختار طريقة الصرف.', { method: 'مطلوب.' });
    return withLock_(function () {
      var sh = tab_(TABS.PAYOUTS), vals = sh.getDataRange().getValues(), h = vals[0];
      var c = function (name) { return h.indexOf(name); };
      for (var i = 1; i < vals.length; i++) {
        if (String(vals[i][0]) !== String(p.id)) continue;
        if (!/معتمد|approved/i.test(String(vals[i][c('Status')]))) return fail_('العملية دي اتصرفت قبل كده.');
        var row = i + 1, set = function (name, v) { sh.getRange(row, c(name) + 1).setValue(v); };
        set('Method', p.method); set('Reference', safeCell(p.reference || '')); set('Note', safeCell(p.note || ''));
        set('Paid By', a.name); set('Paid At', new Date()); set('Status', 'اتصرف');
        audit_(a, 'سجّل صرف بونص', vals[i][2] + ' #' + vals[i][1], 'معتمد', vals[i][5] + ' ج — ' + p.method);
        invalidate_();
        return ok_({ id: p.id });
      }
      return fail_('لازم المدير يعتمد الصرف الأول.');
    });
  });
}

function adminDeletePayout_(p) {
  return asAdmin_(p, 'payouts.edit', function (a) {
    return withLock_(function () {
      var sh = tab_(TABS.PAYOUTS), vals = sh.getDataRange().getValues();
      for (var i = vals.length - 1; i >= 1; i--) {
        if (String(vals[i][0]) === String(p.id)) {
          audit_(a, /معتمد/.test(String(vals[i][11])) ? 'لغى اعتماد صرف' : 'لغى صرف بونص', vals[i][2] + ' #' + vals[i][1], vals[i][5] + ' ج ' + (vals[i][6] || ''), '');
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
  'MAX_LOGIN_FAILURES', 'LOCK_MINUTES', 'PUBLIC_APPLY_PER_HOUR', 'MIN_PASSWORD_LENGTH', 'SUPPORT_WHATSAPP', 'REPORT_EMAILS', 'REPORT_WHATSAPP', 'CALLMEBOT_APIKEY', 'PUBLIC_APP_URL'];

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
        if (k === 'CALLMEBOT_APIKEY' && /^•+$/.test(String(cfg[k]))) return; // unchanged masked key
        var before = setConfig_(k, String(cfg[k]).trim());
        if (String(before) !== String(cfg[k]).trim()) audit_(a, 'غيّر إعداد', k, k === 'CALLMEBOT_APIKEY' ? '••' : before, k === 'CALLMEBOT_APIKEY' ? '••' : cfg[k]);
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

/* ─────────────────────────── FS Reports ───────────────────────────── */

/** Rewrites the "FS Reports" tab with the summary tables. Runs every morning and from the dashboard. */
function writeReportsTab_() {
  var data = buildAdminData(loadWorld_(), readUsers_());
  var tables = buildReportTables(data);
  var sh = tab_('FS Reports') || ss_().insertSheet('FS Reports');
  sh.clear();
  var width = Math.max.apply(null, tables.map(function (t) { return t.header.length; }));
  var out = [['Full Speed Champions — تقارير', 'آخر تحديث: ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm')]];
  var marks = [];
  tables.forEach(function (t) {
    out.push([]); marks.push({ title: out.length + 1, header: out.length + 2 });
    out.push([t.title]); out.push(t.header);
    t.rows.forEach(function (r) { out.push(r.map(function (v) { return typeof v === 'string' ? safeCell(v) : v; })); });
  });
  out = out.map(function (r) { var x = r.slice(); while (x.length < width) x.push(''); return x; });
  sh.getRange(1, 1, out.length, width).setValues(out);
  sh.getRange(1, 1, 1, 2).setFontWeight('bold');
  marks.forEach(function (m) {
    sh.getRange(m.title, 1).setFontWeight('bold').setFontSize(12).setFontColor('#187A31');
    sh.getRange(m.header, 1, 1, width).setFontWeight('bold').setBackground('#E7EEE6');
  });
  sh.setFrozenRows(1);
  return tables.length;
}

function adminRefreshReports_(p) {
  return asAdmin_(p, null, function (a) {
    return withLock_(function () { writeReportsTab_(); audit_(a, 'حدّث تاب التقارير', '', '', ''); return ok_({}); });
  });
}

/* ────────────────────────── Daily report ──────────────────────────── */

/** Morning report (trigger, 9 AM): FS Reports tab, email to REPORT_EMAILS, WhatsApp to REPORT_WHATSAPP. */
function dailyReport() {
  try { writeReportsTab_(); } catch (e) { log_('error', 'FS Reports: ' + e); }
  var out = sendDailyReport_();
  log_('info', 'التقرير اليومي: ' + out.join(' · '));
}

/** Builds the summary once and sends it everywhere it's configured. Returns what happened, line by line. */
function sendDailyReport_() {
  var cfg = loadConfig_(), done = [];
  var data = buildAdminData(loadWorld_(), readUsers_());
  var sum = buildDailySummary(data);
  var dateLabel = Utilities.formatDate(sum.date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var link = cfg.PUBLIC_APP_URL ? String(cfg.PUBLIC_APP_URL).replace(/\/?$/, '/') + 'admin/' : '';

  var to = String(cfg.REPORT_EMAILS || '').split(/[,\s،]+/).filter(function (e) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e); });
  if (to.length) {
    try { MailApp.sendEmail({ to: to.join(','), subject: 'Full Speed Champions — تقرير ' + dateLabel, htmlBody: dailySummaryHtml_(sum, dateLabel, link) }); done.push('إيميل لـ ' + to.length); }
    catch (e) { done.push('الإيميل فشل: ' + e); }
  } else done.push('مفيش إيميلات في REPORT_EMAILS');

  var targets = whatsappTargets_(cfg);
  if (!targets.length) done.push('واتساب: محتاج REPORT_WHATSAPP و CALLMEBOT_APIKEY');
  var text = dailySummaryText(sum, dateLabel, link);
  targets.forEach(function (t) { done.push('واتساب ' + t.phone + ': ' + sendWhatsApp_(t.phone, t.key, text)); });
  return done;
}

/** "201…" + CALLMEBOT_APIKEY, or "201…:key, 2010…:key2" for several people. */
function whatsappTargets_(cfg) {
  return String(cfg.REPORT_WHATSAPP || '').split(/[,،\n]+/).map(function (x) {
    var parts = x.split(':'), phone = String(parts[0] || '').replace(/\D/g, '');
    if (/^01\d{9}$/.test(phone)) phone = '2' + phone;
    return { phone: phone, key: String(parts[1] || cfg.CALLMEBOT_APIKEY || '').trim() };
  }).filter(function (t) { return /^20\d{10}$/.test(t.phone) && t.key; });
}

/** CallMeBot: free WhatsApp messages to a number that activated it once. Only totals go out — no names, phones or IDs. */
function sendWhatsApp_(phone, key, text) {
  try {
    var url = 'https://api.callmebot.com/whatsapp.php?phone=' + phone + '&text=' + encodeURIComponent(text) + '&apikey=' + encodeURIComponent(key);
    var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    var code = res.getResponseCode(), body = res.getContentText().slice(0, 200);
    if (code === 200 && !/error|invalid|not\s+valid|apikey/i.test(body.replace(/<[^>]+>/g, ' ').replace(/Message queued/i, ''))) return 'اتبعت ✓';
    return 'فشل (' + code + ') ' + body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);
  } catch (e) { return 'فشل: ' + e; }
}

function dailySummaryHtml_(s, dateLabel, link) {
  var n = s.numbers, m = s.money, p = s.problems, f = function (x) { return Number(x || 0).toLocaleString('en-US'); };
  var row = function (k, v, hi) { return '<tr><td style="padding:7px 14px;color:#46594B">' + k + '</td><td style="padding:7px 14px;font-weight:700;' + (hi ? 'color:#A86F00' : '') + '">' + v + '</td></tr>'; };
  var sec = function (title, rows) { return '<h3 style="margin:18px 0 6px;color:#0C150E;font-size:15px">' + title + '</h3><table style="border-collapse:collapse;background:#F2F8F3;border-radius:8px;min-width:320px">' + rows + '</table>'; };
  return '<div dir="rtl" style="font-family:Tahoma,Arial;font-size:14px;color:#0C150E">' +
    '<h2 style="color:#187A31;margin:0">Full Speed Champions</h2><div style="color:#46594B">تقرير ' + dateLabel + '</div>' +
    sec('📊 أرقام إمبارح', row('ترشيحات جديدة', n.apps + ' <span style="color:#7A9180;font-weight:400">(نفس اليوم الأسبوع اللي فات ' + n.appsLastWeek + ')</span>') +
      row('اتعيّنوا من ترشيحات', n.hires + ' <span style="color:#7A9180;font-weight:400">(الأسبوع اللي فات ' + n.hiresLastWeek + ')</span>') +
      row('آخر 7 أيام', n.apps7 + ' ترشيح · ' + n.hires7 + ' تعيين <span style="color:#7A9180;font-weight:400">(قبلها ' + n.apps7Prev + ' · ' + n.hires7Prev + ')</span>')) +
    sec('💰 الفلوس', row('مستني اعتمادك', f(m.dueSum) + ' ج (' + m.dueCount + ' طيار)', true) + row('معتمد ومستني الصرف', f(m.approvedSum) + ' ج (' + m.approvedCount + ' عملية)', true) +
      row('هيستحق خلال أسبوع', f(m.soonSum) + ' ج (' + m.soonCount + ' طيار)')) +
    sec('⚠️ محتاج انتباهك', row('مرشحين واقفين على نفس الحالة', p.stuck) + row('طيارين كودهم وصل ولسه ما بدأوش (3 أيام+)', p.notStarted) + row('تنبيهات تلاعب أو تكرار', p.flagged)) +
    (link ? '<p style="margin-top:18px"><a href="' + link + '" style="background:#187A31;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:700">افتح لوحة الإدارة</a></p>' : '') + '</div>';
}

/** One rider's daily orders, for the full rider page. */
function adminRider_(p) {
  return asAdmin_(p, null, function () {
    var code = cleanCode(p.code), world = loadWorld_();
    if (!world.ridersByCode[code]) return fail_('الطيار ده مش موجود.');
    var days = (world.dailyOrders[code] || []).slice().sort(function (a, b) { return a.date - b.date; });
    return ok_({ code: code, daily: days.map(function (d) { return { date: d.date, orders: d.orders }; }) });
  });
}

/** Owner button in Settings: send the report now, to check email and WhatsApp work. */
function adminSendReport_(p) {
  return asAdmin_(p, 'settings.edit', function (a) {
    var out = sendDailyReport_();
    audit_(a, 'بعت التقرير اليومي تجربة', '', '', out.join(' · '));
    return ok_({ result: out });
  });
}
