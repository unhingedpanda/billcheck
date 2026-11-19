import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build1998B, parse1998B } from '../dist/index.js';

// An independent input object, deliberately not obtained from our parser.
const record = {
  CLIENT_MATTER_ID: '', INVOICE_DATE: '20261101', INVOICE_NUMBER: 'INV-001',
  CLIENT_ID: '0007', LAW_FIRM_MATTER_ID: '0002', INVOICE_TOTAL: '12.3400',
  BILLING_START_DATE: '20261001', BILLING_END_DATE: '20261031',
  INVOICE_DESCRIPTION: '  Work  ', LINE_ITEM_NUMBER: '001',
  'EXP/FEE/INV_ADJ_TYPE': 'F', LINE_ITEM_NUMBER_OF_UNITS: '0.1000',
  LINE_ITEM_ADJUSTMENT_AMOUNT: '', LINE_ITEM_TOTAL: '12.3400',
  LINE_ITEM_DATE: '20261015', LINE_ITEM_TASK_CODE: 'L110', LINE_ITEM_EXPENSE_CODE: '',
  LINE_ITEM_ACTIVITY_CODE: 'A101', TIMEKEEPER_ID: '0009',
  LINE_ITEM_DESCRIPTION: 'Review file', LAW_FIRM_ID: '123',
  LINE_ITEM_UNIT_COST: '123.4000', TIMEKEEPER_NAME: 'Doe, Jane',
  TIMEKEEPER_CLASSIFICATION: 'ASSOC',
};

// Wrong column ordering, coercion or framing breaks a byte-for-byte golden.
test('builds the independent ASCII golden with canonical framing', () => {
  const golden = readFileSync(new URL('./fixtures/synthetic-1998b.txt', import.meta.url), 'utf8');
  const result = build1998B([record]);
  assert.deepEqual(result.diagnostics, []);
  assert.equal(result.text, golden);
  assert.deepEqual(parse1998B(result.text).records, [record]);
});

test('builds all six official records after an explicit caller-owned repair', () => {
  const raw = readFileSync(new URL('./fixtures/loc-1998b-rev-2014.txt', import.meta.url));
  const parsed = parse1998B(raw);
  assert.equal(build1998B(parsed.records).text, null);
  const repaired = parsed.records.map((r, i) => i === 0
    ? { ...r, LINE_ITEM_DESCRIPTION: "Research Attorney's fees, Set off claim" } : r);
  const result = build1998B(repaired);
  const expected = readFileSync(new URL('./fixtures/loc-1998b-ascii-canonical.txt', import.meta.url), 'utf8');
  assert.equal(result.text, expected);
  assert.deepEqual(result.diagnostics, []);
  assert.equal(parsed.records[0].LINE_ITEM_DESCRIPTION.includes('\x92'), true);
});

for (const [name, value, code] of [
  ['field separator', 'Review|file', 'RESERVED_CHARACTER'],
  ['record terminator', 'Review[]file', 'RESERVED_CHARACTER'],
  ['non-ASCII', 'Review — file', 'NON_ASCII'],
  ['raw non-ASCII byte', 'Review\x92file', 'NON_ASCII'],
  ['newline', 'Review\r\nfile', 'INVALID_CONTROL'],
  ['tab', 'Review\tfile', 'INVALID_CONTROL'],
  ['NUL', 'Review\0file', 'INVALID_CONTROL'],
  ['number', 10, 'INVALID_FIELD'],
  ['null', null, 'INVALID_FIELD'],
]) {
  test(`refuses ${name} without returning partial output`, () => {
    const bad = { ...record, LINE_ITEM_DESCRIPTION: value };
    const result = build1998B([record, bad]);
    assert.equal(result.text, null);
    assert.ok(result.diagnostics.some(d => d.code === code && d.record === 2 && d.field === 'LINE_ITEM_DESCRIPTION'));
  });
}

test('refuses missing fields instead of inventing an empty value', () => {
  const bad = { ...record };
  delete bad.CLIENT_MATTER_ID;
  const result = build1998B([bad]);
  assert.equal(result.text, null);
  assert.ok(result.diagnostics.some(d => d.code === 'MISSING_FIELD' && d.field === 'CLIENT_MATTER_ID'));
});

test('refuses unknown fields instead of losing caller data', () => {
  const result = build1998B([{ ...record, INVOICE_CURRENCY: 'USD' }]);
  assert.equal(result.text, null);
  assert.ok(result.diagnostics.some(d => d.code === 'UNKNOWN_FIELD'));
});

test('requires fields to belong to the record itself', () => {
  assert.equal(build1998B([Object.create(record)]).text, null);
});

test('rejects empty, sparse and non-record inputs safely', () => {
  for (const input of [[], [null], [42], [new Array(24)], new Array(2), null, {}, undefined]) {
    const result = build1998B(input);
    assert.equal(result.text, null);
    assert.ok(result.diagnostics.some(d => d.severity === 'error'));
  }
});

test('does not alter frozen input or round long decimal amounts', () => {
  const exact = Object.freeze({ ...record, INVOICE_TOTAL: '9007199254740993.1234' });
  const result = build1998B(Object.freeze([exact]));
  assert.ok(result.text.includes('|9007199254740993.1234|'));
  assert.equal(exact.INVOICE_TOTAL, '9007199254740993.1234');
});

for (const key of ['INVOICE_CURRENCY', Symbol('INVOICE_CURRENCY')]) {
  test(`rejects an extra non-enumerable own field ${String(key)}`, () => {
    const input = Object.defineProperty({ ...record }, key, { value: 'USD' });
    const result = build1998B([input]);
    assert.equal(result.text, null);
    assert.ok(result.diagnostics.some(d => d.code === 'UNKNOWN_FIELD'));
  });
}
