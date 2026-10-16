const { test } = require('node:test');
const assert = require('node:assert/strict');
const frontend = require('./helpers/loadFrontend.cjs')('utils/validators.ts');
const backend = require('../dist/validators/auth.validator');
const applications = require('../dist/validators/verifierApplication.validator');
const requests = require('../dist/validators/verificationRequest.validator');
const upload = { name: 'id.pdf', mimeType: 'application/pdf', base64: Buffer.from('%PDF-1.4\n%%EOF').toString('base64') };
const identity = { district: 'Colombo', identityType: 'NATIONAL_ID', identityNumber: '1234', addressInformation: 'Test address', identityDocumentReferenceUpload: upload };
const registration = { ...identity, name: 'Test User', email: 'test@example.com', password: 'secret123', confirmPassword: 'secret123', role: 'verifier', phone: '0771234567' };

test('frontend and backend verifier registration require exact mobile and identity details, with community reference optional', () => {
  for (const schema of [frontend.registerSchema, backend.registerSchema]) {
    assert.equal(schema.safeParse(registration).success, true);
    for (const phone of ['', '077123456', '07712345678', '077123456a', '077-123456', ' 0771234567', '0771234567 ', undefined]) {
      assert.equal(schema.safeParse({ ...registration, phone }).success, false);
    }
    assert.equal(schema.safeParse({ ...registration, identityDocumentReferenceUpload: undefined }).success, true);
    assert.equal(schema.safeParse({ ...registration, identityNumber: undefined }).success, false);
    assert.equal(schema.safeParse({ ...registration, identityType: undefined }).success, false);
    for (const role of ['jobseeker', 'shopowner']) {
      assert.equal(schema.safeParse({ name: 'Test User', email: 'test@example.com', password: 'secret123', confirmPassword: 'secret123', role, phone: '+94112345678' }).success, true);
    }
  }
  assert.equal(backend.registerSchema.safeParse({ name: 'Test User', email: 'test@example.com', password: 'secret123', role: 'jobseeker' }).success, true);
});

test('frontend and backend re-application permits omitted identity files and retained references', () => {
  for (const schema of [frontend.verifierReapplicationSchema, applications.verifierReapplicationSchema]) {
    assert.equal(schema.safeParse(identity).success, true);
    assert.equal(schema.safeParse({ ...identity, identityDocumentReferenceUpload: undefined }).success, true);
    assert.equal(schema.safeParse({ ...identity, identityDocumentReferenceUpload: undefined, identityDocumentReference: 'legacy ID text' }).success, true);
    assert.equal(schema.safeParse({ ...identity, identityDocumentReferenceUpload: undefined, identityDocumentReference: 'worknest-file:12345678-1234-4234-8234-123456789abc' }).success, true);
  }
});

test('verification requires identity details and an identity file; supporting evidence stays optional', () => {
  const valid = { district: 'Colombo', personalInformation: 'Full Name: Test\nAddress: Test address\nPhone Number: 0771234567', identityDocument: 'NATIONAL_ID: 1234', identityDocumentUpload: upload, supportingEvidenceUpload: upload, communityReferences: 'Test community reference' };
  assert.equal(requests.createVerificationRequestSchema.safeParse(valid).success, true);
  for (const identityDocumentUpload of [undefined, null]) {
    const result = requests.createVerificationRequestSchema.safeParse({ ...valid, identityDocumentUpload, supportingEvidenceUpload: undefined });
    assert.equal(result.success, false);
    assert(result.error.issues.some(issue => issue.message === 'Please upload an identity document file.'));
  }
  assert.equal(requests.createVerificationRequestSchema.safeParse({ ...valid, identityDocumentUpload: undefined, identityDocument: 'NATIONAL_ID: 1234\nworknest-file:12345678-1234-4234-8234-123456789abc' }).success, true, 'a retained file is checked for ownership by upload middleware');
  for (const field of ['identityDocument']) {
    assert.equal(requests.createVerificationRequestSchema.safeParse({ ...valid, [field]: undefined }).success, false);
  }
  assert.equal(requests.createVerificationRequestSchema.safeParse({ ...valid, identityDocument: 'NATIONAL_ID:   ' }).success, false);
  assert.equal(requests.createVerificationRequestSchema.safeParse({ ...valid, supportingEvidenceUpload: undefined }).success, true);
  assert.equal(requests.createVerificationRequestSchema.safeParse({ ...valid, supportingEvidenceUpload: undefined, supportingEvidence: 'Written evidence alone' }).success, true);
  assert.equal(applications.reactivationRequestSchema.safeParse({ explanation: 'Please reactivate my access', attachmentReferenceUpload: upload }).success, true);
  assert.equal(applications.reactivationRequestSchema.safeParse({ explanation: 'Please reactivate my access' }).success, true);
  assert.equal(applications.reactivationRequestSchema.safeParse({ explanation: 'Please reactivate my access', attachmentReference: 'Written evidence alone' }).success, true);
});

test('required personal information and decision reasons reject empty, whitespace and malformed values', () => {
  const valid = { district: 'Colombo', personalInformation: 'Full Name: Test\nAddress: Test address\nPhone Number: 0771234567', identityDocument: 'NATIONAL_ID: 1234', identityDocumentUpload: upload, communityReferences: 'Test reference' };
  for (const personalInformation of [
    'Phone Number: 0771234567',
    'Full Name:  \nAddress: Test address\nPhone Number: 0771234567',
    'Full Name: Test\nAddress:   \nPhone Number: 0771234567',
    valid.personalInformation + '\nFull Name: Duplicate',
    valid.personalInformation + '\nPhone Number: 0771234567',
  ]) assert.equal(requests.createVerificationRequestSchema.safeParse({ ...valid, personalInformation }).success, false);
  for (const communityReferences of ['', '    ', 'abcd']) assert.equal(requests.createVerificationRequestSchema.safeParse({ ...valid, communityReferences }).success, false);
  for (const identityDocument of ['', 'NATIONAL_ID:   ', 'OTHER: 1234']) assert.equal(requests.createVerificationRequestSchema.safeParse({ ...valid, identityDocument }).success, false);
  assert.equal(requests.createVerificationRequestSchema.safeParse({ ...valid, district: 'Unsupported' }).success, false);
  for (const [schema, field, body] of [
    [requests.verifierNoteSchema, 'verifierNote', {}],
    [requests.rejectVerificationSchema, 'rejectionReason', { verifierNote: 'Reviewed evidence' }],
    [requests.flagVerificationSchema, 'flagReason', { verifierNote: 'Reviewed evidence' }],
    [requests.adminFlagOutcomeSchema, 'response', {}],
    [requests.badgeReasonSchema, 'reason', {}],
    [applications.rejectVerifierApplicationSchema, 'reason', {}],
    [applications.suspendVerifierApplicationSchema, 'reason', {}],
    [applications.rejectReactivationRequestSchema, 'reason', {}],
  ]) {
    for (const value of [undefined, '', '   ']) assert.equal(schema.safeParse({ ...body, [field]: value }).success, false);
    assert.equal(schema.safeParse({ ...body, [field]: 'Valid meaningful reason' }).success, true);
  }
});
