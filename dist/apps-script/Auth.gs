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
