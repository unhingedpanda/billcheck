import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { check1998B, MAPPED_LOC_CODES } from '../dist/index.js';
import { file, issues } from './helpers/invoice.mjs';

const listed = new Set(readFileSync(new URL('../docs/sources/loc-error-codes-v2-98b.txt', import.meta.url), 'utf8')
  .split('\n').filter(line => line && !line.startsWith('#')));
const loc = (report, code, field) => issues(report, code, field).map(d => d.locCode);

// A mistyped or invented identifier, or a lost line-type distinction, breaks these cases.
test('every mapped identifier is a LOC V2 code that applies to 1998B', () => {
  assert.ok(MAPPED_LOC_CODES.length > 0);
  for (const code of MAPPED_LOC_CODES) assert.ok(listed.has(code), code);
});

test('line diagnostics use the code for the line type', () => {
  const fee = check1998B(file({ LINE_ITEM_TOTAL: '1.00' }));
  assert.deepEqual(loc(fee, 'LINE_TOTAL_MISMATCH', 'LINE_ITEM_TOTAL'), ['1318-0041']);
  const expense = check1998B(file({ 'EXP/FEE/INV_ADJ_TYPE': 'E', LINE_ITEM_EXPENSE_CODE: 'E101',
    LINE_ITEM_TASK_CODE: '', LINE_ITEM_ACTIVITY_CODE: '', LINE_ITEM_TOTAL: '1.00' }));
  assert.deepEqual(loc(expense, 'LINE_TOTAL_MISMATCH', 'LINE_ITEM_TOTAL'), ['1617-0041']);
  const duplicate = check1998B(file({}, {}));
  assert.deepEqual(loc(duplicate, 'DUPLICATE_LINE_ITEM'), ['1319-0035']);
});

test('invoice fields map regardless of line type', () => {
  const report = check1998B(file({ INVOICE_DATE: '20250231' }));
  assert.deepEqual(loc(report, 'INVALID_DATE', 'INVOICE_DATE'), ['402-0036']);
});

test('ambiguous and unmatched diagnostics carry no LOC code', () => {
  const report = check1998B(file({ LAW_FIRM_ID: '', TIMEKEEPER_ID: '', 'EXP/FEE/INV_ADJ_TYPE': 'X' }));
  assert.equal(issues(report, 'REQUIRED_FIELD', 'LAW_FIRM_ID').length, 1);
  assert.equal(issues(report, 'INVALID_LINE_TYPE').length, 1);
  for (const d of report.diagnostics) assert.equal(Object.hasOwn(d, 'locCode'), false, d.code);
});

test('a fee line missing its timekeeper ID carries no LOC code', () => {
  const report = check1998B(file({ TIMEKEEPER_ID: '' }));
  const [missing] = issues(report, 'REQUIRED_FIELD', 'TIMEKEEPER_ID');
  assert.ok(missing);
  assert.equal(Object.hasOwn(missing, 'locCode'), false);
});

test('structural layout errors use the fatal layout code', () => {
  const report = check1998B('LEDES1998B[]\r\nWRONG|HEADER[]\r\n');
  assert.deepEqual(loc(report, 'INVALID_HEADER'), ['1-0003']);
});
