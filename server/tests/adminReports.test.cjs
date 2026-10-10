// Read-only HTTP tests. The database is an isolated in-memory fixture; no real connection is made.
const { test } = require('node:test');
const assert = require('node:assert/strict');
Object.assign(process.env, { DATABASE_URL: 'postgresql://test:test@localhost/test', JWT_SECRET: 'isolated-admin-report-test-secret', SMTP_HOST: 'localhost', SMTP_USER: 'test', SMTP_PASS: 'test', SMTP_FROM: 'test@example.com' });

const daysAgo = days => new Date(Date.now() - days * 86_400_000);
const retail = { id: 'retail', name: 'Retail' };
const delivery = { id: 'delivery', name: 'Delivery' };
const shopA = { id: 'shop-a', name: 'Kamala Stores' };
const shopB = { id: 'shop-b', name: 'Perera Traders' };
const nimal = { id: 'seeker-1', name: 'Nimal Perera' };
const sunil = { id: 'seeker-2', name: 'Sunil Silva' };
const gig = (id, category, business, status, days, location, isDeleted = false) => ({ id, categoryId: category.id, category, business, status, location, isDeleted, createdAt: daysAgo(days) });
const gigs = [
  gig('g1', retail, shopA, 'ACTIVE', 1, 'Colombo'),
  gig('g2', retail, shopA, 'PENDING', 3, 'colombo '),
  gig('g3', delivery, shopB, 'REJECTED', 20, 'Kandy'),
  gig('g4', delivery, shopB, 'COMPLETED', 60, 'Kandy'),
  gig('g5', retail, shopA, 'ACTIVE', 400, 'Galle'),
  gig('deleted', retail, shopA, 'PENDING', 1, 'Colombo', true),
];
const application = (gigPost, applicant, status, days) => ({ gigPost, applicant, status, createdAt: daysAgo(days) });
const fixtures = {
  gigPost: gigs,
  application: [
    application(gigs[0], nimal, 'HIRED', 1),
    application(gigs[0], sunil, 'PENDING', 2),
    application(gigs[2], nimal, 'REJECTED', 15),
    application(gigs[3], nimal, 'COMPLETED', 50),
  ],
  user: [
    { role: 'jobseeker', createdAt: daysAgo(2) },
    { role: 'jobseeker', createdAt: daysAgo(200) },
    { role: 'jobseeker', createdAt: daysAgo(200) },
    { role: 'shopowner', createdAt: daysAgo(10) },
    { role: 'shopowner', createdAt: daysAgo(100) },
    { role: 'verifier', createdAt: daysAgo(40) },
    { role: 'admin', createdAt: daysAgo(1) },
  ],
  review: [
    { rating: 5, status: 'PUBLISHED', createdAt: daysAgo(5) },
    { rating: 2, status: 'FLAGGED', createdAt: daysAgo(45) },
  ],
  reviewReport: [{ status: 'PENDING' }, { status: 'PENDING' }, { status: 'RESOLVED' }],
  verifierApplication: [{ status: 'PENDING' }, { status: 'SUSPENDED' }, { status: 'APPROVED' }],
  verificationRequest: [{ status: 'ADMIN_REVIEW' }, { status: 'FLAGGED' }, { status: 'PENDING' }, { status: 'APPROVED' }],
  verifierReactivationRequest: [{ status: 'PENDING' }],
  notification: [{ emailStatus: 'FAILED' }, { emailStatus: 'FAILED' }, { emailStatus: 'SENT' }],
};
const before = JSON.stringify(fixtures);
let empty = false;
function matches(row, where = {}) {
  return Object.entries(where).every(([key, value]) => {
    if (value === undefined) return true;
    if (value && typeof value === 'object' && !(value instanceof Date)) {
      if ('gte' in value) return row[key] >= value.gte;
      if ('in' in value) return value.in.includes(row[key]);
      return matches(row[key], value);
    }
    return row[key] === value;
  });
}
const prisma = Object.fromEntries(Object.entries(fixtures).map(([name, rows]) => {
  const select = where => (empty ? [] : rows.filter(row => matches(row, where)));
  return [name, { findMany: async ({ where }) => select(where), count: async ({ where }) => select(where).length }];
}));
require.cache[require.resolve('../dist/config/db')] = { exports: { prisma, neonSql: () => { throw new Error('No writes permitted in report tests'); } } };
const { app } = require('../dist/app');
const { signToken } = require('../dist/utils/jwt');
const { buildTrend, rangeStart } = require('../dist/services/adminReport.service');

const count = (items, key) => items.find(item => item.key === key).count;
const sum = points => points.reduce((total, point) => total + point.count, 0);

test('admin report summary', async t => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/admin/reports/summary`;
  const get = (query = '', role = 'admin') => fetch(base + query, { headers: role ? { Authorization: `Bearer ${signToken({ userId: 'user', role })}` } : {} });
  const report = async query => {
    const response = await get(query);
    assert.equal(response.status, 200);
    return (await response.json()).report;
  };
  t.beforeEach(() => { empty = false; });

  try {
    // ---------- Positive: a valid admin request returns the right numbers ----------
    await t.test('positive: last 30 days summarises gigs, applications and customers', async () => {
      const { range, overview, gigs: gigReport, applications, customers } = await report('?range=30d');
      assert.equal(range, '30d');
      assert.deepEqual(overview, { gigsPosted: 3, newCustomers: 2, applications: 3, completedGigs: 0, approvalRate: 50, hireRate: 33, reviews: 1, averageRating: 5 });
      assert.deepEqual(gigReport.byStatus.map(item => [item.key, item.count]), [['PENDING', 1], ['ACTIVE', 1], ['COMPLETED', 0], ['CLOSED', 0], ['REJECTED', 1]]);
      assert.deepEqual(gigReport.byCategory.map(item => [item.label, item.count]), [['Retail', 2], ['Delivery', 1]]);
      assert.deepEqual(gigReport.topLocations.map(item => [item.label, item.count]), [['Colombo', 2], ['Kandy', 1]]);
      assert.equal(applications.total, 3);
      assert.equal(count(applications.byStatus, 'HIRED'), 1);
      assert.equal(customers.total, 6);
      assert.equal(customers.newInRange, 2);
      assert.deepEqual(customers.byRole.map(item => [item.key, item.count]), [['jobseeker', 3], ['shopowner', 2], ['verifier', 1]]);
      assert.deepEqual(customers.topBusinesses.map(item => [item.label, item.count]), [['Kamala Stores', 2], ['Perera Traders', 1]]);
      assert.deepEqual(customers.topApplicants.map(item => [item.label, item.count]), [['Nimal Perera', 2], ['Sunil Silva', 1]]);
    });

    await t.test('positive: the range defaults to 30 days', async () => {
      assert.equal((await report('')).range, '30d');
    });

    await t.test('positive: each range filters by date and has its own trend columns', async () => {
      const expected = { '7d': [2, 7, 2], '30d': [3, 6, 3], '90d': [4, 9, 4], all: [5, 12, 4] };
      for (const [range, [total, columns, inTrend]] of Object.entries(expected)) {
        const { gigs: gigReport, from } = await report(`?range=${range}`);
        assert.equal(gigReport.total, total, `${range} total`);
        assert.equal(gigReport.trend.length, columns, `${range} columns`);
        assert.equal(sum(gigReport.trend), inTrend, `${range} trend sum`);
        assert.equal(from === null, range === 'all');
      }
    });

    await t.test('positive: all time counts every gig and excludes deleted ones', async () => {
      const { overview, customers } = await report('?range=all');
      assert.equal(overview.gigsPosted, 5);
      assert.equal(overview.completedGigs, 1);
      assert.equal(overview.approvalRate, 75);
      assert.equal(overview.averageRating, 3.5);
      assert.equal(customers.newInRange, customers.total);
    });

    await t.test('positive: category filter narrows gigs and applications', async () => {
      const { gigs: gigReport, applications, customers, filters } = await report('?range=all&categoryId=delivery');
      assert.equal(filters.categoryId, 'delivery');
      assert.equal(gigReport.total, 2);
      assert.deepEqual(gigReport.byCategory.map(item => item.label), ['Delivery']);
      assert.equal(applications.total, 2);
      assert.deepEqual(customers.topBusinesses.map(item => item.label), ['Perera Traders']);
      assert.equal(customers.total, 6, 'customer totals are not affected by the category');
    });

    await t.test('positive: customer type filter narrows customers', async () => {
      for (const [role, total] of [['jobseeker', 3], ['shopowner', 2], ['verifier', 1]]) {
        const { customers, gigs: gigReport } = await report(`?range=all&role=${role}`);
        assert.equal(customers.total, total);
        assert.deepEqual(customers.byRole.map(item => item.key), [role]);
        assert.equal(gigReport.total, 5, 'gig totals are not affected by the customer type');
      }
    });

    await t.test('positive: monitoring shows the current backlog whatever the range', async () => {
      for (const range of ['7d', 'all']) {
        const { monitoring } = await report(`?range=${range}`);
        assert.deepEqual(Object.fromEntries(monitoring.map(item => [item.key, item.count])), {
          pendingGigs: 1, pendingReports: 2, flaggedReviews: 1, pendingVerifierApplications: 1, verificationCasesForAdmin: 2,
          unassignedVerificationRequests: 1, pendingReactivationRequests: 1, suspendedVerifiers: 1, failedEmails: 2,
        });
        for (const item of monitoring) assert.ok(item.label && item.hint);
      }
    });

    await t.test('positive: admins are never counted as customers', async () => {
      const { customers } = await report('?range=all');
      assert.equal(customers.byRole.some(item => item.key === 'admin'), false);
    });

    // ---------- Negative: bad callers and bad input are refused, odd data is handled ----------
    await t.test('negative: a request without a token is rejected', async () => {
      assert.equal((await get('?range=30d', null)).status, 401);
    });

    for (const role of ['jobseeker', 'shopowner', 'verifier']) {
      await t.test(`negative: a ${role} cannot read the report`, async () => {
        assert.equal((await get('?range=30d', role)).status, 403);
      });
    }

    for (const range of ['1y', '30', 'ALL', '30d;drop']) {
      await t.test(`negative: range "${range}" is rejected`, async () => {
        const response = await get(`?range=${encodeURIComponent(range)}`);
        assert.equal(response.status, 400);
        assert.match((await response.json()).error, /range must be one of/);
      });
    }

    for (const role of ['admin', 'customer', 'JOBSEEKER']) {
      await t.test(`negative: customer type "${role}" is rejected`, async () => {
        const response = await get(`?role=${role}`);
        assert.equal(response.status, 400);
        assert.match((await response.json()).error, /role must be one of/);
      });
    }

    await t.test('negative: an unknown category returns zeros, not an error', async () => {
      const { overview, gigs: gigReport, applications } = await report('?range=all&categoryId=does-not-exist');
      assert.equal(gigReport.total, 0);
      assert.equal(applications.total, 0);
      assert.equal(overview.approvalRate, null);
      assert.equal(overview.hireRate, null);
      assert.deepEqual(gigReport.byCategory, []);
      assert.equal(sum(gigReport.byStatus), 0);
    });

    await t.test('negative: an empty database returns zeros and no rates', async () => {
      empty = true;
      const { overview, gigs: gigReport, customers, monitoring } = await report('?range=30d');
      assert.deepEqual(overview, { gigsPosted: 0, newCustomers: 0, applications: 0, completedGigs: 0, approvalRate: null, hireRate: null, reviews: 0, averageRating: null });
      assert.equal(gigReport.trend.length, 6);
      assert.equal(sum(gigReport.trend), 0);
      assert.equal(sum(customers.byRole), 0);
      assert.equal(sum(monitoring), 0);
    });

    await t.test('negative: dates outside the window are left out of the trend', () => {
      const now = new Date('2026-10-11T06:00:00.000Z');
      const dates = [new Date('2026-10-11T05:00:00.000Z'), new Date('2026-10-04T12:00:00.000Z'), new Date('2027-01-01T00:00:00.000Z')];
      const trend = buildTrend(dates, '7d', now);
      assert.deepEqual(trend.map(point => point.label), ['5 Oct', '6 Oct', '7 Oct', '8 Oct', '9 Oct', '10 Oct', '11 Oct']);
      assert.deepEqual(trend.map(point => point.count), [0, 0, 0, 0, 0, 0, 1]);
      // The window starts at local (UTC+5:30) midnight of its first day.
      assert.equal(rangeStart('7d', now).toISOString(), '2026-10-04T18:30:00.000Z');
      assert.equal(rangeStart('all', now), null);
    });

    assert.equal(JSON.stringify(fixtures), before, 'The report must not change any records');
  } finally { await new Promise(resolve => server.close(resolve)); }
});
