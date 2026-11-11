const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../src/Core.js');
const K = require('../src/Config.js');
const L = require('../src/Logic.js');

const D = (y, m, d) => new Date(y, m - 1, d);
const ymd = (d) => d && `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/* Sheets as they look in the screenshots (header row first). */
const RIDERS = [
  ['تاريخ التعيين', 'كود المندوب', 'Name', 'Zone', 'Phone', 'Vehicle', 'Batch NO', 'تاريخ نهاية البونص', 'Orders', 'Referral Code', 'Referral Name', 'Refer Link'],
  ['8-Nov', 5037565, 'Mahmoud Ashraf _FULL SPEED_BC', 'Maadi', '+201151307016', 'Bicycle', 6, '8-Jan', '', 1948971, 'Aly sayed', ''],
  ['5-Nov', 5031339, 'Belal Mohamed _FULL SPEED', 'Nasr city', '+201220211045', 'Bike', 6, '5-Jan', 420, 4906555, 'Abdelrahman', ''],
  ['4-Nov', 5029498, 'Partner Recruit', 'Haram', '+201026477826', 'Bike', 6, '4-Jan', 900, 3901026, 'Faris (company code)', ''],
  ['29-Oct', 5013180, 'Too early', 'Helio', '+201128505791', 'Bike', 2, '29-Dec', 300, 1948971, 'Aly sayed', ''],
  ['', '', '', '', '', '', '', '', '', '', '', '']
];
const HEADCOUNT = [
  ['Code', 'Rider COD Rider Name', 'Zone', 'SPV', 'Manger', 'Phone', 'Vehicle', 'SP Status', 'Batch NO', 'Active ?'],
  [1948971, 'Aly Sayed Emam', 'Maadi', 'Kabo Maadi', 'Full Speed', 201000000001, 'Bike', '', 5, 'Active'],
  [2169208, 'Ibrahim Mohamed', 'Hadayek el qobba', 'Kabo Hadayek', 'Full Speed', 201066768975, '#REF!', '', 5, 'No Contract']
];
const APPLICANTS = [
  ['Timestamp', 'Referral Code', 'الاسم الرباعي', 'الموبايل', 'الرقم القومي', 'العنوان', 'المنطقة', 'انتهاء الرخصة', 'انتهاء البطاقة', 'تاريخ الميلاد', 'اللوحة', 'الحالة', 'ملاحظات الإدارة', 'لينك الترشيح'],
  ['11/2/2026 13:01:05', 1948971, 'كريم احمد محمد علي', 1000000002, 29901010100011, 'x', 'Maadi', '', '', '', '', 'قيد التعيين', '', ''],
  ['11/3/2026 10:00:00', 1144077041, 'شريك مرشح واحد', 1026477826, 29902020100012, 'x', 'Haram', '', '', '', '', 'تم حضور المحاضره', '', ''],
  ['11/10/2026 10:00:00', 1948971, 'لسه جديد خالص', 1000000003, 29903030100013, 'x', 'Maadi', '', '', '', '', '', 'محتاج صورة البطاقة', ''],
  ['10/30/2026 22:47:23', 1948971, 'قبل البرنامج', 1000000004, 29904040100014, 'x', 'Maadi', '', '', '', '', 'شغال', '', '']
];

function world(today = D(2026, 11, 11), dailyRows = []) {
  const cfg = L.resolveConfig([], []);
  return L.buildWorld({
    riders: L.rowsToRecords(RIDERS, K.COLUMNS.RIDERS),
    headcount: L.rowsToRecords(HEADCOUNT, K.COLUMNS.HEADCOUNT),
    applicants: L.rowsToRecords(APPLICANTS, K.COLUMNS.APPLICANTS),
    dailyOrders: L.rowsToRecords([['التاريخ', 'كود المندوب', 'أوردرات مكتملة'], ...dailyRows], K.COLUMNS.DAILY_ORDERS)
  }, cfg, today);
}

test('headers are matched by name, not position', () => {
  const shuffled = [['Phone', 'Orders', 'كود المندوب', 'تاريخ التعيين'], ['01151307016', 10, 5037565, '8-Nov']];
  const [r] = L.rowsToRecords(shuffled, K.COLUMNS.RIDERS);
  assert.equal(r.code, 5037565);
  assert.equal(r.orders, 10);
});

test('status spellings and old values map onto the new pipeline', () => {
  assert.equal(L.normalizeStatus('تم حضور المحاضره'), 'تم حضور المحاضرة');
  assert.equal(L.normalizeStatus(' قيد التعيين '), 'قيد التعيين');
  assert.equal(L.normalizeStatus('شغال'), 'اشتغل');
  assert.equal(L.normalizeStatus('استلم ونزل'), 'اشتغل');
  assert.equal(L.normalizeStatus(''), 'جديد');
  assert.equal(L.normalizeStatus('ارفع استمارة'), 'جديد');
  assert.equal(L.normalizeStatus('ارفع استماره'), 'جديد');
  assert.equal(L.normalizeStatus('ارفع استعلام'), 'جديد');
  assert.equal(L.normalizeStatus('حالة مش معروفة'), '');
});

test('formula injection is neutralised', () => {
  assert.equal(L.safeCell('=IMPORTXML("http://x")'), '\'=IMPORTXML("http://x")');
  assert.equal(L.safeCell('محمد'), 'محمد');
});

test('internal rider sees Talabat referrals from the program start only', () => {
  const dash = L.buildDashboard(world(), { type: 'internal', code: '1948971' });
  assert.deepEqual(dash.team.map((t) => t.code), ['5037565']);  // 29-Oct hire excluded
  assert.equal(dash.user.supervisor, 'Kabo Maadi');
  assert.match(dash.user.talabatLink, /raf_1948971$/);
});

test('company-code hires go to the external partner who submitted them', () => {
  const w = world();
  const partner = L.buildDashboard(w, { type: 'external', phone: '01144077041', name: 'احمد مختار' });
  assert.deepEqual(partner.team.map((t) => t.code), ['5029498']);
  assert.equal(partner.team[0].bonus, 3000); // 900 manual orders → maxed
  assert.equal(partner.team[0].state, 'maxed');
  // …and not to whoever owns the shared company code
  const faris = L.buildDashboard(w, { type: 'internal', code: '3901026' });
  assert.equal(faris.team.length, 0);
});

test('applicant becomes "اشتغل" automatically when the phone is hired', () => {
  const partner = L.buildDashboard(world(), { type: 'external', phone: '01144077041' });
  assert.equal(partner.pipeline[0].status, 'اشتغل');
  assert.equal(partner.pipeline[0].hiredCode, '5029498');
  assert.deepEqual(L.findNewlyHired(world()).map((h) => h.code), ['5029498']);
});

test('pipeline: nudges after 3 days, pre-season applications hidden', () => {
  const dash = L.buildDashboard(world(), { type: 'internal', code: '1948971' });
  assert.deepEqual(dash.pipeline.map((p) => p.name), ['لسه جديد خالص', 'كريم احمد محمد علي']);
  const [fresh, stuck] = dash.pipeline;
  assert.equal(fresh.nudge, false);  // 1 day
  assert.equal(stuck.nudge, true);   // 9 days in قيد التعيين
  assert.equal(fresh.note, 'محتاج صورة البطاقة');
});

test('daily orders beat the manual column and drive the bonus', () => {
  const rows = [];
  for (let i = 0; i < 20; i++) rows.push([C.addDays(D(2026, 11, 8), i), '5037565', 16]);
  const dash = L.buildDashboard(world(D(2026, 11, 28), rows), { type: 'internal', code: '1948971' });
  assert.equal(dash.team[0].orders, 320);
  assert.equal(dash.team[0].bonus, 800);
  assert.equal(ymd(dash.team[0].lastDay), '2027-01-07');
  assert.equal(dash.totals.pending, 800);
});

test('candidate validation: new to Full Speed, adult, valid ID', () => {
  const w = world();
  const base = { fullName: 'محمود علي حسن', mobile: '01099999999', nationalId: '29805050100015', address: 'المعادي', zone: 'Maadi', idExpiry: '2030-01-01' };
  assert.equal(L.validateCandidate(base, w).ok, true);
  assert.equal(L.validateCandidate(base, w).clean.birthDate.getFullYear(), 1998);

  const hiredPhone = L.validateCandidate({ ...base, mobile: '01151307016' }, w);
  assert.match(hiredPhone.errors.mobile, /مسجل عندنا/);
  const headcountPhone = L.validateCandidate({ ...base, mobile: '01066768975' }, w);
  assert.match(headcountPhone.errors.mobile, /مسجل عندنا/);
  const sameId = L.validateCandidate({ ...base, nationalId: '29901010100011' }, w);
  assert.match(sameId.errors.nationalId, /مترشح قبل كده/);
  const minor = L.validateCandidate({ ...base, nationalId: '31001010100017' }, w);
  assert.match(minor.errors.nationalId, /18/);
  const expired = L.validateCandidate({ ...base, idExpiry: '2025-01-01' }, w);
  assert.match(expired.errors.idExpiry, /منتهية/);
});

test('config tab overrides defaults and custom tiers', () => {
  const cfg = L.resolveConfig([['NUDGE_AFTER_DAYS', '5'], ['UNKNOWN', 'x']], [[300, '1,000'], [100, 200]]);
  assert.equal(cfg.NUDGE_AFTER_DAYS, 5);
  assert.deepEqual(cfg.TIERS, [{ orders: 100, bonus: 200 }, { orders: 300, bonus: 1000 }]);
  assert.equal(ymd(cfg.PROGRAM_START_DATE), '2026-11-01');
});
