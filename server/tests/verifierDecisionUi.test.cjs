const { test } = require('node:test');
const assert = require('node:assert/strict');
const loadFrontend = require('./helpers/loadFrontend.cjs');

function screen(status = 'UNDER_REVIEW', role = 'verifier') {
  const item = { id: 'request', status, applicant: { name: 'Applicant' }, submittedAt: new Date().toISOString() };
  const state = [], calls = [], alerts = [];
  let cursor = 0, back = 0, fail = false;
  const React = {
    createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
    useCallback: fn => fn,
    useState: initial => {
      const index = cursor++;
      if (!(index in state)) state[index] = index === 0 ? item : initial;
      return [state[index], value => { state[index] = value; }];
    },
  };
  const action = name => async (...args) => {
    calls.push([name, ...args]);
    if (fail) throw new Error('Existing API validation failed');
    return { ...item, status: { approve: 'APPROVED', reject: 'REJECTED', flag: 'FLAGGED', start: 'UNDER_REVIEW' }[name] };
  };
  const { VerificationRequestDetailsScreen } = loadFrontend('screens/verifier/VerificationRequestDetailsScreen.tsx', {
    react: React,
    'react-native': { Alert: { alert: (...args) => alerts.push(args) }, ScrollView: 'ScrollView', Text: 'Text', View: 'View', StyleSheet: { create: value => value } },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    '@react-navigation/native': { useFocusEffect: () => {}, useNavigation: () => ({ goBack: () => back++ }), useRoute: () => ({ params: { id: item.id } }) },
    '../../context/AuthContext': { useAuth: () => ({ user: { role } }) },
    '../../components/common/DocumentField': { DocumentEvidence: 'DocumentEvidence' },
    '../../components/common/AppHeader': { AppHeader: 'AppHeader' },
    '../../components/common/Card': { Card: 'Card' },
    '../../components/common/Input': { Input: 'Input' },
    '../../components/common/Button': { Button: 'Button' },
    '../../components/common/LoadingSpinner': { LoadingSpinner: 'LoadingSpinner' },
    '../../theme/colors': { colors: {} }, '../../theme/spacing': { spacing: {} }, '../../theme/typography': { typography: { sizes: {} } },
    '../../api/verificationRequestsApi': { approveVerification: action('approve'), rejectVerification: action('reject'), flagVerification: action('flag'), startVerificationReview: action('start') },
  });
  function nodes() {
    cursor = 0;
    const output = [];
    function walk(node) {
      if (Array.isArray(node)) return node.forEach(walk);
      if (!node || typeof node !== 'object') return;
      output.push(node); walk(node.children);
    }
    walk(VerificationRequestDetailsScreen());
    return output;
  }
  const find = (type, property, value) => nodes().find(node => node.type === type && node.props[property] === value);
  return { calls, alerts, nodes, button: title => find('Button', 'title', title), input: label => find('Input', 'label', label), fail: () => { fail = true; }, back: () => back };
}

test('Reject and Flag reveal their own reason field and submit only on explicit confirmation', async () => {
  for (const [title, label, confirm, action] of [['Reject', 'Rejection reason', 'Confirm rejection', 'reject'], ['Flag for Admin', 'Flagging reason', 'Confirm flag for Admin', 'flag']]) {
    const s = screen();
    assert.deepEqual(s.nodes().filter(node => node.type === 'Input').map(node => node.props.label), ['Verifier Note']);
    s.input('Verifier Note').props.onChangeText('Verifier note unchanged');
    s.button(title).props.onPress();
    assert.deepEqual(s.calls, []);
    assert(s.input(label)); assert.equal(s.button('Approve'), undefined);
    s.input(label).props.onChangeText('  Exact reason entered  ');
    await s.button(confirm).props.onPress();
    assert.deepEqual(s.calls, [[action, 'request', 'Verifier note unchanged', '  Exact reason entered  ']]);
    assert.equal(s.back(), 1);
  }
});

test('Cancel never submits, preserves the note and clears the reason before another action', () => {
  const s = screen();
  s.input('Verifier Note').props.onChangeText('Keep this note');
  s.button('Reject').props.onPress();
  s.input('Rejection reason').props.onChangeText('Do not reuse this reason');
  s.button('Cancel').props.onPress();
  assert.deepEqual(s.calls, []); assert.equal(s.input('Rejection reason'), undefined);
  assert.equal(s.input('Verifier Note').props.value, 'Keep this note');
  s.button('Flag for Admin').props.onPress();
  assert.equal(s.input('Flagging reason').props.value, '');
});

test('existing API validation still handles invalid input and errors keep the selected action for correction', async () => {
  const s = screen(); s.fail();
  s.button('Reject').props.onPress();
  await s.button('Confirm rejection').props.onPress();
  assert.deepEqual(s.calls, [['reject', 'request', '', '']]);
  assert.deepEqual(s.alerts, [['Error', 'Existing API validation failed']]);
  assert(s.input('Rejection reason')); assert.equal(s.back(), 0);
});

test('returned requests, Admin permissions, Approve and Start Review retain existing controls and calls', async () => {
  const returned = screen('RETURNED_FOR_REVIEW');
  assert.equal(returned.button('Flag for Admin'), undefined);
  returned.button('Reject').props.onPress(); assert(returned.input('Rejection reason'));
  for (const status of ['APPROVED', 'REJECTED', 'FLAGGED', 'PENDING']) {
    const s = screen(status); assert.equal(s.button('Reject'), undefined); assert.equal(s.button('Flag for Admin'), undefined);
  }
  const admin = screen('UNDER_REVIEW', 'admin');
  assert.equal(admin.button('Approve'), undefined); assert.equal(admin.button('Reject'), undefined); assert.equal(admin.button('Flag for Admin'), undefined);
  const approve = screen(); await approve.button('Approve').props.onPress(); assert.deepEqual(approve.calls, [['approve', 'request', '']]);
  const assigned = screen('ASSIGNED'); await assigned.button('Start Review').props.onPress(); assert.deepEqual(assigned.calls, [['start', 'request']]);
});
