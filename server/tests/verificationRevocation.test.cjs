// HTTP/controller tests with isolated in-memory persistence. Never connects to PostgreSQL.
const { test } = require('node:test');
const assert = require('node:assert/strict');
Object.assign(process.env, { DATABASE_URL: 'postgresql://test:test@localhost/test', JWT_SECRET: 'isolated-revocation-test-secret', SMTP_HOST: 'localhost', SMTP_USER: 'test', SMTP_PASS: 'test', SMTP_FROM: 'test@example.com' });
const requests = []; const audits = []; let sequence = 0; let assignments = 0;
let verifierAvailable = true;
const include = row => row && ({ ...row, applicant: { id: row.applicantId, name: row.applicantId }, badgeRevocation: audits.find(a => a.verificationRequestId === row.id) || null, revocation: audits.find(a => a.id === row.revocationId) || null });
const matches = (row, where) => Object.entries(where).every(([key, value]) => value && typeof value === 'object' && 'in' in value ? value.in.includes(row[key]) : row[key] === value);
const prisma = {
  verificationRequest: {
    findFirst: async ({ where }) => include([...requests].reverse().find(row => matches(row, where))) || null,
    findUnique: async ({ where }) => include(requests.find(row => row.id === where.id)),
    findMany: async ({ where }) => requests.filter(row => matches(row, where)).reverse().map(include),
    create: async ({ data, include: relations }) => {
      assert.equal(relations, undefined, 'Relation reads during create require an unsupported HTTP transaction');
      const row = { ...data, id: `request-${++sequence}`, assignedVerifierId: null, submittedAt: new Date().toISOString() };
      requests.push(row); return row;
    },
    updateMany: async () => { throw new Error('Transactions are not supported in HTTP mode'); },
  },
  verificationRevocation: {
    findFirst: async ({ where }) => [...audits].reverse().find(a => requests.find(r => r.id === a.verificationRequestId)?.applicantId === where.verificationRequest.applicantId) || null,
    findUnique: async ({ where }) => audits.find(a => a.id === where.id),
    findMany: async () => audits.map(a => ({ ...a, verificationRequest: include(requests.find(r => r.id === a.verificationRequestId)), revokedBy: { id: a.revokedById, name: 'Admin' } })),
  },
  user: {
    findFirst: async ({ where }) => ({ id: where.id, name: where.id, role: 'jobseeker' }),
    findMany: async () => [...new Set(requests.map(r => r.applicantId))].map(id => ({ id, submittedVerificationRequests: [include([...requests].reverse().find(r => r.applicantId === id))] })),
  },
};
function neonSql(parts, ...values) {
  const sql = parts.join('?');
  if (sql.includes("\"gateStatus\"='DENIED'")) {
    assert.match(sql, /"status"='ADMIN_REVIEW'/);
    assert.match(sql, /"gateStatus"='PENDING'/);
    assert.match(sql, /"assignedVerifierId" IS NULL/);
    const [reason, admin, reviewedAt, id] = values;
    const row = requests.find(r => r.id === id && r.status === 'ADMIN_REVIEW' && r.gateStatus === 'PENDING' && r.assignedVerifierId === null);
    if (!row) return [];
    Object.assign(row, { status: 'ADMIN_DENIED', gateStatus: 'DENIED', gateReason: reason, gateReviewerId: admin, gateReviewedAt: reviewedAt });
    return [{ id }];
  }
  if (sql.includes('INSERT INTO "VerificationRevocation"')) {
    const [requestId, id, reason, admin] = values;
    const row = requests.find(r => r.id === requestId);
    if (!row || !['APPROVED', 'ADMIN_CONFIRMED'].includes(row.status) || audits.some(a => a.verificationRequestId === requestId)) return [];
    audits.push({ id, verificationRequestId: requestId, reason, revokedById: admin, revokedAt: new Date().toISOString() }); return [{ id }];
  }
  if (sql.includes('WITH gate AS')) {
    assert.match(sql, /FOR UPDATE/);
    assert.match(sql, /application\."isAvailable"=true/);
    assert.match(sql, /LOWER\(application\."district"\)=LOWER\(gate\."district"\)/);
    assert.match(sql, /"lastAssignedAt" ASC NULLS FIRST, application\."submittedAt" ASC/);
    const row = requests.find(r => r.id === values[0] && r.status === 'ADMIN_REVIEW' && r.gateStatus === 'PENDING');
    if (!row) return [];
    Object.assign(row, { status: verifierAvailable ? 'ASSIGNED' : 'PENDING', assignedVerifierId: verifierAvailable ? 'verifier' : null, gateStatus: 'ALLOWED' });
    if (verifierAvailable) assignments++;
    return [{ id: row.id, status: row.status }];
  }
  if (sql.includes('INSERT INTO "VerificationRequest"')) {
    const [district, now, id, applicantId, requestDistrict, personalInformation, identityDocument, supportingEvidence, communityReferences] = values;
    requests.push({ id, applicantId, district: requestDistrict, personalInformation, identityDocument, supportingEvidence, communityReferences, status: 'ASSIGNED', assignedVerifierId: 'verifier', submittedAt: now }); assignments++; return [{ id }];
  }
  if (sql.includes("SET \"status\"='UNDER_REVIEW'")) {
    const row = requests.find(r => r.id === values[1] && r.assignedVerifierId === values[2] && r.status === 'ASSIGNED');
    if (!row) return []; row.status = 'UNDER_REVIEW'; return [{ id: row.id }];
  }
  if (sql.includes("SET \"status\"='FLAGGED'")) {
    const row = requests.find(r => r.id === values[3] && r.assignedVerifierId === values[4] && r.status === 'UNDER_REVIEW');
    if (!row) return []; Object.assign(row, { status: 'FLAGGED', wasFlagged: true, flagReason: values[1] }); return [{ id: row.id }];
  }
  if (sql.includes('"adminResponse"=')) {
    const row = requests.find(r => r.id === values[5] && r.status === 'FLAGGED');
    if (!row) return []; Object.assign(row, { status: values[0], adminResponse: values[1] }); return [{ id: row.id }];
  }
  if (sql.includes('"rejectionReason"=')) {
    const row = requests.find(r => r.id === values[4] && r.assignedVerifierId === values[5] && values[6].includes(r.status));
    if (!row) return []; Object.assign(row, { status: values[0], verifierNote: values[1], rejectionReason: values[2] }); return [{ id: row.id }];
  }
  throw new Error('Unexpected SQL in test');
}
require.cache[require.resolve('../dist/config/db')] = { exports: { prisma, neonSql } };
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { app } = require('../dist/app');
const { signToken } = require('../dist/utils/jwt');

test('revocation, repeated Admin gates, restoration and unchanged ordinary review', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'worknest-validation-flow-'));
  process.env.PRIVATE_DOCUMENT_DIR = directory;
  requests.push({ id: 'original', applicantId: 'revoked-user', status: 'APPROVED', district: 'Colombo', submittedAt: '2026-01-01' });
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = (url, role, userId, body, method = body ? 'POST' : 'GET') => fetch(base + url, { method, headers: { 'Content-Type': 'application/json', ...(role ? { Authorization: `Bearer ${signToken({ userId, role })}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const admin = (url, body) => call('/admin/verification-work' + url, 'admin', 'admin', body);
  const state = async (id = 'revoked-user') => (await call('/jobseeker/verification-requests/state', 'jobseeker', id)).json();
  const payload = { district: 'Colombo', personalInformation: 'Full Name: Test\nPhone Number: 0771234567', identityDocument: 'NATIONAL_ID: 1234', identityDocumentUpload: { name: 'id.pdf', mimeType: 'application/pdf', base64: Buffer.from('%PDF-1.4\n%%EOF').toString('base64') }, communityReferences: 'Community references', gateExplanation: 'Please consider new supporting evidence.' };
  const submit = (id = 'revoked-user') => call('/jobseeker/verification-requests', 'jobseeker', id, payload);
  const review = (id, action, body = {}) => call(`/verifier/work/requests/${id}/${action}`, 'verifier', 'verifier', body, 'PATCH');
  try {
    assert.equal((await state()).verified, true);
    assert.equal((await admin('/requests/original/revoke', { reason: ' ' })).status, 400);
    for (const role of ['verifier', 'jobseeker', null]) assert.equal((await call('/admin/verification-work/requests/original/revoke', role, 'stranger', { reason: 'Not authorized' })).status, role ? 403 : 401);
    assert.equal((await admin('/requests/original/revoke', { reason: 'Identity evidence was invalid' })).status, 201);
    assert.equal((await admin('/requests/original/revoke', { reason: 'Replay' })).status, 409);
    assert.equal((await state()).verified, false); assert.equal((await state()).revocation.reason, 'Identity evidence was invalid');
    assert.equal((await state('other-user')).revocation, null);
    assert.equal((await (await admin('/revocations')).json()).revocations.length, 1);
    assert.equal((await (await admin('/verified-jobseekers')).json()).requests.length, 0);
    let result = await submit(); assert.equal(result.status, 201); let request = (await result.json()).request;
    assert.equal(request.status, 'ADMIN_REVIEW'); assert.equal(request.assignedVerifierId, null); assert.equal(assignments, 0);
    assert.equal((await submit()).status, 409);
    assert.equal((await review(request.id, 'start')).status, 409);
    for (const action of ['allow', 'deny']) assert.equal((await call(`/admin/verification-work/admin-gate/${request.id}/${action}`, 'verifier', 'verifier', { reason: 'Bypass attempt' })).status, 403);
    const gate = (await (await admin('/admin-gate')).json()).requests[0]; assert.equal(gate.revocation.reason, 'Identity evidence was invalid');
    const details = (await (await admin('/jobseekers/revoked-user')).json());
    assert.equal(details.user.id, 'revoked-user');
    assert.equal(details.requests[0].personalInformation, payload.personalInformation);
    assert.equal(details.requests[0].gateExplanation, payload.gateExplanation);
    assert.equal(details.requests[0].revocation.reason, 'Identity evidence was invalid');
    assert.equal(details.requests[1].id, 'original');
    assert.equal((await admin(`/admin-gate/${request.id}/deny`, { reason: '' })).status, 400);
    assert.equal((await admin(`/admin-gate/${request.id}/deny`, { reason: 'Insufficient new evidence' })).status, 200);
    assert.equal((await admin(`/admin-gate/${request.id}/deny`, { reason: 'Repeated denial' })).status, 409);
    assert.equal((await admin(`/admin-gate/${request.id}/allow`, {})).status, 409);
    assert.equal((await state()).verified, false);
    assert.equal((await state()).request.assignedVerifierId, null);
    assert.equal((await state()).revocation.reason, 'Identity evidence was invalid');
    assert.equal((await state()).request.status, 'ADMIN_DENIED'); assert.equal((await state()).request.gateReason, 'Insufficient new evidence'); assert.equal(assignments, 0);
    request = (await (await submit()).json()).request;
    assert.equal(request.status, 'ADMIN_REVIEW');
    assert.equal((await admin(`/admin-gate/${request.id}/allow`, {})).status, 200);
    const queue = await call('/verifier/work/requests?status=ASSIGNED', 'verifier', 'verifier');
    assert((await queue.json()).requests.some(item => item.id === request.id));
    assert.equal((await admin(`/admin-gate/${request.id}/allow`, {})).status, 409); assert.equal(assignments, 1);
    assert.equal((await review(request.id, 'start')).status, 200);
    assert.equal((await review(request.id, 'reject', { verifierNote: 'Review completed', rejectionReason: 'Evidence still insufficient' })).status, 200);
    assert.equal((await state()).request.status, 'REJECTED');
    assert.equal((await state()).verified, false);
    assert.equal((await state()).request.rejectionReason, 'Evidence still insufficient');
    request = (await (await submit()).json()).request; assert.equal(request.status, 'ADMIN_REVIEW');
    await admin(`/admin-gate/${request.id}/allow`, {}); await review(request.id, 'start');
    assert.equal((await review(request.id, 'flag', { verifierNote: 'Review completed', flagReason: 'Admin must investigate' })).status, 200);
    assert.equal((await call(`/admin/verification-work/requests/${request.id}/return`, 'admin', 'admin', { response: 'Cleared after investigation' }, 'PATCH')).status, 200);
    assert.equal((await review(request.id, 'approve', { verifierNote: 'All evidence confirmed' })).status, 200);
    assert.equal((await state()).verified, true); assert.equal(audits.length, 1); assert.equal(requests[0].status, 'APPROVED');
    assert.equal((await (await admin('/revocations')).json()).revocations.length, 1);
    assert.equal((await (await admin('/jobseekers/revoked-user')).json()).verified, true);
    for (const url of ['/revocations', '/verified-jobseekers', '/admin-gate', '/jobseekers/revoked-user']) {
      assert.equal((await call('/admin/verification-work' + url, 'jobseeker', 'other-user')).status, 403);
      assert.equal((await call('/admin/verification-work' + url, 'verifier', 'verifier')).status, 403);
    }
    assert.equal((await admin(`/requests/${request.id}/revoke`, { reason: 'New evidence invalidates this badge' })).status, 201);
    assert.equal((await state()).verified, false);
    const noExplanation = { ...payload }; delete noExplanation.gateExplanation;
    assert.equal((await call('/jobseeker/verification-requests', 'jobseeker', 'revoked-user', noExplanation)).status, 400);
    request = (await (await submit()).json()).request;
    const rotationBefore = assignments; verifierAvailable = false;
    assert.equal((await admin(`/admin-gate/${request.id}/allow`, {})).status, 200);
    assert.equal((await state()).request.status, 'PENDING');
    assert.equal((await state()).request.assignedVerifierId, null);
    assert.equal(assignments, rotationBefore); assert.equal(audits.length, 2);
    assert.equal((await admin(`/admin-gate/${request.id}/deny`, { reason: 'Stale decision' })).status, 409);
    verifierAvailable = true;
    const ordinary = (await (await submit('ordinary-user')).json()).request; assert.equal(ordinary.status, 'ASSIGNED');
    await review(ordinary.id, 'start'); await review(ordinary.id, 'reject', { verifierNote: 'Review complete', rejectionReason: 'Insufficient evidence' });
    assert.equal((await (await submit('ordinary-user')).json()).request.status, 'ASSIGNED');
    assert.equal((await state('ordinary-user')).revocation, null);
  } finally { await new Promise(resolve => server.close(resolve)); for (const file of await fs.readdir(directory)) await fs.unlink(path.join(directory, file)); await fs.rmdir(directory); }
});
