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
    return { type: 'external', key: u.phone, phone: u.phone, name: u.name, talabatLink: cfg.TALABAT_REF_BASE + cfg.COMPANY_REF_CODE };
  }
  var code = cleanCode(ref);
  var who = world.ridersByCode[code] || world.headcountByCode[code];
  if (!who) return null;
  return { type: 'internal', key: code, phone: who.phone || '', name: who.name, talabatLink: cfg.TALABAT_REF_BASE + code };
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
  if (user.type === 'external') return { type: 'external', key: user.phone, phone: user.phone, talabatLink: cfg.TALABAT_REF_BASE + cfg.COMPANY_REF_CODE };
  var w = loadWorld_(), r = w.ridersByCode[user.code] || w.headcountByCode[user.code] || {};
  return { type: 'internal', key: user.code, phone: user.phone || r.phone || '', talabatLink: cfg.TALABAT_REF_BASE + user.code };
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
    var check = validateCandidate(form, loadWorld_(), owner);
    if (!check.ok) return fail_(check.errors[Object.keys(check.errors)[0]], check.errors);
    appendApplicant_(check.clean, owner);
    log_('candidate', owner.type + ' ' + String(owner.key).slice(-4));
    var data = after();
    data.message = 'تم تسجيل ' + check.clean.name.split(' ')[0] + ' ✅ هنكلمه قريب.';
    return ok_(data);
  });
}
