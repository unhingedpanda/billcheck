import test from 'node:test';
import assert from 'node:assert/strict';
import { check1998B } from '../dist/index.js';
import { golden, file, issues } from './helpers/invoice.mjs';

for (const field of ['LINE_ITEM_TASK_CODE', 'LINE_ITEM_ACTIVITY_CODE', 'LINE_ITEM_EXPENSE_CODE']) {
  test(`${field} uses only its supplied exact list`, () => {
    const input = file({ [field]: 'CUSTOM-2026' });
    assert.equal(check1998B(input).status, 'pass');
    assert.equal(check1998B(input, { codeLists: { [field]: ['CUSTOM-2026'] } }).status, 'pass');
    for (const list of [[], ['custom-2026'], ['L110']]) {
      const report = check1998B(input, { codeLists: { [field]: list } });
      assert.equal(report.status, 'fail');
      const [issue] = issues(report, 'CODE_NOT_ALLOWED', field);
      assert.ok(issue);
      assert.equal(issue.record, 1);
      assert.equal(issue.line, 3);
      assert.ok(issue.source.includes('caller'));
    }
    assert.equal(issues(check1998B(file({ [field]: 'CUSTOM-2026 ' }),
      { codeLists: { [field]: ['CUSTOM-2026'] } }), 'CODE_NOT_ALLOWED', field).length, 1);
  });
}

test('omitted, empty, and blank codes remain different', () => {
  assert.equal(check1998B(golden, { codeLists: {} }).status, 'pass');
  assert.equal(check1998B(golden, { codeLists: { LINE_ITEM_EXPENSE_CODE: [] } }).status, 'pass');
  const report = check1998B(file({ 'EXP/FEE/INV_ADJ_TYPE': 'E', LINE_ITEM_EXPENSE_CODE: '' }),
    { codeLists: { LINE_ITEM_EXPENSE_CODE: [] } });
  assert.equal(issues(report, 'REQUIRED_FIELD', 'LINE_ITEM_EXPENSE_CODE').length, 1);
  assert.equal(issues(report, 'CODE_NOT_ALLOWED').length, 0);
});

test('explicit classifications replace reference membership without bypassing format checks', () => {
  for (const value of ['PARTNER', 'PT']) {
    assert.equal(check1998B(file({ TIMEKEEPER_CLASSIFICATION: value }),
      { codeLists: { TIMEKEEPER_CLASSIFICATION: [value] } }).status, 'pass');
  }
  assert.equal(issues(check1998B(golden, { codeLists: { TIMEKEEPER_CLASSIFICATION: [] } }),
    'CODE_NOT_ALLOWED', 'TIMEKEEPER_CLASSIFICATION').length, 1);
  const report = check1998B(file({ TIMEKEEPER_CLASSIFICATION: 'X'.repeat(11) }),
    { codeLists: { TIMEKEEPER_CLASSIFICATION: ['CUSTOM'] } });
  assert.equal(issues(report, 'FIELD_TOO_LONG').length, 1);
  assert.equal(issues(report, 'CODE_NOT_ALLOWED').length, 1);
  assert.equal(issues(report, 'UNKNOWN_TIMEKEEPER_CLASSIFICATION').length, 0);
});

test('code lists combine with explicit tolerance and remain unmodified', () => {
  const list = Object.freeze(['L110']);
  const options = Object.freeze({ amountTolerance: '0.01', codeLists: Object.freeze({ LINE_ITEM_TASK_CODE: list }) });
  const report = check1998B(golden.replaceAll('12.3400', '12.3500'), options);
  assert.equal(report.status, 'warn');
  assert.equal(issues(report, 'ROUNDING_DIFFERENCE').length, 1);
  assert.deepEqual(list, ['L110']);
});

test('malformed list configuration fails clearly instead of disabling validation', () => {
  const badLists = [null, undefined, [], 'L110', 1, { UNKNOWN: [] }, { [Symbol('hidden')]: [] },
    Object.create({ LINE_ITEM_TASK_CODE: ['L110'] }),
    ...[null, undefined, 'L110', 1, [1], [''], [' '], [' L110'], ['L110 '], ['L110', 'L110'],
      ['X'.repeat(21)], ['A|B'], ['A[]B'], ['A\tB'], ['A\nB'], ['é'], new Array(1),
      Object.assign(['L110'], { hidden: true })].map(list => ({ LINE_ITEM_TASK_CODE: list })),
    { TIMEKEEPER_CLASSIFICATION: ['X'.repeat(11)] },
  ];
  for (const codeLists of badLists) {
    const report = check1998B(golden, { codeLists });
    assert.equal(report.status, 'fail', String(codeLists));
    assert.equal(issues(report, 'INVALID_OPTIONS').length, 1);
    assert.equal(issues(report, 'CODE_NOT_ALLOWED').length, 0);
  }
});

test('inherited options and accessors cannot silently configure checks', () => {
  const trap = { get LINE_ITEM_TASK_CODE() { throw new Error('Do not execute option getters'); } };
  const optionsTrap = { get codeLists() { throw new Error('Do not execute option getters'); } };
  const entryTrap = ['L110'];
  Object.defineProperty(entryTrap, '0', { get() { throw new Error('Do not execute option getters'); } });
  for (const options of [Object.create({ codeLists: { LINE_ITEM_TASK_CODE: [] } }),
    Object.create({ amountTolerance: '1' }), optionsTrap, { codeLists: trap },
    { codeLists: { LINE_ITEM_TASK_CODE: entryTrap } }]) {
    assert.equal(issues(check1998B(golden, options), 'INVALID_OPTIONS').length, 1);
  }
  const lists = Object.assign(Object.create(null), { LINE_ITEM_TASK_CODE: ['L110'] });
  assert.equal(check1998B(golden, Object.assign(Object.create(null), { codeLists: lists })).status, 'pass');
});

test('configuration inspection failures return diagnostics instead of crashing', () => {
  const revoked = Proxy.revocable({}, {});
  revoked.revoke();
  const list = new Proxy(['L110'], { get() { throw new Error('Cannot inspect length'); } });
  const mapping = new Proxy({}, { ownKeys() { throw new Error('Cannot inspect fields'); } });
  for (const options of [revoked.proxy, { codeLists: revoked.proxy }, { codeLists: mapping },
    { codeLists: { LINE_ITEM_TASK_CODE: revoked.proxy } }, { codeLists: { LINE_ITEM_TASK_CODE: list } }]) {
    const report = check1998B(golden, options);
    assert.equal(report.status, 'fail');
    assert.equal(issues(report, 'INVALID_OPTIONS').length, 1);
    assert.equal(issues(report, 'CODE_NOT_ALLOWED').length, 0);
  }
});
