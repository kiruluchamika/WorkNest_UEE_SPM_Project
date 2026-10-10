// Real HTTP routes/controllers; the database and SMTP transport are isolated in-memory fixtures.
// No connection to the real database is made and no real email is sent.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
Object.assign(process.env, { DATABASE_URL: 'postgresql://test:test@localhost/test', JWT_SECRET: 'isolated-welcome-email-test-secret', SMTP_HOST: 'localhost', SMTP_USER: 'test', SMTP_PASS: 'test', SMTP_FROM: 'WorkNest <no-reply@example.com>' });

const users = [];
const sent = [];
let dbFailure = null; let smtpFailure = null;
const prisma = { user: {
  create: async ({ data }) => {
    if (dbFailure) throw dbFailure;
    const user = { id: `user-${users.length + 1}`, bio: null, location: null, avatarUrl: null, trustScore: 0, createdAt: new Date(), ...data, phone: data.phone ?? null };
    users.push(user);
    return user;
  },
  findUnique: async ({ where }) => {
    const user = users.find(row => row.email === where.email);
    return user ? { ...user, verifierApplications: [] } : null;
  },
} };
function neonSql(strings, ...values) { return { sql: strings.join('?'), values }; }
neonSql.transaction = async queries => {
  if (dbFailure) throw dbFailure;
  return queries;
};
const transporter = { sendMail: async message => {
  if (smtpFailure) throw smtpFailure;
  sent.push(message);
  return { messageId: `message-${sent.length}` };
} };
require.cache[require.resolve('../dist/config/db')] = { exports: { prisma, neonSql } };
require.cache[require.resolve('../dist/config/mailer')] = { exports: { transporter, verifySmtpConnection: async () => true } };
const { app } = require('../dist/app');
const { hashPassword } = require('../dist/utils/hash');
const { welcomeTemplate } = require('../dist/services/email.templates');

const png = { name: 'id.png', mimeType: 'image/png', base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=' };
const jobseeker = { name: 'Nimal Perera', email: 'nimal@example.com', password: 'secret123', role: 'jobseeker', phone: '0771234567' };
const shopowner = { ...jobseeker, name: 'Kamala Stores', email: 'kamala@example.com', role: 'shopowner' };
const verifier = { ...jobseeker, name: 'Sunil Silva', email: 'sunil@example.com', role: 'verifier', district: 'Colombo', identityType: 'NATIONAL_ID', identityNumber: '12345678', addressInformation: 'Test address', identityDocumentReferenceUpload: png };

test('welcome email on registration', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'worknest-welcome-test-'));
  process.env.PRIVATE_DOCUMENT_DIR = directory;
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/auth`;
  const post = (url, body) => fetch(base + url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const register = body => post('/register', body);
  // The send is not awaited by the controller, so give its promise chain a turn to settle.
  const settle = () => new Promise(resolve => setTimeout(resolve, 20));
  const errors = [];
  const originalError = console.error;
  console.error = (...args) => errors.push(args);
  t.beforeEach(() => { users.splice(0); sent.splice(0); errors.splice(0); dbFailure = null; smtpFailure = null; });

  try {
    // ---------- Positive: valid input, the email must be sent ----------
    await t.test('positive: job seeker registration sends a welcome email', async () => {
      const response = await register(jobseeker);
      assert.equal(response.status, 201);
      const body = await response.json();
      assert.equal(body.user.email, jobseeker.email);
      assert.ok(body.token);
      await settle();
      assert.equal(sent.length, 1);
      assert.equal(sent[0].to, jobseeker.email);
      assert.equal(sent[0].from, process.env.SMTP_FROM);
      assert.equal(sent[0].subject, 'Welcome to WorkNest');
      assert.match(sent[0].html, /Hi Nimal Perera,/);
      assert.match(sent[0].html, /Job seeker/);
      assert.match(sent[0].html, />Active</);
      assert.match(sent[0].html, /nimal@example\.com/);
      assert.match(sent[0].text, /Account type: Job seeker/);
      assert.equal(sent[0].attachments[0].cid, 'worknest-logo');
    });

    await t.test('positive: shop owner registration sends the shop owner wording', async () => {
      assert.equal((await register(shopowner)).status, 201);
      await settle();
      assert.equal(sent.length, 1);
      assert.equal(sent[0].to, shopowner.email);
      assert.match(sent[0].html, /Shop owner/);
      assert.match(sent[0].html, /post gigs and hire/);
      assert.doesNotMatch(sent[0].html, /Job seeker|Community verifier/);
    });

    await t.test('positive: verifier registration sends the pending review wording', async () => {
      const response = await register(verifier);
      assert.equal(response.status, 201);
      assert.equal((await response.json()).user.verifierApplication.status, 'PENDING');
      await settle();
      assert.equal(sent.length, 1);
      assert.equal(sent[0].to, verifier.email);
      assert.match(sent[0].html, /Community verifier/);
      assert.match(sent[0].html, />Pending review</);
      assert.doesNotMatch(sent[0].html, />Active</);
      assert.match(sent[0].text, /verifier application has been submitted for review/);
    });

    await t.test('positive: the email goes to the normalised address', async () => {
      assert.equal((await register({ ...jobseeker, email: '  Nimal@Example.COM ' })).status, 201);
      await settle();
      assert.equal(sent.length, 1);
      assert.equal(sent[0].to, 'nimal@example.com');
    });

    await t.test('positive: each registration sends exactly one email to its own user', async () => {
      for (const body of [jobseeker, shopowner, verifier]) assert.equal((await register(body)).status, 201);
      await settle();
      assert.deepEqual(sent.map(message => message.to), [jobseeker.email, shopowner.email, verifier.email]);
    });

    await t.test('positive: logging in does not send a welcome email', async () => {
      users.push({ id: 'existing', ...jobseeker, phone: null, bio: null, location: null, avatarUrl: null, trustScore: 0, createdAt: new Date(), passwordHash: await hashPassword(jobseeker.password) });
      assert.equal((await post('/login', { email: jobseeker.email, password: jobseeker.password })).status, 200);
      await settle();
      assert.equal(sent.length, 0);
    });

    // ---------- Negative: invalid input or a failure, no email may be sent ----------
    const invalidBodies = {
      'invalid email format': { ...jobseeker, email: 'not-an-email' },
      'missing email': { ...jobseeker, email: undefined },
      'empty email': { ...jobseeker, email: '' },
      'password shorter than 6 characters': { ...jobseeker, password: '12345' },
      'missing password': { ...jobseeker, password: undefined },
      'name shorter than 2 characters': { ...jobseeker, name: 'A' },
      'missing name': { ...jobseeker, name: undefined },
      'unknown role': { ...jobseeker, role: 'admin' },
      'missing role': { ...jobseeker, role: undefined },
      'invalid phone': { ...jobseeker, phone: '123' },
      'verifier without identity document': { ...verifier, identityDocumentReferenceUpload: undefined },
      'verifier without district': { ...verifier, district: undefined },
      'verifier with a 9 digit mobile': { ...verifier, phone: '077123456' },
      'empty body': {},
    };
    for (const [name, body] of Object.entries(invalidBodies)) {
      await t.test(`negative: ${name} is rejected and sends no email`, async () => {
        assert.equal((await register(body)).status, 400);
        await settle();
        assert.equal(sent.length, 0);
        assert.equal(users.length, 0);
      });
    }

    await t.test('negative: duplicate email is rejected and sends no email', async () => {
      dbFailure = Object.assign(new Error('duplicate key value violates unique constraint'), { code: '23505' });
      for (const body of [jobseeker, verifier]) {
        const response = await register(body);
        assert.equal(response.status, 409);
        assert.equal((await response.json()).error, 'Email already registered');
      }
      await settle();
      assert.equal(sent.length, 0);
    });

    await t.test('negative: database failure fails the registration and sends no email', async () => {
      dbFailure = new Error('simulated database failure');
      for (const body of [jobseeker, verifier]) assert.equal((await register(body)).status, 500);
      await settle();
      assert.equal(sent.length, 0);
    });

    await t.test('negative: SMTP failure does not fail the registration', async () => {
      smtpFailure = new Error('simulated SMTP outage');
      for (const body of [jobseeker, shopowner, verifier]) {
        const response = await register(body);
        assert.equal(response.status, 201);
        assert.ok((await response.json()).token);
      }
      await settle();
      assert.equal(sent.length, 0);
      assert.equal(errors.length, 3);
      assert.match(String(errors[0][0]), /Failed to send welcome email to nimal@example\.com/);
      assert.equal(errors[0][1], smtpFailure);
    });

    await t.test('negative: HTML in the name is escaped in the email', async () => {
      assert.equal((await register({ ...jobseeker, name: '<script>alert("x")</script>' })).status, 201);
      await settle();
      assert.equal(sent.length, 1);
      assert.doesNotMatch(sent[0].html, /<script>/);
      assert.match(sent[0].html, /&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt;/);
    });

    await t.test('negative: unknown role falls back to the job seeker template', () => {
      const { html, text } = welcomeTemplate({ recipientName: 'Test', email: 'test@example.com', role: 'something-else' });
      assert.match(html, /Job seeker/);
      assert.match(text, /Account type: Job seeker/);
      assert.doesNotMatch(text, /&rsquo;|<[a-z]/);
    });
  } finally {
    console.error = originalError;
    await new Promise(resolve => server.close(resolve));
    // Delete only this test's uniquely created temporary directory.
    for (const file of await fs.readdir(directory)) await fs.unlink(path.join(directory, file));
    await fs.rmdir(directory);
  }
});
