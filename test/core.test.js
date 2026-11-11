const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../src/Core.js');

const D = (y, m, d) => new Date(y, m - 1, d);
const ymd = (d) => d && `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/* ── Dates ── */

test('parses the formats seen in the sheet', () => {
  const today = D(2026, 11, 11);
  assert.equal(ymd(C.parseSheetDate('2026-11-08', { today })), '2026-11-08');
  assert.equal(ymd(C.parseSheetDate('8-Nov', { today })), '2026-11-08');
  assert.equal(ymd(C.parseSheetDate('31-Oct', { today })), '2026-10-31');
  assert.equal(ymd(C.parseSheetDate('11/4/2026 17:25:30', { today })), '2026-11-04');
  assert.equal(ymd(C.parseSheetDate('10/30/2026 22:47:23', { today })), '2026-10-30');
  assert.equal(ymd(C.parseSheetDate(D(2026, 11, 8))), '2026-11-08');
  assert.equal(C.parseSheetDate('', { today }), null);
  assert.equal(C.parseSheetDate('#REF!', { today }), null);
  assert.equal(C.parseSheetDate('31-Feb-2026', { today }), null);
});

test('January bug: yearless dates roll into the new year correctly', () => {
  const jan5 = D(2027, 1, 5);
  assert.equal(ymd(C.parseSheetDate('1-Jan', { today: jan5 })), '2027-01-01');
  assert.equal(ymd(C.parseSheetDate('31-Dec', { today: jan5 })), '2026-12-31');
  assert.equal(ymd(C.parseSheetDate('8-Nov', { today: jan5 })), '2026-11-08');
});

/* ── Bonus window: two calendar months ── */

test('bonus window is two calendar months', () => {
  assert.equal(ymd(C.lastBonusDay(D(2026, 11, 8), 2)), '2027-01-07');
  assert.equal(ymd(C.lastBonusDay(D(2026, 11, 1), 2)), '2026-12-31');
  assert.equal(ymd(C.lastBonusDay(D(2026, 12, 31), 2)), '2027-02-28');
  assert.equal(ymd(C.lastBonusDay(D(2027, 12, 31), 2)), '2028-02-29'); // leap year
});

/* ── Tiers (poster) ── */

test('tiers match the poster exactly', () => {
  const poster = [[250, 600], [300, 800], [350, 1000], [400, 1200], [450, 1400], [500, 1600], [550, 1800],
    [600, 2000], [650, 2200], [700, 2400], [750, 2600], [800, 2800], [850, 3000]];
  assert.deepEqual(C.DEFAULT_TIERS.map((t) => [t.orders, t.bonus]), poster);
  assert.equal(C.tierFor(249, C.DEFAULT_TIERS).bonus, 0);
  assert.equal(C.tierFor(250, C.DEFAULT_TIERS).bonus, 600);
  assert.equal(C.tierFor(299, C.DEFAULT_TIERS).bonus, 600);
  assert.equal(C.tierFor(5000, C.DEFAULT_TIERS).bonus, 3000);
});

/* ── Referral evaluation ── */

const hire = D(2026, 11, 8);
const daily = (from, n, perDay) => Array.from({ length: n }, (_, i) => ({ date: C.addDays(from, i), orders: perDay }));

test('active referral: progress toward next tier', () => {
  const r = C.evaluateReferral({ hireDate: hire, dailyOrders: daily(hire, 20, 16), today: D(2026, 11, 28) });
  assert.equal(r.orders, 320);
  assert.equal(r.bonus, 800);
  assert.equal(r.nextTier.orders, 350);
  assert.equal(r.ordersToNext, 30);
  assert.equal(r.state, 'active');
  assert.equal(r.daysLeft, 40); // 28 Nov → 7 Jan
});

test('old bug: bonus earned inside the window is kept after it ends', () => {
  const r = C.evaluateReferral({ hireDate: hire, dailyOrders: daily(hire, 40, 13), today: D(2027, 2, 1) });
  assert.equal(r.orders, 520);
  assert.equal(r.bonus, 1600); // old code showed 0 here
  assert.equal(r.state, 'closed');
  assert.equal(ymd(r.payoutDate), '2027-01-08');
});

test('old bug: orders after the window never count', () => {
  const inside = daily(hire, 61, 3);              // 8 Nov → 7 Jan: 183 orders
  const after = daily(D(2027, 1, 8), 100, 20);     // 2000 orders, too late
  const r = C.evaluateReferral({ hireDate: hire, dailyOrders: inside.concat(after), today: D(2027, 6, 1) });
  assert.equal(r.orders, 183);
  assert.equal(r.bonus, 0);
});

test('reaching 850 closes the bonus early with payout on that day', () => {
  const r = C.evaluateReferral({ hireDate: hire, dailyOrders: daily(hire, 30, 30), today: D(2026, 12, 20) });
  assert.equal(r.state, 'maxed');
  assert.equal(r.bonus, 3000);
  assert.equal(ymd(r.maxReachedOn), '2026-12-06'); // 29th day: 870 orders
  assert.equal(ymd(r.payoutDate), '2026-12-06');
});

test('last counting day is still active, the next day is closed', () => {
  const base = { hireDate: hire, dailyOrders: [] };
  assert.equal(C.evaluateReferral({ ...base, today: D(2027, 1, 7) }).state, 'active');
  assert.equal(C.evaluateReferral({ ...base, today: D(2027, 1, 7) }).daysLeft, 0);
  assert.equal(C.evaluateReferral({ ...base, today: D(2027, 1, 8) }).state, 'closed');
});

test('simulator uses the same tiers', () => {
  assert.deepEqual(C.simulateBonus(3, 400), { perRider: 1200, total: 3600 });
  assert.deepEqual(C.simulateBonus(2, 1000), { perRider: 3000, total: 6000 });
});

/* ── Identity ── */

test('phone numbers in every shape seen in the sheet', () => {
  for (const raw of ['01148005931', 1148005931, '+201148005931', 201148005931, '00201148005931', '0114 800 5931']) {
    assert.equal(C.canonicalPhone(raw), '01148005931', String(raw));
  }
  assert.equal(C.canonicalPhone('01348005931'), null); // no 013 network
  assert.equal(C.canonicalPhone('#REF!'), null);
  assert.equal(C.internationalPhone('01148005931'), '201148005931');
});

test('national ID validation reads birth date and governorate', () => {
  const n = C.parseNationalId(28806052100496);
  assert.equal(ymd(n.birthDate), '1988-06-05');
  assert.equal(n.governorate, 'الجيزة');
  assert.equal(C.parseNationalId('29913451100000'), null); // month 13
  assert.equal(C.parseNationalId('28806059900496'), null); // governorate 99
  assert.equal(C.parseNationalId('1880605210049'), null);
});

/* ── Duplicates: "new to Full Speed" ── */

test('duplicate detection across every tab', () => {
  const index = C.buildIdentityIndex([
    { source: 'Headcount', phone: 201066768975, label: '2169208' },
    { source: 'Normal Riders Handle', phone: '+201151307016', label: '5037565' },
    { source: 'New Applicants', phone: 1148005931, nationalId: 28806052100496, label: 'رضا' }
  ]);
  assert.equal(C.findDuplicates({ phone: '01066768975' }, index)[0].source, 'Headcount');
  assert.equal(C.findDuplicates({ phone: '01151307016' }, index)[0].source, 'Normal Riders Handle');
  assert.equal(C.findDuplicates({ phone: '01000000000', nationalId: '28806052100496' }, index)[0].field, 'nationalId');
  assert.equal(C.findDuplicates({ phone: '01000000000', nationalId: '30001010100015' }, index).length, 0);
});
