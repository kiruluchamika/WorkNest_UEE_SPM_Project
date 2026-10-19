// Real HTTP middleware/controllers; all persistence is stubbed before app import.
const { test } = require('node:test');
const assert = require('node:assert/strict');
Object.assign(process.env, { DATABASE_URL: 'postgresql://test:test@localhost/test', JWT_SECRET: 'isolated-application-test-secret', SMTP_HOST: 'localhost', SMTP_USER: 'test', SMTP_PASS: 'test', SMTP_FROM: 'test@example.com' });
let application = { id: 'application', applicantId: 'verifier', status: 'PENDING' };
let pending = { id: 'reactivation', status: 'PENDING' };
let activeEvent = { id: 'suspension' };
let writes = [], affected = true, writeError;
const prisma = {
  verifierApplication: {
    findFirst: async ({ where }) => application && (!where.status || where.status === application.status) ? application : null,
    findUnique: async () => application,
    findMany: async () => application ? [application] : [],
  },
  verifierSuspensionEvent: { findFirst: async () => activeEvent },
  verifierReactivationRequest: { findFirst: async () => pending, findUnique: async () => pending },
};
const neonSql = async (parts, ...values) => {
  writes.push({ sql: parts.join('?'), values });
  if (writeError) throw writeError;
  return affected ? [{ id: 'fixture' }] : [];
};
require.cache[require.resolve('../dist/config/db')] = { exports: { prisma, neonSql } };
// Every token in these tests belongs to an active account; the fake database has no user table to check.
require('../dist/services/accountStatus.service').getAccountStatus = async () => ({ isDisabled: false, disabledReason: null });
const { app } = require('../dist/app');
const { signToken } = require('../dist/utils/jwt');

test('verifier administration, reapplication and reactivation preserve their existing guards', async t => {
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = (url, role = 'admin', body, method = body ? 'PATCH' : 'GET') => fetch(base + url, {
    method, headers: { 'Content-Type': 'application/json', ...(role ? { Authorization: `Bearer ${signToken({ userId: role, role })}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  try {
    await t.test('application lists, details, latest and approval history reject unauthorized access', async () => {
      for (const status of ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED']) {
        assert.equal((await call('/admin/verifier-applications?status=' + status)).status, 200);
      }
      assert.equal((await call('/admin/verifier-applications?status=INVALID')).status, 400);
      assert.equal((await call('/admin/verifier-applications/application')).status, 200);
      assert.equal((await call('/verifier/applications/latest', 'verifier')).status, 200);
      for (const role of [null, 'jobseeker', 'verifier']) assert.equal((await call('/admin/verifier-applications', role)).status, role ? 403 : 401);
      application = null;
      assert.equal((await call('/admin/verifier-applications/missing')).status, 404);
      assert.equal((await call('/verifier/applications/latest', 'verifier')).status, 404);
    });
    await t.test('approve, reject and suspend enforce conditional SQL and required reasons', async () => {
      application = { id: 'application', status: 'PENDING' };
      for (const [action, guard] of [['approve', 'PENDING'], ['reject', 'PENDING'], ['suspend', 'APPROVED']]) {
        const url = '/admin/verifier-applications/application/' + action;
        affected = true;
        assert.equal((await call(url, 'admin', { reason: 'A meaningful reason' })).status, 200);
        assert.match(writes.at(-1).sql, new RegExp('AND "status" = \'' + guard + '\''));
        if (action === 'suspend') assert.match(writes.at(-1).sql, /INSERT INTO "VerifierSuspensionEvent"/);
        affected = false;
        assert.equal((await call(url, 'admin', { reason: 'A meaningful reason' })).status, 409);
        if (action !== 'approve') assert.equal((await call(url, 'admin', { reason: ' ' })).status, 400);
        assert.equal((await call(url, 'verifier', { reason: 'A meaningful reason' })).status, 403);
      }
    });
    await t.test('approval acknowledgement is scoped to owner and approved state', async () => {
      affected = true; application = { id: 'application', status: 'APPROVED' };
      assert.equal((await call('/verifier/applications/application/acknowledge-approval', 'verifier', {})).status, 200);
      assert.match(writes.at(-1).sql, /"applicantId" = \?/);
      assert.match(writes.at(-1).sql, /COALESCE/);
      application = { id: 'application', status: 'REJECTED' };
      assert.equal((await call('/verifier/applications/application/acknowledge-approval', 'verifier', {})).status, 409);
    });
    await t.test('reapplication is allowed only after rejection, preserving optional documents', async () => {
      const body = { district: 'Colombo', identityType: 'NATIONAL_ID', identityNumber: '1234', addressInformation: 'Test address' };
      const submit = () => call('/verifier/applications', 'verifier', body, 'POST');
      for (const status of ['PENDING', 'APPROVED', 'SUSPENDED']) {
        application = { id: 'application', status }; assert.equal((await submit()).status, 409);
      }
      application = null; assert.equal((await submit()).status, 409);
      application = { id: 'application', status: 'REJECTED' }; affected = true;
      assert.equal((await submit()).status, 201);
      assert.match(writes.at(-1).sql, /WHERE NOT EXISTS/);
      affected = false; assert.equal((await submit()).status, 409);
      writeError = { code: '23505' }; assert.equal((await submit()).status, 409); writeError = undefined;
    });
    await t.test('reactivation submission and latest use active suspension and reject duplicates', async () => {
      affected = true;
      const submit = () => call('/verifier/applications/reactivation-request', 'verifier', { explanation: 'Please restore my verifier access' }, 'POST');
      application = { id: 'application', status: 'APPROVED' }; assert.equal((await submit()).status, 409);
      application = { id: 'application', status: 'SUSPENDED' };
      assert.equal((await submit()).status, 201);
      assert.match(writes.at(-1).sql, /"reactivatedAt" IS NULL/);
      affected = false; assert.equal((await submit()).status, 409);
      writeError = { code: '23505' }; assert.equal((await submit()).status, 409); writeError = undefined;
      assert.equal((await call('/verifier/applications/reactivation-request', 'verifier', { explanation: ' ' }, 'POST')).status, 400);
      assert.deepEqual((await (await call('/verifier/applications/reactivation-request/latest', 'verifier')).json()).request, pending);
      activeEvent = null;
      assert.equal((await (await call('/verifier/applications/reactivation-request/latest', 'verifier')).json()).request, null);
    });
    await t.test('Admin reactivation approval/rejection retain atomic status and suspension guards', async () => {
      for (const action of ['approve', 'reject']) {
        const url = '/admin/verifier-applications/reactivation-requests/reactivation/' + action;
        affected = true;
        assert.equal((await call(url, 'admin', { reason: 'A meaningful review reason' })).status, 200);
        assert.match(writes.at(-1).sql, /'PENDING'::"VerifierReactivationRequestStatus"/);
        if (action === 'approve') {
          assert.match(writes.at(-1).sql, /'SUSPENDED'::"VerifierApplicationStatus"/);
          assert.match(writes.at(-1).sql, /UPDATE "VerifierSuspensionEvent"/);
        }
        affected = false; assert.equal((await call(url, 'admin', { reason: 'A meaningful review reason' })).status, 409);
        assert.equal((await call(url, 'verifier', { reason: 'A meaningful review reason' })).status, 403);
      }
    });
  } finally { await new Promise(resolve => server.close(resolve)); }
});
