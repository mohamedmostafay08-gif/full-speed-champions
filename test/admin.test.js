const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { makeEnv } = require('./harness');

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const plain = (v) => JSON.parse(JSON.stringify(v));

function sheet() {
  return {
    'Normal Riders Handle': [
      ['تاريخ التعيين', 'كود المندوب', 'Name', 'Zone', 'Phone', 'Vehicle', 'Orders', 'Referral Code'],
      ['8-Nov', 5037565, 'Mahmoud Ashraf _FULL SPEED_BC', 'Maadi', '+201151307016', 'Bicycle', 900, 4722422],
      ['5-Nov', 5031339, 'Belal Mohamed _FULL SPEED', 'Nasr city', '+201220211045', 'Bike', 260, 3901026],
      ['6-Nov', 5032000, 'Not Referred', 'Haram', '+201099911122', 'Bike', 10, '']
    ],
    Headcount: [
      ['Code', 'Rider COD Rider Name', 'Zone', 'SPV', 'Manger', 'Phone', 'Vehicle', 'SP Status', 'Batch NO', 'Active ?'],
      [4722422, 'Ziad Sharmoukh Mohammed', 'Maadi', 'Kabo Maadi', 'Full Speed', 201148005931, 'Bike', '', 5, 'Active']
    ],
    'New Applicants': [
      ['Timestamp', 'Referral Code', 'الاسم الرباعي', 'الموبايل', 'الرقم القومي', 'العنوان', 'المنطقة', 'انتهاء الرخصة', 'انتهاء البطاقة', 'تاريخ الميلاد', 'اللوحة', 'الحالة', 'ملاحظات الإدارة', 'لينك الترشيح'],
      ['11/3/2026 10:00:00', 1144077041, 'بلال محمد احمد', 1220211045, 29902020100012, 'x', 'Nasr city', '', '', '', '', 'قيد التعيين', '', ''],
      ['11/4/2026 10:00:00', 4722422, 'مرشح بيستنى', 1000000009, 29903030100013, 'x', 'Maadi', '', '', '', '', 'تم التواصل', '', ''],
      ['11/5/2026 10:00:00', 4722422, 'زياد نفسه', 1148005931, 29904040100014, 'x', 'Maadi', '', '', '', '', 'جديد', '', ''],
      // Applied with no referral code → Talabat's code (4722422) is the referrer
      ['11/1/2026 10:00:00', '', 'محمود اشرف', 1151307016, 29905050100015, 'x', 'Maadi', '', '', '', '', 'قيد التعيين', '', '']
    ],
    Passwords: [['Referral Code', 'Password'], [4722422, sha('ziad2026')]],
    'External Partners': [['Phone Code', 'Name', 'Password'], [1144077041, 'احمد مختار', sha('partner99')]],
    Sessions: [['Token', 'Code', 'AccountType', 'Date']]
  };
}

function ready() {
  const env = makeEnv(sheet());
  const report = env.ctx.setupFullSpeed();
  const line = report.find((r) => /owner/.test(r));
  const temp = line.match(/المؤقتة (\S+)/)[1];
  return { env, temp };
}

function ownerToken(env, temp) {
  const login = env.api('adminLogin', { username: 'owner', password: temp });
  assert.equal(login.ok, true, login.error);
  assert.equal(login.data.me.mustChange, true);
  const ch = env.api('adminChangePassword', { token: login.data.token, current: temp, next: 'StrongPass2026' });
  assert.equal(ch.ok, true, ch.error);
  return ch.data.token;
}

test('setup creates the owner account once, with a temporary password', () => {
  const { env, temp } = ready();
  assert.ok(env.sheets['FS Admins'] && env.sheets['FS Payouts'] && env.sheets['FS Audit'] && env.sheets['FS Campaigns']);
  assert.match(temp, /^[a-z]{3}\d{5}$/);
  env.ctx.setupFullSpeed();
  assert.equal(env.sheets['FS Admins'].rows.length, 2);
  assert.equal(env.api('adminLogin', { username: 'owner', password: 'wrong' }).ok, false);
});

test('admin data: attribution, flags, untouched riders, money', () => {
  const { env, temp } = ready();
  const token = ownerToken(env, temp);
  const d = plain(env.api('adminData', { token }).data);
  const r = Object.fromEntries(d.riders.map((x) => [x.code, x]));
  assert.equal(r['5037565'].ownerKey, '4722422');
  assert.equal(r['5037565'].source, 'talabat');
  assert.equal(r['5037565'].payStatus, 'due');                 // 900 orders → maxed
  assert.equal(r['5031339'].ownerKey, '01144077041');           // company code → partner
  assert.equal(r['5031339'].source, 'app');
  assert.equal(r['5032000'].source, 'none');
  const self = d.applicants.find((a) => a.name === 'زياد نفسه');
  assert.ok(self.flags.includes('self'));
  const ziad = d.users.find((u) => u.key === '4722422');
  assert.equal(ziad.registered, true);
  assert.equal(ziad.hires, 1);
  assert.equal(d.me.role, 'owner');
  assert.ok(d.team.length >= 1);
  assert.ok(d.audit.some((x) => x.action === 'دخول'));
});

test('applicant status + note, rejection needs a reason, audit trail', () => {
  const { env, temp } = ready();
  const token = ownerToken(env, temp);
  const rej = env.api('adminUpdateApplicants', { token, items: [{ row: 3, phone: '01000000009' }], status: 'مرفوض' });
  assert.equal(rej.ok, false);
  const ok = env.api('adminUpdateApplicants', { token, items: [{ row: 3, phone: '01000000009' }], status: 'مرفوض', note: 'مش عنده رخصة' });
  assert.equal(ok.ok, true, ok.error);
  const apps = env.sheets['New Applicants'], h = apps.rows[0];
  assert.equal(apps.rows[2][h.indexOf('الحالة')], 'مرفوض');
  assert.equal(apps.rows[2][h.indexOf('ملاحظات الإدارة')], 'مش عنده رخصة');
  assert.ok(env.sheets['FS Audit'].rows.some((r) => r[2] === 'غيّر الحالة' && r[4] === 'تم التواصل' && r[5] === 'مرفوض'));
  // wrong phone guard: the row moved → skipped
  const moved = env.api('adminUpdateApplicants', { token, items: [{ row: 3, phone: '01111111111' }], status: 'جديد' });
  assert.equal(moved.data.skipped, 1);
  // the referrer sees the reason in the app
  const ziad = env.api('login', { type: 'internal', code: '4722422', password: 'ziad2026' });
  const p = ziad.data.dashboard.pipeline.find((x) => x.name === 'مرشح بيستنى');
  assert.equal(p.status, 'مرفوض');
  assert.equal(p.note, 'مش عنده رخصة');
});

test('payouts in two steps: owner approves, finance pays; rider app follows', () => {
  const { env, temp } = ready();
  const token = ownerToken(env, temp);
  const fin = env.api('adminTeam', { token, action: 'add', username: 'mona', name: 'منى', role: 'finance' });
  const mona = env.api('adminLogin', { username: 'mona', password: fin.data.temp }).data.token;
  // finance cannot approve; nothing to pay before approval
  assert.match(env.api('adminApprovePayouts', { token: mona, codes: ['5037565'] }).error, /صلاحياتك/);
  // owner approves what is owed (3000) — riders not due are skipped
  const ap = env.api('adminApprovePayouts', { token, codes: ['5037565', '5032000'] });
  assert.equal(ap.ok, true, ap.error);
  assert.equal(ap.data.approved, 1);
  assert.equal(ap.data.total, 3000);
  let d = plain(env.api('adminData', { token }).data);
  assert.equal(d.riders.find((x) => x.code === '5037565').payStatus, 'approved');
  const po = d.payouts.find((x) => x.status === 'approved');
  // approving again does nothing (already approved)
  assert.equal(env.api('adminApprovePayouts', { token, codes: ['5037565'] }).data.approved, 0);
  // finance pays it
  const pay = env.api('adminRecordPayout', { token: mona, id: po.id, method: 'فودافون كاش', reference: 'TX1' });
  assert.equal(pay.ok, true, pay.error);
  assert.match(env.api('adminRecordPayout', { token: mona, id: po.id, method: 'كاش' }).error, /اتصرفت/);
  d = plain(env.api('adminData', { token }).data);
  assert.equal(d.riders.find((x) => x.code === '5037565').payStatus, 'paid');
  const app = env.api('login', { type: 'internal', code: '4722422', password: 'ziad2026' }).data.dashboard;
  assert.equal(app.totals.paid, 3000);
  assert.equal(app.totals.payable, 0);
  assert.equal(app.team[0].payStatus, 'paid');
  // undo → due again
  assert.equal(env.api('adminDeletePayout', { token, id: po.id }).ok, true);
  assert.equal(plain(env.api('adminData', { token }).data).riders.find((x) => x.code === '5037565').payStatus, 'due');
  assert.ok(env.sheets['FS Audit'].rows.some((r) => r[2] === 'اعتمد صرف بونص'));
});

test('FS Reports tab is written with the comparison tables', () => {
  const { env, temp } = ready();
  const token = ownerToken(env, temp);
  assert.equal(env.api('adminRefreshReports', { token }).ok, true);
  const rows = env.sheets['FS Reports'].rows.map((r) => r[0]);
  assert.ok(rows.includes('مقارنة: من ترشيح قصاد من غير ترشيح'));
  assert.ok(rows.includes('حسب السوبرفايزر (SV الطيار الجديد)'));
  assert.ok(rows.includes('من غير ترشيح'));
});

test('roles: a recruiter can edit candidates but not pay or change settings', () => {
  const { env, temp } = ready();
  const token = ownerToken(env, temp);
  const add = env.api('adminTeam', { token, action: 'add', username: 'sara', name: 'سارة', role: 'recruiter' });
  assert.equal(add.ok, true, add.error);
  const s = env.api('adminLogin', { username: 'sara', password: add.data.temp }).data.token;
  assert.equal(env.api('adminUpdateApplicants', { token: s, items: [{ row: 2 }], status: 'تم التواصل' }).ok, true);
  assert.match(env.api('adminApprovePayouts', { token: s, codes: ['5037565'] }).error, /صلاحياتك/);
  assert.match(env.api('adminSaveSettings', { token: s, config: { NUDGE_AFTER_DAYS: 5 } }).error, /صلاحياتك/);
  assert.equal(plain(env.api('adminData', { token: s }).data).team, undefined);
  assert.equal(env.api('adminTeam', { token, action: 'disable', username: 'sara' }).ok, true);
  assert.equal(env.api('adminData', { token: s }).error, 'SESSION_EXPIRED');
  assert.equal(env.api('adminTeam', { token, action: 'disable', username: 'owner' }).ok, false);   // not yourself
});

test('rider accounts: reset password, block, unblock', () => {
  const { env, temp } = ready();
  const token = ownerToken(env, temp);
  const reset = env.api('adminUserAction', { token, type: 'internal', key: '4722422', action: 'reset' });
  assert.equal(reset.ok, true, reset.error);
  assert.equal(env.api('login', { type: 'internal', code: '4722422', password: 'ziad2026' }).ok, false);
  assert.equal(env.api('login', { type: 'internal', code: '4722422', password: reset.data.temp }).ok, true);
  env.api('adminUserAction', { token, type: 'internal', key: '4722422', action: 'block' });
  assert.match(env.api('login', { type: 'internal', code: '4722422', password: reset.data.temp }).error, /موقوف/);
  env.api('adminUserAction', { token, type: 'internal', key: '4722422', action: 'unblock' });
  assert.equal(env.api('login', { type: 'internal', code: '4722422', password: reset.data.temp }).ok, true);
});

test('settings, tiers, announcement and campaigns reach the rider app', () => {
  const { env, temp } = ready();
  const token = ownerToken(env, temp);
  assert.equal(env.api('adminSaveSettings', { token, config: { NUDGE_AFTER_DAYS: '5' }, tiers: [{ orders: 200, bonus: 500 }, { orders: 800, bonus: 3500 }] }).ok, true);
  assert.equal(env.api('adminSaveAnnouncement', { token, text: 'بونص مضاعف الأسبوع ده 🔥' }).ok, true);
  const camp = env.api('adminSaveCampaign', { token, campaign: { name: 'نوفمبر المعادي', start: '2026-11-01', end: '2026-11-30', zone: 'Maadi', extra: 500 } });
  assert.equal(camp.ok, true, camp.error);
  const app = env.api('login', { type: 'internal', code: '4722422', password: 'ziad2026' }).data.dashboard;
  assert.equal(app.announcement, 'بونص مضاعف الأسبوع ده 🔥');
  assert.equal(app.season.nudgeAfterDays, 5);
  assert.equal(app.team[0].bonus, 3500 + 500);                  // new top tier + Maadi campaign
  assert.equal(app.team[0].extra, 500);
  assert.equal(env.api('adminDeleteCampaign', { token, id: camp.data.id }).ok, true);
});

test('daily report email goes to REPORT_EMAILS only when set', () => {
  const { env, temp } = ready();
  env.ctx.dailyReport();
  assert.equal(env.ctx.__mails, undefined);
  const token = ownerToken(env, temp);
  env.api('adminSaveSettings', { token, config: { REPORT_EMAILS: 'ops@example.com' } });
  env.ctx.SS_ = null; env.ctx.CFG_ = null; env.ctx.WORLD_ = null;
  env.ctx.dailyReport();
  assert.equal(env.ctx.__mails.length, 1);
  assert.match(env.ctx.__mails[0].htmlBody, /تقرير/);
});

test('Hiring tracker: official hire date, SV, SP; old riders are not referrals', () => {
  const tabs = sheet();
  tabs['Hiring tracker'] = [
    ['Dates', 'Rider ID', 'Zones', 'Rider Name:_', 'Phone Number:_', 'Status', 'SV', 'Has SP ?', 'Vehicle'],
    ['11/10/2026', 5037565, 'Maadi', 'Mahmoud Ashraf _FULL SPEED_BC', 1151307016, 'Inactive', 'Ali Sayed Maadi', 'With SP', 'Bicycle'],
    ['11/9/2026', 5031339, 'Nasr city', 'Belal Mohamed _FULL SPEED', 1220211045, 'Inactive', 'Raafat', 'No SP', 'Bike'],
    ['11/2/2026', 5099999, 'Haram', 'Only In Tracker _FULL SPEED', 1012345678, 'Inactive', 'Saadawe Haram', 'With SP', 'Bike']
  ];
  tabs.Headcount.push([4999001, 'Just Arrived Rider', 'Haram', 'Saadawe', 'Full Speed', 201099988877, 'Bike', '', 6, 'Active']);
  // Someone who was hired on 2 Nov, then "referred" on 5 Nov
  tabs['New Applicants'].push(['11/5/2026 10:00:00', 4722422, 'متعين قبل كده', 1012345678, 29905050100016, 'x', 'Haram', '', '', '', '', 'جديد', '', '']);
  const env = makeEnv(tabs);
  const report = env.ctx.setupFullSpeed();
  const temp = report.find((r) => /owner/.test(r)).match(/المؤقتة (\S+)/)[1];
  const token = ownerToken(env, temp);
  const d = plain(env.api('adminData', { token }).data);
  const r = Object.fromEntries(d.riders.map((x) => [x.code, x]));
  assert.equal(r['5037565'].hireDate, '2026-11-10');            // tracker date beats Normal Riders Handle (8 Nov)
  assert.equal(r['5037565'].sv, 'Ali Sayed Maadi');
  assert.equal(r['5037565'].ownerSv, 'Kabo Maadi');              // referrer's SPV from Headcount
  assert.equal(r['5031339'].sp, false);
  assert.ok(r['5031339'].flags.includes('suspended'));
  assert.equal(r['5099999'].ownerKey, '');                       // hired before being referred → nobody's referral
  const old = d.applicants.find((a) => a.name === 'متعين قبل كده');
  assert.ok(old.flags.includes('known'));
  assert.notEqual(old.status, 'اشتغل');
  assert.ok(d.svs.includes('Raafat'));
  // A new candidate whose phone is already a hire is refused; a Headcount-only phone is not
  const zt = env.api('login', { type: 'internal', code: '4722422', password: 'ziad2026' });
  assert.equal(zt.ok, true, zt.error);
  const form = { fullName: 'محمود علي حسن', mobile: '01012345678', nationalId: '29805050100015', address: 'x', zone: 'Haram', idExpiry: '2030-01-01', vehicle: 'عجلة' };
  assert.match(env.api('submitCandidate', { token: zt.data.token, form }).error, /مسجل عندنا/);
  assert.equal(env.api('submitCandidate', { token: zt.data.token, form: { ...form, mobile: '01099988877', nationalId: '29606060100012' } }).error, undefined); // only in Headcount → allowed
});

test('rules from the Q&A: self-referral, rejected re-referral, motorcycle licence, Inactive/Active', () => {
  const tabs = sheet();
  tabs['Hiring tracker'] = [
    ['Dates', 'Rider ID', 'Zones', 'Rider Name:_', 'Phone Number:_', 'Status', 'SV', 'Has SP ?', 'Vehicle'],
    ['11/10/2026', 5037565, 'Maadi', 'Mahmoud Ashraf', 1151307016, 'Active', 'Ali Sayed Maadi', 'With SP', 'Bicycle'],
    ['11/9/2026', 5031339, 'Nasr city', 'Belal Mohamed', 1220211045, 'Inactive', 'Raafat', 'With SP', 'Bike']
  ];
  tabs['Normal Riders Handle'][2][6] = '';                         // Belal: no orders yet
  tabs['New Applicants'].push(['11/6/2026 10:00:00', 4722422, 'مرفوض من زياد', 1033334444, 29907070100011, 'x', 'Maadi', '', '', '', '', 'مرفوض', 'البطاقة منتهية', '']);
  const env = makeEnv(tabs);
  env.ctx.setupFullSpeed();
  const ziad = env.api('login', { type: 'internal', code: '4722422', password: 'ziad2026' }).data;
  const partner = env.api('login', { type: 'external', code: '01144077041', password: 'partner99' }).data;
  const base = { fullName: 'محمود علي حسن', mobile: '01077778888', nationalId: '29805050100015', address: 'x', zone: 'Maadi', idExpiry: '2030-01-01', vehicle: 'عجلة' };

  // self-referral is refused
  assert.match(env.api('submitCandidate', { token: ziad.token, form: { ...base, mobile: '01148005931' } }).error, /نفسك/);
  // motorcycle needs a valid licence
  assert.match(env.api('submitCandidate', { token: ziad.token, form: { ...base, vehicle: 'موتوسيكل' } }).error, /الرخصة/);
  assert.match(env.api('submitCandidate', { token: ziad.token, form: { ...base, vehicle: 'موتوسيكل', licenseExpiry: '2025-01-01' } }).error, /منتهية/);
  // a rejected candidate: only the original referrer can submit them again
  const again = { ...base, fullName: 'مرفوض من زياد تاني', mobile: '01033334444', nationalId: '29907070100011' };
  assert.match(env.api('submitCandidate', { token: partner.token, form: again }).error, /هو بس/);
  assert.equal(env.api('submitCandidate', { token: ziad.token, form: again }).ok, true);

  // Inactive in the tracker: code arrived, not started → not "اشتغل" yet, sync leaves the sheet alone
  const p = env.api('session', { token: partner.token }).data.dashboard.pipeline.find((x) => x.name === 'بلال محمد احمد');
  assert.equal(p.status, 'قيد التعيين');
  assert.equal(p.codeArrived, true);
  env.ctx.syncApplicants();
  const apps = env.sheets['New Applicants'], h = apps.rows[0];
  assert.notEqual(apps.rows[1][h.indexOf('الحالة')], 'اشتغل');
  // …and the referrer's bonus clock still runs from the hire date
  assert.equal(env.api('session', { token: partner.token }).data.dashboard.team[0].hireDate, '2026-11-09');
});

test('a referral must be made on or before the hire day', () => {
  const tabs = sheet();
  tabs['Hiring tracker'] = [
    ['Dates', 'Rider ID', 'Zones', 'Rider Name:_', 'Phone Number:_', 'Status', 'SV', 'Has SP ?', 'Vehicle'],
    ['11/2/2026', 5031339, 'Nasr city', 'Belal Mohamed', 1220211045, 'Active', 'Raafat', 'With SP', 'Bike']
  ];
  // the partner's application for Belal is dated 3 Nov — a day after his hire
  const env = makeEnv(tabs);
  env.ctx.setupFullSpeed();
  const partner = env.api('login', { type: 'external', code: '01144077041', password: 'partner99' }).data;
  assert.equal(partner.dashboard.team.length, 0);
});

test('data check: recognised columns and how applications became counted hires', () => {
  const { env, temp } = ready();
  const token = ownerToken(env, temp);
  const c = plain(env.api('adminDataCheck', { token }).data);
  const apps = c.tabs.find((t) => t.key === 'APPLICANTS');
  assert.equal(apps.found, true);
  assert.equal(apps.columns.phone, 'الموبايل');
  const hired = Object.fromEntries(c.hired.map((x) => [x.code, x]));
  assert.equal(hired['5037565'].counted, true);       // empty Referral Code → Talabat code
  assert.equal(hired['5031339'].counted, true);       // partner application
  assert.ok(!hired['5032000']);                       // never applied → not a referral
  assert.equal(c.counted, 2);
});
