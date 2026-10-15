const { test } = require('node:test');
const assert = require('node:assert/strict');
const loadFrontend = require('./helpers/loadFrontend.cjs');
const helper = loadFrontend('utils/documentUpload.ts');
const { prepareDocumentUpload, MAX_DOCUMENT_BYTES } = helper;
const pdf = Buffer.from('%PDF-1.4\n%%EOF').toString('base64');

test('provider metadata produces the existing JSON upload contract without URI or Blob', async () => {
  for (const mimeType of [undefined, '', 'application/octet-stream', 'application/pdf', 'APPLICATION/PDF']) {
    const upload = await prepareDocumentUpload({ name: 'identity.PDF', mimeType }, async () => pdf);
    assert.deepEqual(JSON.parse(JSON.stringify(upload)), { name: 'identity.PDF', mimeType: 'application/pdf', base64: pdf });
  }
  assert.equal((await prepareDocumentUpload({ name: 'photo.jpg', mimeType: 'image/jpg' }, async () => '/9j/')).mimeType, 'image/jpeg');
  assert.equal((await prepareDocumentUpload({ name: 'photo.jpeg' }, async () => '/9j/')).mimeType, 'image/jpeg');
  assert.equal((await prepareDocumentUpload({ name: 'photo.png' }, async () => 'iVBORw0KGgo=')).mimeType, 'image/png');
});

test('invalid metadata fails before reading and unknown file sizes are checked after reading', async () => {
  for (const metadata of [
    { name: '' }, { name: '  ' }, { name: 'file.exe' },
    { name: 'file.pdf', mimeType: 'text/plain' }, { name: 'file.pdf', mimeType: 'image/png' },
    ...[0, -1, NaN, Infinity, MAX_DOCUMENT_BYTES + 1].map(size => ({ name: 'file.pdf', size })),
  ]) {
    await assert.rejects(prepareDocumentUpload(metadata, () => { throw new Error('MUST_NOT_READ'); }), error => !error.message.includes('MUST_NOT_READ'));
  }
  for (const base64 of ['', 'not base64!', 'YWJj\n', Buffer.alloc(MAX_DOCUMENT_BYTES + 1).toString('base64')]) {
    await assert.rejects(prepareDocumentUpload({ name: 'file.pdf' }, async () => base64));
  }
  const exact = Buffer.alloc(MAX_DOCUMENT_BYTES).toString('base64');
  assert.equal((await prepareDocumentUpload({ name: 'file.pdf', size: MAX_DOCUMENT_BYTES }, async () => exact)).base64, exact);
  assert.equal((await prepareDocumentUpload({ name: 'file.pdf' }, async () => 'YQ==')).base64, 'YQ==');
  await assert.rejects(prepareDocumentUpload({ name: 'file.pdf' }, async () => { throw new Error('Read denied'); }), /Read denied/);
});

function component(os, result, read = async () => pdf) {
  const changes = [], errors = [], deletes = [], reads = [], options = [];
  const React = { createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
    useState: initial => [initial, value => { if (typeof value === 'string' && value) errors.push(value); }] };
  const { DocumentField } = loadFrontend('components/common/DocumentField.tsx', {
    react: React, 'react-native': { Platform: { OS: os }, Text: 'Text', View: 'View' },
    'expo-document-picker': { getDocumentAsync: async value => { options.push(value); return typeof result === 'function' ? result(value) : result; } },
    'expo-file-system': { File: class {
      constructor(uri) { this.uri = uri; }
      async base64() { reads.push(this.uri); return read(this.uri); }
    } },
    'expo-file-system/legacy': {
      readAsStringAsync: async () => { throw new Error('Legacy read must not be used'); },
      deleteAsync: async uri => deletes.push(uri) },
    'expo-sharing': {}, './Button': { Button: 'Button' }, '../../api/http': {},
    '../../utils/documentUpload': helper,
  });
  const tree = DocumentField({ label: 'Identity', onChange: value => changes.push(value), onRemoveExisting: () => changes.push('removed') });
  const buttons = tree.children.filter(child => child?.type === 'Button');
  return { select: buttons[0].props.onPress, changes, errors, deletes, reads, options, DocumentField };
}

test('native File API reads Android source URIs and iOS cache copies without deleting Android sources', async () => {
  for (const [os, uri] of [['android', 'file:///cache/identity.pdf'], ['android', 'content://provider/identity.pdf'], ['ios', 'file:///cache/identity.pdf']]) {
    const c = component(os, { canceled: false, assets: [{ uri, name: 'identity.pdf', mimeType: 'application/octet-stream' }] });
    await c.select();
    assert.deepEqual(c.reads, [uri]);
    assert.deepEqual(c.deletes, os === 'ios' ? [uri] : []);
    assert.deepEqual(c.errors, []);
    assert.deepEqual(c.changes, [{ name: 'identity.pdf', mimeType: 'application/pdf', base64: pdf }, 'removed']);
    assert.deepEqual(c.options[0], { type: ['image/jpeg', 'image/png', 'application/pdf'], multiple: false, copyToCacheDirectory: os !== 'android' });
  }
});

test('Expo Go unreadable host-cache regression uses the provider grant rather than the copied path', async () => {
  const hostCache = 'file:///data/user/0/host.exp.exponent/cache/DocumentPicker/identity.jpg';
  const source = 'content://com.android.providers.media.documents/document/image%3A123';
  const c = component('android', options => ({ canceled: false, assets: [{
    uri: options.copyToCacheDirectory ? hostCache : source,
    name: 'identity.jpg', mimeType: 'image/jpeg',
  }] }), async uri => {
    if (uri === hostCache) throw new Error(`Location '${uri}' isn't readable.`);
    assert.equal(uri, source);
    return '/9j/4P/Z';
  });
  await c.select();
  assert.deepEqual(c.errors, []);
  assert.equal(c.changes[0].base64, '/9j/4P/Z');
  assert.deepEqual(c.reads, [source]);
  assert.deepEqual(c.deletes, [], 'Never delete the provider source after selection');
});

test('cancel, read failure and invalid selection preserve the previous value', async () => {
  const canceled = component('android', { canceled: true });
  await canceled.select(); assert.deepEqual(canceled.changes, []); assert.deepEqual(canceled.deletes, []);
  const uri = 'file:///cache/identity.pdf';
  for (const [name, read] of [['identity.pdf', async () => { throw new Error('Permission denied'); }], ['file.exe', async () => pdf]]) {
    const c = component('android', { canceled: false, assets: [{ uri, name }] }, read);
    await c.select(); assert.deepEqual(c.changes, []); assert.deepEqual(c.deletes, []); assert.equal(c.errors.length, 1);
    const ios = component('ios', { canceled: false, assets: [{ uri, name }] }, read);
    await ios.select(); assert.deepEqual(ios.changes, []); assert.deepEqual(ios.deletes, [uri]); assert.equal(ios.errors.length, 1);
  }
});

test('web FileReader path retains the JSON payload and never uses native filesystem', async () => {
  const previous = global.FileReader;
  global.FileReader = class {
    readAsDataURL() { this.result = 'data:application/pdf;base64,' + pdf; this.onload(); }
  };
  try {
    const c = component('web', { canceled: false, assets: [{ uri: 'blob:test', file: { size: 14 }, name: 'identity.pdf', mimeType: 'application/pdf' }] });
    await c.select(); assert.deepEqual(c.errors, []); assert.deepEqual(c.reads, []); assert.deepEqual(c.deletes, []);
    assert.equal(c.changes[0].base64, pdf);
    const oversized = component('web', { canceled: false, assets: [{ uri: 'blob:test', file: { size: MAX_DOCUMENT_BYTES + 1 }, name: 'identity.pdf' }] });
    await oversized.select(); assert.deepEqual(oversized.changes, []); assert.equal(oversized.errors.length, 1);
  } finally { global.FileReader = previous; }
});

test('native document retrieval carries authentication, checks HTTP status and cleans shared files', async () => {
  const id = '12345678-1234-4234-8234-123456789abc';
  for (const [available, status, mimeType] of [[true, 200, 'application/pdf'], [true, 200, 'image/png'], [true, 200, 'image/jpeg'], [true, 404, 'application/pdf'], [false, 200, 'application/pdf']]) {
    const downloads = [], shared = [], deleted = [], errors = [], moved = [];
    const React = { createElement: (type, props, ...children) => ({ type, props, children }),
      useState: initial => [initial, value => { if (typeof value === 'string' && value) errors.push(value); }] };
    const { DocumentEvidence } = loadFrontend('components/common/DocumentField.tsx', {
      react: React, 'react-native': { Platform: { OS: 'android' }, Text: 'Text', View: 'View' },
      'expo-document-picker': {},
      'expo-file-system': {},
      'expo-file-system/legacy': { cacheDirectory: 'file:///cache/',
        downloadAsync: async (...args) => { downloads.push(args); return { status, mimeType }; },
        moveAsync: async value => moved.push(value), deleteAsync: async uri => deleted.push(uri) },
      'expo-sharing': { isAvailableAsync: async () => available, shareAsync: async (...args) => shared.push(args) },
      './Button': { Button: 'Button' }, '../../utils/documentUpload': helper,
      '../../api/http': { http: { defaults: { baseURL: 'https://example.test/api', headers: { common: { Authorization: 'Bearer test-token' } } } }, extractErrorMessage: (_error, fallback) => fallback },
    });
    const tree = DocumentEvidence({ label: 'Evidence', value: `worknest-file:${id}` });
    await tree.children[3][0].props.onPress();
    if (!available) { assert.equal(downloads.length, 0); assert.equal(errors.length, 1); continue; }
    assert.deepEqual(downloads[0], [`https://example.test/api/private-documents/${id}`, `file:///cache/evidence-${id}`, { headers: { Authorization: 'Bearer test-token' } }]);
    assert(deleted.includes(`file:///cache/evidence-${id}`));
    if (status === 404) { assert.equal(shared.length, 0); assert.equal(errors.length, 1); }
    else {
      const extension = mimeType === 'application/pdf' ? '.pdf' : mimeType === 'image/png' ? '.png' : '.jpg';
      assert.equal(shared[0][0], `file:///cache/evidence-${id}${extension}`);
      assert.equal(moved[0].to, shared[0][0]); assert(deleted.includes(shared[0][0])); assert.equal(errors.length, 0);
    }
  }
});
