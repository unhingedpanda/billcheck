import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parse1998B } from '../dist/index.js';

// Independent literal: catches shifted columns and loss of empty trailing fields.
export const header = 'INVOICE_DATE|INVOICE_NUMBER|CLIENT_ID|LAW_FIRM_MATTER_ID|INVOICE_TOTAL|BILLING_START_DATE|BILLING_END_DATE|INVOICE_DESCRIPTION|LINE_ITEM_NUMBER|EXP/FEE/INV_ADJ_TYPE|LINE_ITEM_NUMBER_OF_UNITS|LINE_ITEM_ADJUSTMENT_AMOUNT|LINE_ITEM_TOTAL|LINE_ITEM_DATE|LINE_ITEM_TASK_CODE|LINE_ITEM_EXPENSE_CODE|LINE_ITEM_ACTIVITY_CODE|TIMEKEEPER_ID|LINE_ITEM_DESCRIPTION|LAW_FIRM_ID|LINE_ITEM_UNIT_COST|TIMEKEEPER_NAME|TIMEKEEPER_CLASSIFICATION|CLIENT_MATTER_ID';
export const row = '20261101|INV-001|0007|0002|12.3400|20261001|20261031|  Work  |001|F|0.1000||12.3400|20261015|L110||A101|0009|Review file|123|123.4000|Doe, Jane|ASSOC|';
const file = `LEDES1998B[]\r\n${header}[]\r\n${row}[]\r\n`;

// Removing record mapping or numeric coercion must fail these assertions.
test('preserves empty values, decimal scale, IDs and field whitespace', () => {
  const result = parse1998B(file);
  assert.deepEqual(result.diagnostics, []);
  assert.equal(result.records.length, 1);
  const record = result.records[0];
  assert.equal(record.CLIENT_ID, '0007');
  assert.equal(record.LINE_ITEM_UNIT_COST, '123.4000');
  assert.equal(record.INVOICE_DESCRIPTION, '  Work  ');
  assert.equal(record.LINE_ITEM_ADJUSTMENT_AMOUNT, '');
  assert.equal(record.CLIENT_MATTER_ID, '');
  assert.equal(record['EXP/FEE/INV_ADJ_TYPE'], 'F');
  assert.equal(record.LINE_ITEM_ACTIVITY_CODE, 'A101');
  assert.equal(Object.keys(record).length, 24);
});

test('reads raw official bytes without replacement and preserves multiple invoices', () => {
  const bytes = readFileSync(new URL('./fixtures/loc-1998b-rev-2014.txt', import.meta.url));
  const result = parse1998B(bytes);
  assert.equal(result.records.length, 6);
  assert.equal(result.records[0].LINE_ITEM_DESCRIPTION, 'Research Attorney\x92s fees, Set off claim');
  assert.equal(result.records[0].CLIENT_ID, '00711');
  assert.equal(result.records[5].INVOICE_NUMBER, '96543');
  assert.equal(result.records[5]['EXP/FEE/INV_ADJ_TYPE'], 'IF');
  assert.equal(result.records[5].LINE_ITEM_ADJUSTMENT_AMOUNT, '1250.');
  const issue = result.diagnostics.find(d => d.code === 'NON_ASCII');
  assert.equal(issue.severity, 'error');
  assert.equal(issue.record, 1);
  assert.equal(issue.line, 3);
  assert.equal(issue.field, 'LINE_ITEM_DESCRIPTION');
  assert.equal(bytes[issue.offset], 0x92);
  assert.ok(result.diagnostics.some(d => d.code === 'TRAILING_WHITESPACE'));
});

test('preserves Unicode string input and locates its first non-ASCII character', () => {
  const input = file.replace('Review file', 'Review — file');
  const result = parse1998B(input);
  assert.equal(result.records[0].LINE_ITEM_DESCRIPTION, 'Review — file');
  const issue = result.diagnostics.find(d => d.code === 'NON_ASCII');
  assert.equal(issue.offset, input.indexOf('—'));
  assert.equal(issue.line, 3);
  assert.equal(issue.field, 'LINE_ITEM_DESCRIPTION');
});

for (const [name, input, code] of [
  ['empty input', '', 'INVALID_SIGNATURE'],
  ['wrong format', file.replace('LEDES1998B', 'LEDES1998BI'), 'INVALID_SIGNATURE'],
  ['BOM before signature', '\ufeff' + file, 'INVALID_SIGNATURE'],
  ['missing header', 'LEDES1998B[]\r\n', 'INVALID_HEADER'],
  ['reordered columns', file.replace('INVOICE_DATE|INVOICE_NUMBER', 'INVOICE_NUMBER|INVOICE_DATE'), 'INVALID_HEADER'],
  ['duplicate columns', file.replace('INVOICE_NUMBER|CLIENT_ID', 'CLIENT_ID|CLIENT_ID'), 'INVALID_HEADER'],
  ['missing final field', file.replace('ASSOC|[]', 'ASSOC[]'), 'FIELD_COUNT'],
  ['extra separator', file.replace('Review file', 'Review|file'), 'FIELD_COUNT'],
  ['unterminated record', file.slice(0, -4), 'MISSING_TERMINATOR'],
  ['trailing garbage', file + 'junk', 'MISSING_TERMINATOR'],
  ['empty data', `LEDES1998B[]\r\n${header}[]\r\n`, 'EMPTY_DOCUMENT'],
  ['embedded terminator', file.replace('Review file', 'Review [] file'), 'FIELD_COUNT'],
]) {
  test(`rejects ${name} without partial records`, () => {
    const result = parse1998B(input);
    assert.equal(result.records, null);
    assert.ok(result.diagnostics.some(d => d.code === code), JSON.stringify(result.diagnostics));
  });
}

test('a malformed later record invalidates the whole document', () => {
  const result = parse1998B(file + 'broken[]\r\n');
  assert.equal(result.records, null);
  assert.equal(result.diagnostics.find(d => d.code === 'FIELD_COUNT').record, 2);
});

for (const [name, input] of [
  ['LF', file.replaceAll('\r\n', '\n')],
  ['CR', file.replaceAll('\r\n', '\r')],
  ['no record separators', file.replaceAll('\r\n', '')],
  ['no final CRLF', file.slice(0, -2)],
]) {
  test(`reads ${name} with a canonicalization warning`, () => {
    const result = parse1998B(input);
    assert.equal(result.records.length, 1);
    assert.ok(result.diagnostics.some(d => d.code === 'NON_CANONICAL_NEWLINE' && d.severity === 'warning'));
  });
}

for (const character of ['\0', '\t', '\x7f', '\n']) {
  test(`reports control character ${JSON.stringify(character)} without deleting it`, () => {
    const result = parse1998B(file.replace('Review file', 'Review' + character + 'file'));
    assert.equal(result.records[0].LINE_ITEM_DESCRIPTION, 'Review' + character + 'file');
    assert.ok(result.diagnostics.some(d => d.code === 'INVALID_CONTROL' && d.field === 'LINE_ITEM_DESCRIPTION'));
  });
}

test('returns an input error for unsupported runtime values', () => {
  for (const input of [null, 17, {}, undefined]) {
    assert.equal(parse1998B(input).records, null);
    assert.equal(parse1998B(input).diagnostics[0].code, 'INVALID_INPUT');
  }
});

test('does not confuse structural parsing with semantic validation', () => {
  const input = file.replace('20261101', 'invalid-date').replace('|12.3400|', '|not-money|');
  assert.equal(parse1998B(input).records[0].INVOICE_DATE, 'invalid-date');
});

for (const [name, input] of [
  ['after data', file + header + '[]\r\n'],
  ['instead of data', `LEDES1998B[]\r\n${header}[]\r\n${header}[]\r\n`],
]) {
  test(`rejects a repeated header ${name} as a structural error`, () => {
    const result = parse1998B(input);
    assert.equal(result.records, null);
    assert.ok(result.diagnostics.some(d => d.code === 'INVALID_HEADER' && d.record >= 1));
  });
}

test('returns field locations aligned with preserved records', () => {
  const result = parse1998B(file);
  assert.ok(result.locations);
  assert.deepEqual(result.locations[0].INVOICE_DATE, { offset: file.indexOf('20261101'), line: 3, column: 1 });
  assert.equal(result.locations[0].LINE_ITEM_DESCRIPTION.offset, file.indexOf('Review file'));
  assert.equal(parse1998B('broken').locations, null);
});
