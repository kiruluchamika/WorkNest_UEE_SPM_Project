// Real HTTP routes/controllers and disk IO; database calls use isolated in-memory fixtures.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
Object.assign(process.env, { DATABASE_URL: 'postgresql://test:test@localhost/test', JWT_SECRET: 'isolated-upload-test-secret', SMTP_HOST: 'localhost', SMTP_USER: 'test', SMTP_PASS: 'test', SMTP_FROM: 'test@example.com' });
const tables = { verifierApplication: [], verifierReactivationRequest: [], verificationRequest: [] };
let latestStatus = 'REJECTED'; let failWrite = false; let last;
let previouslyRevoked = false;
function matches(row, where = {}) {
  return Object.entries(where).every(([key, value]) => {
    if (key === 'AND') return value.every(x => matches(row, x));
    if (key === 'OR') return value.some(x => matches(row, x));
    if (value && typeof value === 'object') {
      if ('contains' in value) return (row[key] || '').includes(value.contains);
      if ('in' in value) return value.in.includes(row[key]);
    }
    return row[key] === value;
  });
}
const prisma = Object.fromEntries(Object.entries(tables).map(([name, rows]) => [name, {
  findFirst: async ({ where, orderBy }) => orderBy && name === 'verifierApplication' ? { id: 'application', status: latestStatus } : rows.find(r => matches(r, where)) || null,
  findUnique: async () => last,
}]));
prisma.verificationRevocation = { findFirst: async () => previouslyRevoked ? { id: 'prior-revocation' } : null };
prisma.verificationRequest.create = async ({ data }) => {
  last = { ...data, id: 'created', assignedVerifierId: null };
  tables.verificationRequest.push(last);
  return last;
};
function neonSql(strings, ...values) {
  if (failWrite) throw new Error('simulated persistence failure');
  const sql = strings.join('?');
  const name = sql.includes('INSERT INTO "VerifierReactivationRequest"') ? 'verifierReactivationRequest' : sql.includes('INSERT INTO "VerificationRequest"') ? 'verificationRequest' : sql.includes('INSERT INTO "VerifierApplication"') ? 'verifierApplication' : null;
  if (name) {
    const references = values.filter(x => typeof x === 'string' && x.includes('worknest-file:'));
    last = { id: 'created', applicantId: 'owner', verifierId: 'owner', assignedVerifierId: 'assigned', status: 'PENDING',
      identityDocumentReference: name === 'verifierApplication' ? references[0] || '' : '',
      attachmentReference: name === 'verifierReactivationRequest' ? references[0] || '' : '',
      identityDocument: name === 'verificationRequest' ? references[0] || '' : '',
      supportingEvidence: name === 'verificationRequest' ? references[1] || '' : '' };
    tables[name].push(last);
  }
  return [{ id: 'created' }];
}
neonSql.transaction = async values => values;
require.cache[require.resolve('../dist/config/db')] = { exports: { prisma, neonSql } };
const { app } = require('../dist/app');
const { signToken } = require('../dist/utils/jwt');
const { validateDocument, documentIds } = require('../dist/services/privateDocuments');
const png = { name: 'evidence.png', mimeType: 'image/png', base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=' };
const pdf = { name: 'evidence.pdf', mimeType: 'application/pdf', base64: Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF').toString('base64') };
const application = { district: 'Colombo', identityType: 'NATIONAL_ID', identityNumber: '12345678', addressInformation: 'Test address' };
const flows = [
  { url: '/api/auth/register', role: null, fields: ['identityDocumentReference'], body: { ...application, name: 'Upload Test', email: 'upload@example.com', password: 'test-password', role: 'verifier', phone: '0771234567' } },
  { url: '/api/verifier/applications', role: 'verifier', fields: ['identityDocumentReference'], body: application },
  { url: '/api/verifier/applications/reactivation-request', role: 'verifier', fields: ['attachmentReference'], body: { explanation: 'Please review my supporting evidence.' }, status: 'SUSPENDED' },
  { url: '/api/jobseeker/verification-requests', role: 'jobseeker', fields: ['identityDocument', 'supportingEvidence'], body: { district: 'Colombo', personalInformation: 'Full Name: Test\nPhone Number: 0771234567', identityDocument: 'NATIONAL_ID: 1234', supportingEvidence: 'Existing written evidence', communityReferences: 'Community reference' } },
  { url: '/api/jobseeker/verification-requests', role: 'jobseeker', revoked: true, fields: ['identityDocument', 'supportingEvidence'], body: { district: 'Colombo', personalInformation: 'Full Name: Revoked\nPhone Number: 0771234567', identityDocument: 'NATIONAL_ID: 1234', communityReferences: 'Community reference', gateExplanation: 'Please review my new evidence' } },
];

test('optional identity and supporting uploads through actual endpoints and private downloads', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'worknest-upload-test-'));
  process.env.PRIVATE_DOCUMENT_DIR = directory;
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const auth = (role, userId = 'owner') => role ? { Authorization: `Bearer ${signToken({ userId, role })}` } : {};
  const post = (flow, body) => fetch(base + flow.url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...auth(flow.role) }, body: JSON.stringify(body) });
  const reset = () => Object.values(tables).forEach(rows => rows.splice(0));
  try {
    assert.equal((await fetch(base + '/health')).status, 200);
    for (const flow of flows) {
      previouslyRevoked = !!flow.revoked;
      latestStatus = flow.status || 'REJECTED';
      await t.test(flow.url, async () => {
        reset(); assert.equal((await post(flow, flow.body)).status, 201, 'uploads are optional');
        const validBody = { ...flow.body, ...Object.fromEntries(flow.fields.map(field => [field + 'Upload', png])) };
        for (const field of flow.fields) {
          const missing = { ...validBody }; delete missing[field + 'Upload'];
          reset();
          const required = false;
          assert.equal((await post(flow, missing)).status, required ? 400 : 201, 'missing ' + field);
          if (!required && flow.revoked) {
            assert.equal(last.status, 'ADMIN_REVIEW');
            assert.equal(last.assignedVerifierId, null);
            if (field === 'supportingEvidence') assert.equal(last.supportingEvidence, null);
          }
        }
        if (flow.url === '/api/auth/register' || flow.role === 'jobseeker') {
          for (const phone of ['', '077123456', '07712345678', '077123456a', '077-123456', ' 0771234567', '0771234567 ']) {
            const invalid = flow.role === 'jobseeker' ? { ...validBody, personalInformation: `Full Name: Test\nPhone Number: ${phone}` } : { ...validBody, phone };
            assert.equal((await post(flow, invalid)).status, 400, 'invalid mobile ' + phone);
          }
        }
        reset(); assert.equal((await post(flow, validBody)).status, 201, 'submission with supporting documents');
        if (flow.revoked) {
          assert.equal(last.status, 'ADMIN_REVIEW');
          assert.equal(last.assignedVerifierId, null);
          assert.match(last.identityDocument, /worknest-file:/);
          assert.match(last.supportingEvidence, /worknest-file:/);
        }
        for (const field of flow.fields) {
          reset();
          const body = { ...validBody, [field + 'Upload']: png };
          assert.equal((await post(flow, body)).status, 201, 'valid PNG upload');
          const saved = last[field];
          const id = documentIds(saved)[0];
          const url = base + '/api/private-documents/' + id;
          const owner = await fetch(url, { headers: auth(flow.role || 'verifier') });
          assert.equal(owner.status, 200); assert.equal(owner.headers.get('cache-control'), 'no-store');
          assert.deepEqual(Buffer.from(await owner.arrayBuffer()), Buffer.from(png.base64, 'base64'));
          assert.equal((await fetch(url)).status, 401, 'anonymous denied');
          assert.equal((await fetch(url, { headers: auth('jobseeker', 'stranger') })).status, 404, 'other user denied');
          assert.equal((await fetch(url, { headers: auth('admin', 'admin') })).status, 200, 'admin allowed');
          assert.equal((await fetch(url, { headers: auth('verifier', 'unassigned') })).status, 404, 'unassigned verifier denied');
          if (flow.role === 'jobseeker' && !flow.revoked) {
            tables.verifierApplication.push({ id: 'active', applicantId: 'assigned', status: 'APPROVED' });
            assert.equal((await fetch(url, { headers: auth('verifier', 'assigned') })).status, 200);
            tables.verifierApplication[0].status = 'SUSPENDED';
            assert.equal((await fetch(url, { headers: auth('verifier', 'assigned') })).status, 404);
          }
          if (flow.url !== '/api/auth/register') {
            if (flow.role === 'jobseeker') last.status = 'REJECTED';
            const retained = { ...validBody, [field]: saved }; delete retained[field + 'Upload'];
            assert.equal((await post(flow, retained)).status, 201, 'owner can retain an existing document');
          }
          // Guessed reference cannot be attached to another user's record.
          const forged = await fetch(base + '/api/verifier/applications', { method: 'POST', headers: { 'Content-Type': 'application/json', ...auth('verifier', 'stranger') }, body: JSON.stringify({ ...application, identityDocumentReference: saved }) });
          assert.equal(forged.status, 403);
          reset(); assert.equal((await post(flow, { ...validBody, [field + 'Upload']: { ...png, name: 'virus.exe', base64: Buffer.from('MZ executable').toString('base64') } })).status, 400);
          assert.equal((await post(flow, { ...validBody, [field + 'Upload']: { ...png, base64: Buffer.alloc(2 * 1024 * 1024 + 1).toString('base64') } })).status, 413);
          // Either optional upload can be removed.
          reset();
          assert.equal((await post(flow, { ...validBody, [field + 'Upload']: undefined })).status, 201);
          reset(); assert.equal((await post(flow, { ...validBody, [field + 'Upload']: pdf })).status, 201);
          const replacement = documentIds(last[field])[0];
          assert.equal(JSON.parse(await fs.readFile(path.join(directory, replacement), 'utf8')).name, 'evidence.pdf');
        }
      });
    }
    await t.test('failed submission removes newly written files', async () => {
      reset(); latestStatus = 'APPROVED';
      const before = await fs.readdir(directory);
      assert.equal((await post(flows[1], { ...application, identityDocumentReferenceUpload: png })).status, 409);
      await new Promise(resolve => setTimeout(resolve, 50));
      assert.deepEqual(await fs.readdir(directory), before);
    });
    await t.test('encoding, MIME mismatch and JPEG signatures', () => {
      assert.throws(() => validateDocument({ ...png, base64: 'bad!!' }));
      assert.throws(() => validateDocument({ ...png, mimeType: 'application/pdf' }));
      assert.equal(validateDocument({ name: 'image.jpg', mimeType: 'image/jpeg', base64: Buffer.from([255,216,255,224,255,217]).toString('base64') }).type, 'image/jpeg');
    });
  } finally {
    await new Promise(resolve => server.close(resolve));
    // Delete only this test's uniquely created temporary directory.
    for (const file of await fs.readdir(directory)) await fs.unlink(path.join(directory, file));
    await fs.rmdir(directory);
  }
});
