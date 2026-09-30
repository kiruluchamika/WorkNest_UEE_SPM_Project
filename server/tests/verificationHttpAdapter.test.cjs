// Exercise real Prisma query planning and the HTTP adapter without connecting to a database.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { PrismaClient } = require('@prisma/client');
const { PrismaNeonHTTP } = require('@prisma/adapter-neon');

test('revoked request writes and relation reads work without HTTP transactions', async () => {
  const factory = new PrismaNeonHTTP('postgresql://test:test@localhost/test', {});
  const connect = factory.connect.bind(factory);
  const queries = [];
  factory.connect = async () => {
    const adapter = await connect();
    // Keep the real startTransaction implementation. Block SQL at the transport
    // boundary so this regression check cannot read or change a real database.
    adapter.queryRaw = async query => {
      queries.push(query.sql);
      throw new Error('ISOLATED_SQL_TRANSPORT');
    };
    return adapter;
  };
  const prisma = new PrismaClient({ adapter: factory });
  const data = {
    applicantId: 'isolated-user', district: 'Colombo', personalInformation: 'Test details',
    identityDocument: '', supportingEvidence: null, communityReferences: 'Test reference',
    status: 'ADMIN_REVIEW', gateStatus: 'PENDING', gateExplanation: 'New evidence',
    revocationId: 'isolated-revocation',
  };
  const include = { applicant: { select: { id: true } }, assignedVerifier: { select: { id: true } }, adminReviewer: { select: { id: true } } };
  try {
    await assert.rejects(prisma.verificationRequest.create({ data, include }), /Transactions are not supported in HTTP mode/);
    assert.equal(queries.length, 0, 'original failure occurs before SQL is sent');
    await assert.rejects(prisma.verificationRequest.create({ data }), /ISOLATED_SQL_TRANSPORT/);
    assert.match(queries[0], /INSERT INTO.*VerificationRequest/);
    await assert.rejects(prisma.verificationRequest.findUnique({ where: { id: 'isolated-request' }, include }), /ISOLATED_SQL_TRANSPORT/);
    assert.match(queries[1], /SELECT/);
    await assert.rejects(prisma.verificationRequest.updateMany({
      where: { id: 'isolated-request', status: 'ADMIN_REVIEW', gateStatus: 'PENDING', assignedVerifierId: null },
      data: { status: 'ADMIN_DENIED', gateStatus: 'DENIED', gateReason: 'Insufficient evidence', gateReviewerId: 'isolated-admin', gateReviewedAt: new Date() },
    }), /Transactions are not supported in HTTP mode/);
    assert.equal(queries.length, 2, 'Prisma denial fails before reaching SQL; use the conditional SQL controller path');
  } finally {
    await prisma.$disconnect();
  }
});
