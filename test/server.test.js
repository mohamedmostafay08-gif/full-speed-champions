const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { makeEnv } = require('./harness');

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

/* Today's sheet, trimmed: the tabs and quirks seen in the screenshots. */
function sheetToday() {
  return {
    'Normal Riders Handle': [
      ['تاريخ التعيين', 'كود المندوب', 'Name', 'Zone', 'Phone', 'Vehicle', 'Batch NO', 'تاريخ نهاية البونص', 'Orders', 'Referral Code', 'Referral Name', 'Refer Link'],
      ['8-Nov', 5037565, 'Mahmoud Ashraf _FULL SPEED_BC', 'Maadi', '+201151307016', 'Bicycle', 6, '8-Jan', 260, 4722422, 'Ziad', ''],
      ['5-Nov', 5031339, 'Belal Mohamed _FULL SPEED', 'Nasr city', '+201220211045', 'Bike', 6, '5-Jan', '', 3901026, 'Faris', '']
    ],
    Headcount: [
      ['Code', 'Rider COD Rider Name', 'Zone', 'SPV', 'Manger', 'Phone', 'Vehicle', 'SP Status', 'Batch NO', 'Active ?'],
      [4722422, 'Ziad Sharmoukh Mohammed', 'Maadi', 'Kabo Maadi', 'Full Speed', 201148005931, 'Bike', '', 5, 'Active'],
      [2638129, 'Old Rider With Legacy Pass', 'Haram', 'Saadawe', 'Full Speed', 201011112222, 'Bike', '', 5, 'Active']
    ],
    'New Applicants': [
      ['Timestamp', 'Referral Code', 'الاسم الرباعي', 'الموبايل', 'الرقم القومي', 'العنوان', 'المنطقة', 'انتهاء الرخصة', 'انتهاء البطاقة', 'تاريخ الميلاد', 'اللوحة', 'الحالة', 'ملاحظات الإدارة', 'لينك الترشيح'],
      ['11/3/2026 10:00:00', 1144077041, 'بلال محمد احمد', 1220211045, 29902020100012, 'x', 'Nasr city', '', '', '', '', 'قيد التعيين', '', ''],
      ['11/4/2026 10:00:00', 4722422, 'مرشح قديم', 1000000009, 29903030100013, 'x', 'Maadi', '', '', '', '', 'استلم ونزل', '', ''],
      ['11/5/2026 10:00:00', 4722422, 'مرشح استعلام', 1000000010, 29904040100014, 'x', 'Maadi', '', '', '', '', 'اترفع استعلام', '', ''],
      ['11/6/2026 10:00:00', 4722422, 'مرشح شركة تانية', 1000000011, 29905050100015, 'x', 'Maadi', '', '', '', '', 'شغال مع ال 4pl', 'عنده عقد', ''],
      ['11/1/2026 10:00:00', 4722422, 'محمود اشرف', 1151307016, 29906060100016, 'x', 'Maadi', '', '', '', '', 'قيد التعيين', '', '']
    ],
    Passwords: [['Referral Code', 'Password'], [2638129, sha('1234')]],
    'External Partners': [['Phone Code', 'Name', 'Password'], ['', '', ''], [1144077041, 'احمد مختار شحاته', sha('partner99')]],
    Sessions: [['Token', 'Code', 'AccountType', 'Date']]
  };
}

function ready() {
  const env = makeEnv(sheetToday());
  const report = env.ctx.setupFullSpeed();
  return { env, report };
}

test('setup creates the new tabs, upgrades New Applicants, migrates accounts', () => {
  const { env, report } = ready();
  for (const t of ['FS Config', 'FS Bonus Tiers', 'Daily Orders', 'FS Users', 'FS Sessions', 'FS Log']) assert.ok(env.sheets[t], t);
  const apps = env.sheets['New Applicants'];
  assert.ok(apps.rows[0].includes('آخر تحديث للحالة'));
  assert.equal(apps.rows[2][11], 'اشتغل');                        // "استلم ونزل" mapped
  assert.deepEqual([...apps.validations[12].list], ['جديد', 'تم التواصل', 'قيد التعيين', 'تم حضور المحاضرة', 'اشتغل', 'مرفوض']);
  assert.equal(apps.formats[4], '@');
  assert.equal(apps.rows[3][11], 'جديد');                           // "اترفع استعلام"
  assert.equal(apps.rows[4][11], 'مرفوض');                          // "شغال مع ال 4pl"
  assert.equal(apps.rows[4][12], 'عنده عقد | الحالة القديمة: شغال مع ال 4pl');
  for (const t of ['Sessions', 'Passwords', 'External Partners']) assert.equal(env.sheets[t], undefined, t + ' deleted');                            // phone column is text
  const users = env.sheets['FS Users'].rows.slice(1);
  assert.equal(users.length, 2);
  assert.equal(users[1][3], '01144077041');                       // leading zero restored
  assert.match(users[1][4], /^P[0-9A-F]{8}$/);                     // opaque ref id
  assert.equal(env.triggers.length, 4);
  assert.ok(report.length >= 4);
  // Running it again changes nothing.
  env.ctx.setupFullSpeed();
  assert.equal(env.sheets['New Applicants'].rows[4][12], 'عنده عقد | الحالة القديمة: شغال مع ال 4pl');
  assert.equal(env.sheets['FS Users'].rows.length, 3);
  assert.equal(env.triggers.length, 4);
});

test('legacy partner can log in with 01… (old bug) and gets a stronger hash', () => {
  const { env } = ready();
  const res = env.api('login', { type: 'external', code: '01144077041', password: 'partner99' });
  assert.equal(res.ok, true, res.error);
  assert.match(env.sheets['FS Users'].rows[2][5], /^pbkdf2\$/);
  // The company-code hire whose phone matches this partner's application is theirs.
  assert.deepEqual([...res.data.dashboard.team.map((t) => t.code)], ['5031339']);
  assert.equal(res.data.dashboard.pipeline[0].status, 'اشتغل');
  assert.equal(res.data.dashboard.user.refParam.charAt(0), 'P');
  // Session tokens are stored hashed only.
  const stored = env.sheets['FS Sessions'].rows[1][0];
  assert.equal(stored, sha(res.data.token));
  assert.notEqual(stored, res.data.token);
});

test('legacy rider with "1234" still logs in once, then re-hashed', () => {
  const { env } = ready();
  const res = env.api('login', { type: 'internal', code: '2638129', password: '1234' });
  assert.equal(res.ok, true, res.error);
  assert.match(env.sheets['FS Users'].rows[1][5], /^pbkdf2\$1000\$/);
  assert.equal(env.api('login', { type: 'internal', code: '2638129', password: '1234' }).ok, true);
});

test('activation needs the phone on record — no more claiming other codes', () => {
  const { env } = ready();
  const wrong = env.api('activate', { type: 'internal', code: '4722422', phone: '01000000000', password: 'Ziad2026' });
  assert.equal(wrong.ok, false);
  assert.ok(wrong.fields.phone);
  const right = env.api('activate', { type: 'internal', code: '4722422', phone: '01148005931', password: 'Ziad2026' });
  assert.equal(right.ok, true, right.error);
  assert.deepEqual([...right.data.dashboard.team.map((t) => t.code)], ['5037565']);
  assert.equal(right.data.dashboard.team[0].bonus, 600);         // 260 manual orders
  const again = env.api('activate', { type: 'internal', code: '4722422', phone: '01148005931', password: 'Other2026' });
  assert.equal(again.ok, false);
});

test('weak passwords are refused', () => {
  const { env } = ready();
  const res = env.api('activate', { type: 'external', phone: '01212345678', name: 'Sara Ali', password: '111111' });
  assert.equal(res.ok, false);
  assert.ok(res.fields.password);
});

test('five wrong passwords lock the account', () => {
  const { env } = ready();
  for (let i = 0; i < 4; i++) assert.match(env.api('login', { type: 'internal', code: '2638129', password: 'nope' }).error, /باقي/);
  assert.match(env.api('login', { type: 'internal', code: '2638129', password: 'nope' }).error, /اتقفل/);
  assert.match(env.api('login', { type: 'internal', code: '2638129', password: '1234' }).error, /مقفول/);
});

test('session restore, candidate submission, duplicate block, logout', () => {
  const { env } = ready();
  const { token } = env.api('activate', { type: 'internal', code: '4722422', phone: '01148005931', password: 'Ziad2026' }).data;
  assert.equal(env.api('session', { token }).ok, true);

  const form = { fullName: 'محمود علي حسن', mobile: '01099999999', nationalId: '29805050100015', address: '=HYPERLINK("x")', zone: 'Maadi', idExpiry: '2030-01-01', vehicle: 'عجلة' };
  const sub = env.api('submitCandidate', { token, form });
  assert.equal(sub.ok, true, sub.error);
  const apps = env.sheets['New Applicants'];
  const row = apps.rows[apps.rows.length - 1];
  const col = (h) => row[apps.rows[0].indexOf(h)];
  assert.equal(col('الموبايل'), '01099999999');
  assert.equal(col('Referral Code'), '4722422');
  assert.equal(col('الحالة'), 'جديد');
  assert.equal(col('تاريخ الميلاد'), '1998-05-05');                 // read from the national ID
  assert.equal(col('العنوان'), '=HYPERLINK("x")');                   // stored as text, not a formula (apostrophe consumed)
  assert.match(col('لينك الترشيح'), /raf_4722422$/);
  assert.equal(sub.data.dashboard.pipeline.length, 5);              // + the four November ones already in the sheet
  assert.equal(sub.data.dashboard.pipeline[0].name, 'محمود علي حسن');

  const dupe = env.api('submitCandidate', { token, form });
  assert.equal(dupe.ok, false);
  assert.match(dupe.error, /مترشح قبل كده/);

  assert.equal(env.api('logout', { token }).ok, true);
  assert.equal(env.api('session', { token }).error, 'SESSION_EXPIRED');
});

test('public ?ref= form: valid code works, unknown ref refused, partner ref hides phone', () => {
  const { env } = ready();
  const boot = env.api('bootstrap', { ref: '4722422' });
  assert.equal(boot.data.referrer.firstName, 'Ziad');
  assert.ok(boot.data.zones.includes('Maadi'));
  assert.equal(env.api('bootstrap', { ref: '999' }).data.referrer.valid, false);

  const refId = env.sheets['FS Users'].rows[2][4];
  const form = { fullName: 'سارة محمود علي', mobile: '01555555555', nationalId: '30001010100015', address: 'الهرم', zone: 'Haram', idExpiry: '2031-01-01', vehicle: 'عجلة' };
  const res = env.api('publicApply', { ref: refId, form });
  assert.equal(res.ok, true, res.error);
  const apps = env.sheets['New Applicants'];
  const last = apps.rows[apps.rows.length - 1];
  assert.equal(last[1], '01144077041');                              // credited to the partner
  assert.match(last[apps.rows[0].indexOf('لينك الترشيح')], /raf_3901026$/);
  assert.equal(env.api('publicApply', { ref: 'P00000000', form }).ok, false);
});

test('hourly sync writes "اشتغل" and the rider code into New Applicants', () => {
  const { env } = ready();
  env.ctx.syncApplicants();
  const apps = env.sheets['New Applicants'];
  const h = apps.rows[0];
  assert.equal(apps.rows[1][h.indexOf('الحالة')], 'اشتغل');
  assert.equal(apps.rows[1][h.indexOf('كود بعد التعيين')], '5031339');
});

test('installable app: doPost speaks the same API as JSON', () => {
  const { env } = ready();
  const res = JSON.parse(env.ctx.doPost({ postData: { contents: JSON.stringify({ action: 'bootstrap', payload: { ref: '4722422' } }) } }).text);
  assert.equal(res.ok, true);
  assert.equal(res.data.appUrl, 'https://mohamedmostafay08-gif.github.io/full-speed-champions/');
  assert.equal(JSON.parse(env.ctx.doPost({ postData: { contents: 'not json' } }).text).ok, false);
  assert.ok(env.sheets['FS Config'].rows.some((r) => r[0] === 'PUBLIC_APP_URL'));
});

test('Google link reads the interface from GitHub, falls back to the local copy', () => {
  const { env } = ready();
  const remote = '<title>Full Speed Champions</title>' + 'x'.repeat(150000) + 'google.script';
  env.ctx.__remote = () => ({ getResponseCode: () => 200, getContentText: () => remote });
  assert.equal(env.api('bootstrap', {}).ok, true);
  env.ctx.SS_ = null; env.ctx.CFG_ = null;
  assert.equal(env.ctx.doGet().html, remote);
  assert.equal(env.ctx.doGet().html, remote);              // second load comes from the cache
  assert.equal(env.ctx.__fetched, 1);
  env.cache.clear();
  env.ctx.__remote = () => ({ getResponseCode: () => 404, getContentText: () => 'Not Found' });
  assert.match(env.ctx.doGet().html, /^LOCAL/);
  env.ctx.__remote = () => { throw new Error('offline'); };
  assert.match(env.ctx.doGet().html, /^LOCAL/);
});

test('errors never leak internals', () => {
  const { env } = ready();
  delete env.sheets['FS Sessions'];
  env.ctx.CacheService.getScriptCache = () => { throw new Error('secret stack'); };
  const res = env.api('session', { token: 'a'.repeat(64) });
  assert.equal(res.ok, false);
  assert.doesNotMatch(res.error, /secret/);
});
