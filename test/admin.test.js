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
      ['11/5/2026 10:00:00', 4722422, 'زياد نفسه', 1148005931, 29904040100014, 'x', 'Maadi', '', '', '', '', 'جديد', '', '']
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

test('payouts: cannot overpay, mark paid, rider app shows it, undo', () => {
  const { env, temp } = ready();
  const token = ownerToken(env, temp);
  const over = env.api('adminRecordPayout', { token, code: '5037565', amount: 5000, method: 'كاش' });
  assert.equal(over.ok, false);
  const pay = env.api('adminRecordPayout', { token, code: '5037565', amount: 3000, method: 'فودافون كاش', reference: 'TX1' });
  assert.equal(pay.ok, true, pay.error);
  const d = plain(env.api('adminData', { token }).data);
  assert.equal(d.riders.find((x) => x.code === '5037565').payStatus, 'paid');
  assert.equal(d.payouts[0].amount, 3000);
  const again = env.api('adminRecordPayout', { token, code: '5037565', amount: 100, method: 'كاش' });
  assert.equal(again.ok, false);                                // already fully paid
  const nobody = env.api('adminRecordPayout', { token, code: '5032000', amount: 100, method: 'كاش' });
  assert.equal(nobody.ok, false);                               // not referred by anyone
  const app = env.api('login', { type: 'internal', code: '4722422', password: 'ziad2026' }).data.dashboard;
  assert.equal(app.totals.paid, 3000);
  assert.equal(app.totals.payable, 0);
  assert.equal(app.team[0].payStatus, 'paid');
  assert.equal(env.api('adminDeletePayout', { token, id: pay.data.id }).ok, true);
  assert.equal(plain(env.api('adminData', { token }).data).riders.find((x) => x.code === '5037565').payStatus, 'due');
});

test('roles: a recruiter can edit candidates but not pay or change settings', () => {
  const { env, temp } = ready();
  const token = ownerToken(env, temp);
  const add = env.api('adminTeam', { token, action: 'add', username: 'sara', name: 'سارة', role: 'recruiter' });
  assert.equal(add.ok, true, add.error);
  const s = env.api('adminLogin', { username: 'sara', password: add.data.temp }).data.token;
  assert.equal(env.api('adminUpdateApplicants', { token: s, items: [{ row: 2 }], status: 'تم التواصل' }).ok, true);
  assert.match(env.api('adminRecordPayout', { token: s, code: '5037565', amount: 100, method: 'كاش' }).error, /صلاحياتك/);
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
