// Read-only HTTP tests. No connection to the real database is made.
const { test } = require('node:test');
const assert = require('node:assert/strict');
Object.assign(process.env, { DATABASE_URL: 'postgresql://test:test@localhost/test', JWT_SECRET: 'isolated-admin-list-test-secret', SMTP_HOST: 'localhost', SMTP_USER: 'test', SMTP_PASS: 'test', SMTP_FROM: 'test@example.com' });
const rows = [
  { id: 'assigned', status: 'ASSIGNED', assignedVerifierId: 'verifier-a', wasFlagged: false, submittedAt: '2026-01-01' },
  { id: 'review', status: 'UNDER_REVIEW', assignedVerifierId: 'verifier-b', wasFlagged: false, submittedAt: '2026-01-02' },
  { id: 'returned', status: 'RETURNED_FOR_REVIEW', assignedVerifierId: 'verifier-a', wasFlagged: true, submittedAt: '2026-01-03' },
  { id: 'approved', status: 'APPROVED', assignedVerifierId: 'verifier-a', wasFlagged: true, submittedAt: '2026-01-04' },
  { id: 'rejected', status: 'REJECTED', assignedVerifierId: 'verifier-b', wasFlagged: true, submittedAt: '2026-01-05' },
  { id: 'confirmed', status: 'ADMIN_CONFIRMED', assignedVerifierId: 'verifier-b', wasFlagged: true, submittedAt: '2026-01-06' },
  { id: 'flagged', status: 'FLAGGED', assignedVerifierId: 'verifier-a', wasFlagged: true, submittedAt: '2026-01-07' },
].map(row => ({ ...row, district: 'Colombo', applicant: { name: 'Fixture applicant' }, assignedVerifier: { name: row.assignedVerifierId } }));
const before = JSON.stringify(rows);
const matches = (row, where) => Object.entries(where).every(([key, value]) => row[key] === value);
const prisma = { verificationRequest: {
  findMany: async ({ where = {}, include, orderBy, select }) => {
    if (select) return rows.filter(row => matches(row, where)).map(row => ({ ...row, submittedAt: new Date(), decidedAt: new Date(), flaggedAt: row.wasFlagged ? new Date() : null }));
    assert.equal(include.applicant.select.name, true);
    assert.equal(include.assignedVerifier.select.name, true);
    return rows.filter(row => matches(row, where)).sort((a, b) => a.submittedAt.localeCompare(b.submittedAt) * (orderBy.submittedAt === 'asc' ? 1 : -1));
  },
  findFirst: async ({ where }) => rows.find(row => matches(row, where)) || null,
}, verifierApplication: {
  findUnique: async ({ where }) => where.id === 'missing' ? null : { applicantId: 'verifier-a' },
  findFirst: async () => ({ district: 'Colombo', status: 'APPROVED', isAvailable: true }),
} };
require.cache[require.resolve('../dist/config/db')] = { exports: { prisma, neonSql: () => { throw new Error('No writes permitted in list tests'); } } };
// Every token in these tests belongs to an active account; the fake database has no user table to check.
require('../dist/services/accountStatus.service').getAccountStatus = async () => ({ isDisabled: false, disabledReason: null });
const { app } = require('../dist/app');
const { signToken } = require('../dist/utils/jwt');

test('Admin lists reuse existing data and preserve verifier scoping', async () => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const get = (url, role = 'admin', userId = 'admin') => fetch(base + url, { headers: role ? { Authorization: `Bearer ${signToken({ userId, role })}` } : {} });
  try {
    for (const status of ['ASSIGNED', 'UNDER_REVIEW', 'RETURNED_FOR_REVIEW']) {
      const response = await get(`/admin/verification-work/requests?status=${status}`);
      assert.equal(response.status, 200);
      const { requests } = await response.json();
      assert.equal(requests.length, 1); assert.equal(requests[0].status, status);
      assert.equal(requests[0].applicant.name, 'Fixture applicant');
    }
    for (const tab of ['APPROVED', 'REJECTED']) {
      const { requests } = await (await get(`/admin/verification-work/history?tab=${tab}`)).json();
      assert.deepEqual(requests.map(row => row.status), [tab]);
    }
    const { requests: flagged } = await (await get('/admin/verification-work/history?tab=FLAGGED')).json();
    assert.deepEqual(flagged.map(row => row.id), ['flagged', 'confirmed', 'rejected', 'approved', 'returned']);
    assert.equal((await get('/admin/verification-work/history?tab=INVALID')).status, 400);
    assert.equal((await get('/admin/verification-work/requests?status=INVALID')).status, 400);
    for (const url of ['/admin/verification-work/requests?status=ASSIGNED', '/admin/verification-work/history?tab=FLAGGED']) {
      assert.equal((await get(url, null)).status, 401);
      assert.equal((await get(url, 'verifier', 'verifier-a')).status, 403);
      assert.equal((await get(url, 'jobseeker', 'applicant')).status, 403);
    }
    const { requests: own } = await (await get('/verifier/work/history?tab=FLAGGED', 'verifier', 'verifier-a')).json();
    assert.deepEqual(own.map(row => row.id), ['flagged', 'approved', 'returned']);
    const { requests: queue } = await (await get('/verifier/work/requests?status=UNDER_REVIEW', 'verifier', 'verifier-a')).json();
    assert.deepEqual(queue, []);
    assert.equal((await get('/admin/verification-work/requests/review')).status, 200);
    assert.equal((await get('/verifier/work/requests/review', 'verifier', 'verifier-a')).status, 404);
    const overview = (await (await get('/admin/verification-work/overview')).json()).overview;
    assert.deepEqual(overview, { requestsToday: 7, approvedToday: 1, rejectedToday: 1, flaggedToday: 5, awaitingReview: 1, underReview: 1 });
    const statistics = (await (await get('/admin/verification-work/verifiers/application/statistics')).json()).statistics;
    assert.deepEqual(statistics, { assigned: 4, approved: 1, rejected: 0, flagged: 3 });
    assert.equal((await get('/admin/verification-work/verifiers/missing/statistics')).status, 404);
    const dashboard = (await (await get('/verifier/work/dashboard', 'verifier', 'verifier-a')).json()).dashboard;
    assert.deepEqual(dashboard.queues, { awaiting: 1, underReview: 0, returned: 1 });
    assert.deepEqual(dashboard.today, { assigned: 4, approved: 1, rejected: 0, flagged: 3 });
    assert.deepEqual(dashboard.allTime, { assigned: 4, approved: 1, rejected: 0, flagged: 3 });
    assert.equal((await get('/admin/verification-work/flagged')).status, 200);
    assert.equal((await get('/admin/verification-work/requests/missing')).status, 404);
    assert.equal(JSON.stringify(rows), before, 'Read endpoints must not mutate records');
  } finally { await new Promise(resolve => server.close(resolve)); }
});
