import test from 'node:test';
import assert from 'node:assert/strict';
import { check1998B, parse1998B } from '../dist/index.js';
import { file, issues } from './helpers/invoice.mjs';

for (const [field, limit] of [
  ...['INVOICE_NUMBER', 'CLIENT_ID', 'LAW_FIRM_MATTER_ID', 'LINE_ITEM_NUMBER', 'LINE_ITEM_TASK_CODE',
    'LINE_ITEM_EXPENSE_CODE', 'LINE_ITEM_ACTIVITY_CODE', 'TIMEKEEPER_ID', 'LAW_FIRM_ID', 'CLIENT_MATTER_ID'].map(f => [f, 20]),
  ['EXP/FEE/INV_ADJ_TYPE', 2], ['TIMEKEEPER_NAME', 30], ['TIMEKEEPER_CLASSIFICATION', 10],
]) {
  test(`${field} checks the character boundary without trimming`, () => {
    assert.equal(issues(check1998B(file({ [field]: 'X'.repeat(limit) })), 'FIELD_TOO_LONG', field).length, 0);
    const input = file({ [field]: 'X'.repeat(limit) + ' ' });
    const before = parse1998B(input).records[0][field];
    const [issue] = issues(check1998B(input), 'FIELD_TOO_LONG', field);
    assert.ok(issue);
    assert.equal(issue.severity, 'error');
    assert.equal(issue.record, 1);
    assert.equal(issue.line, 3);
    assert.equal(issue.expected, String(limit));
    assert.equal(issue.actual, String(limit + 1));
    assert.equal(parse1998B(input).records[0][field], before);
  });
}

for (const field of ['INVOICE_DESCRIPTION', 'LINE_ITEM_DESCRIPTION']) {
  test(`${field} distinguishes the ambiguous 15KB boundary from definite overflow`, () => {
    assert.equal(check1998B(file({ [field]: 'X'.repeat(15000) })).status, 'pass');
    for (const length of [15001, 15360]) {
      const report = check1998B(file({ [field]: 'X'.repeat(length) }));
      assert.equal(report.status, 'warn');
      assert.equal(issues(report, 'DESCRIPTION_SIZE_AMBIGUOUS', field).length, 1);
    }
    const report = check1998B(file({ [field]: 'X'.repeat(15361) }));
    assert.equal(report.status, 'fail');
    assert.equal(issues(report, 'FIELD_TOO_LONG', field).length, 1);
  });
}

test('later ignored invoice and matter fields do not create length or numeric errors', () => {
  const report = check1998B(file({ INVOICE_TOTAL: '24.68' }, {
    LINE_ITEM_NUMBER: '2', INVOICE_TOTAL: '999999999999999', CLIENT_ID: 'X'.repeat(21),
    INVOICE_DESCRIPTION: 'X'.repeat(15361),
  }));
  assert.equal(report.status, 'warn');
  assert.equal(issues(report, 'FIELD_TOO_LONG').length, 0);
  assert.equal(issues(report, 'NUMERIC_WIDTH').length, 0);
});

test('timekeeper names need both parts around a comma without assuming an alphabet', () => {
  for (const value of ['Doe Jane', ', Jane', 'Doe,', 'Doe,   ', '  ,Jane']) {
    assert.equal(issues(check1998B(file({ TIMEKEEPER_NAME: value })), 'INVALID_TIMEKEEPER_NAME').length, 1, value);
  }
  for (const value of ["O'Neil, Jo-Anne", 'van der Meer, J.', 'Doe, Jane, Jr.', 'Li, X']) {
    assert.equal(check1998B(file({ TIMEKEEPER_NAME: value })).status, 'pass', value);
  }
  const expense = { 'EXP/FEE/INV_ADJ_TYPE': 'E', LINE_ITEM_EXPENSE_CODE: 'E101', TIMEKEEPER_NAME: '' };
  assert.equal(check1998B(file(expense)).status, 'pass');
});

test('classifications use exact reference identifiers and flag former codes separately', () => {
  for (const code of ['ASSOC', 'PARTNR', 'TRANEE', 'IPSVPV', 'RSRCHR', 'VIDOGR']) {
    assert.equal(check1998B(file({ TIMEKEEPER_CLASSIFICATION: code })).status, 'pass', code);
  }
  for (const code of ['AS', 'PT', 'LA', 'OC', 'OT']) {
    const report = check1998B(file({ TIMEKEEPER_CLASSIFICATION: code }));
    assert.equal(report.status, 'warn', code);
    assert.equal(issues(report, 'LEGACY_TIMEKEEPER_CLASSIFICATION').length, 1);
  }
  for (const code of ['PARTNER', 'assoc', 'ASSOC ', '__proto__']) {
    assert.equal(issues(check1998B(file({ TIMEKEEPER_CLASSIFICATION: code })), 'UNKNOWN_TIMEKEEPER_CLASSIFICATION').length, 1, code);
  }
});

for (const [field, digits] of [['INVOICE_TOTAL', 8], ['LINE_ITEM_NUMBER_OF_UNITS', 6],
  ['LINE_ITEM_ADJUSTMENT_AMOUNT', 6], ['LINE_ITEM_TOTAL', 6], ['LINE_ITEM_UNIT_COST', 6]]) {
  test(`${field} warns about width without rounding or counting sign and leading zeros`, () => {
    for (const value of ['0'.repeat(30) + '9'.repeat(digits) + '.9999', '-' + '9'.repeat(digits), '+.1']) {
      assert.equal(issues(check1998B(file({ [field]: value })), 'NUMERIC_WIDTH', field).length, 0, value);
    }
    for (const value of ['1' + '0'.repeat(digits), '-0001' + '0'.repeat(digits) + '.0001']) {
      const [issue] = issues(check1998B(file({ [field]: value })), 'NUMERIC_WIDTH', field);
      assert.ok(issue);
      assert.equal(issue.severity, 'warning');
    }
    assert.equal(issues(check1998B(file({ [field]: '1e20' })), 'NUMERIC_WIDTH', field).length, 0);
  });
}

test('adjustment records ignore units and unit-cost widths', () => {
  for (const type of ['IF', 'IE']) {
    const report = check1998B(file({ 'EXP/FEE/INV_ADJ_TYPE': type, LINE_ITEM_NUMBER_OF_UNITS: '9'.repeat(25),
      LINE_ITEM_UNIT_COST: '9'.repeat(25), LINE_ITEM_ADJUSTMENT_AMOUNT: '12.3400' }));
    assert.equal(report.status, 'pass');
  }
});

test('an identifier-length finding does not claim unrelated descriptions overflow', () => {
  const report = check1998B(file({ CLIENT_ID: 'X'.repeat(21), INVOICE_DESCRIPTION: 'Short', LINE_ITEM_DESCRIPTION: 'Short' }));
  const [issue] = issues(report, 'FIELD_TOO_LONG', 'CLIENT_ID');
  assert.ok(issue);
  assert.doesNotMatch(issue.explanation, /Description text exceeds/i);
  assert.equal(issues(report, 'FIELD_TOO_LONG').length, 1);
});
