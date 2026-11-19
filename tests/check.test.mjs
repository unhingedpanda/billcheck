import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parse1998B, build1998B, check1998B, explain } from '../dist/index.js';

const golden = readFileSync(new URL('./fixtures/synthetic-1998b.txt', import.meta.url), 'utf8');
const seed = parse1998B(golden).records[0];
function file(...changes) {
  const result = build1998B(changes.map(change => ({ ...seed, ...change })));
  assert.notEqual(result.text, null, JSON.stringify(result.diagnostics));
  return result.text;
}
function finding(result, code, field) {
  const issue = result.diagnostics.find(d => d.code === code && (!field || d.field === field));
  assert.ok(issue, `Missing ${code} for ${field}: ${JSON.stringify(result)}`);
  return issue;
}

// Removing any field validation or losing diagnostic source positions breaks these cases.
test('checks the independent golden and reports counts without exposing invoice records', () => {
  const result = check1998B(golden);
  assert.equal(result.status, 'pass');
  assert.deepEqual(result.summary, { recordCount: 1, invoiceCount: 1, errorCount: 0, warningCount: 0 });
  assert.deepEqual(result.diagnostics, []);
  assert.equal(Object.hasOwn(result, 'records'), false);
});

test('fails malformed structure with explanations and no inferred invoice totals', () => {
  const result = check1998B('not a LEDES file');
  assert.equal(result.status, 'fail');
  assert.equal(result.summary.recordCount, 0);
  assert.ok(result.diagnostics.every(d => d.explanation && d.suggestion && d.source));
  assert.ok(!result.diagnostics.some(d => d.code === 'INVOICE_TOTAL_MISMATCH'));
});

for (const field of ['INVOICE_DATE', 'INVOICE_NUMBER', 'CLIENT_ID', 'LAW_FIRM_MATTER_ID',
  'INVOICE_TOTAL', 'BILLING_START_DATE', 'BILLING_END_DATE', 'LINE_ITEM_NUMBER',
  'EXP/FEE/INV_ADJ_TYPE', 'LINE_ITEM_TOTAL', 'LINE_ITEM_DATE', 'LAW_FIRM_ID']) {
  test(`requires ${field} on the first applicable record`, () => {
    const result = check1998B(file({ [field]: '' }));
    assert.equal(finding(result, 'REQUIRED_FIELD', field).severity, 'error');
    assert.equal(result.status, 'fail');
  });
}

for (const field of ['TIMEKEEPER_ID', 'TIMEKEEPER_NAME', 'TIMEKEEPER_CLASSIFICATION', 'LINE_ITEM_DESCRIPTION']) {
  test(`requires ${field} for fee records`, () => {
    assert.equal(finding(check1998B(file({ [field]: '' })), 'REQUIRED_FIELD', field).record, 1);
  });
}

test('accepts an expense without fee-only fields but requires an expense code', () => {
  const row = { 'EXP/FEE/INV_ADJ_TYPE': 'E', LINE_ITEM_EXPENSE_CODE: 'E101', LINE_ITEM_TASK_CODE: '',
    LINE_ITEM_ACTIVITY_CODE: '', TIMEKEEPER_ID: '', TIMEKEEPER_NAME: '', TIMEKEEPER_CLASSIFICATION: '', LINE_ITEM_DESCRIPTION: '' };
  assert.equal(check1998B(file(row)).status, 'pass');
  finding(check1998B(file({ ...row, LINE_ITEM_EXPENSE_CODE: '' })), 'REQUIRED_FIELD', 'LINE_ITEM_EXPENSE_CODE');
});

test('treats whitespace-only required values as missing without changing input', () => {
  const input = new TextEncoder().encode(file({ CLIENT_ID: '  ' }));
  const before = input.slice();
  finding(check1998B(input), 'REQUIRED_FIELD', 'CLIENT_ID');
  assert.deepEqual(input, before);
});

for (const date of ['20260229', '19000229', '20260431', '20261301', '00000101', '2026111', '2026-11-01']) {
  test(`rejects impossible or malformed calendar date ${date}`, () => {
    finding(check1998B(file({ INVOICE_DATE: date })), 'INVALID_DATE', 'INVOICE_DATE');
  });
}
for (const date of ['20000229', '20240229', '20261101', '00010101']) {
  test(`accepts real calendar date ${date}`, () => {
    assert.equal(check1998B(file({ INVOICE_DATE: date })).status, 'pass');
  });
}

for (const type of ['f', 'X', ' E ']) {
  test(`rejects unsupported line type ${JSON.stringify(type)}`, () => {
    finding(check1998B(file({ 'EXP/FEE/INV_ADJ_TYPE': type })), 'INVALID_LINE_TYPE', 'EXP/FEE/INV_ADJ_TYPE');
  });
}

test('rejects a reversed billing period', () => {
  finding(check1998B(file({ BILLING_START_DATE: '20261101' })), 'INVALID_BILLING_PERIOD', 'BILLING_END_DATE');
});

test('warns rather than fails for a line date outside the billing period', () => {
  const result = check1998B(file({ LINE_ITEM_DATE: '20260930' }));
  assert.equal(result.status, 'warn');
  assert.equal(finding(result, 'LINE_DATE_OUTSIDE_PERIOD', 'LINE_ITEM_DATE').severity, 'warning');
});

test('does not require client-dependent codes without client context', () => {
  assert.equal(check1998B(file({ CLIENT_MATTER_ID: '', LINE_ITEM_TASK_CODE: '', LINE_ITEM_ACTIVITY_CODE: '' })).status, 'pass');
  assert.equal(finding(check1998B(file({ LINE_ITEM_TASK_CODE: '' })), 'ACTIVITY_WITHOUT_TASK').severity, 'warning');
});

test('locates the precise field and provides original correction guidance', () => {
  const input = file({ INVOICE_DATE: '20260229' }).replaceAll('\r\n', '\n');
  const issue = finding(check1998B(input), 'INVALID_DATE', 'INVOICE_DATE');
  assert.equal(issue.record, 1);
  assert.equal(issue.line, 3);
  assert.equal(issue.column, 1);
  assert.equal(issue.offset, input.indexOf('20260229'));
  assert.ok(issue.explanation.length > 10);
  assert.ok(issue.suggestion.includes('YYYYMMDD'));
  assert.ok(issue.source.includes('ledes.org'));
});

test('explains project codes while refusing unknown and prototype property names', () => {
  const rule = explain('INVALID_DATE');
  assert.equal(rule.code, 'INVALID_DATE');
  assert.ok(rule.explanation && rule.suggestion && rule.source);
  for (const code of ['__proto__', 'constructor', 'UNKNOWN', '[1012-0053]']) assert.equal(explain(code), null);
});

export { golden, seed, file, finding };

test('checks all six repaired official records including the invoice-level retainer', () => {
  const input = readFileSync(new URL('./fixtures/loc-1998b-ascii-canonical.txt', import.meta.url));
  const result = check1998B(input);
  assert.equal(result.status, 'pass', JSON.stringify(result.diagnostics));
  assert.equal(result.summary.invoiceCount, 2);
  assert.equal(result.summary.recordCount, 6);
});

test('preserves the raw official anomaly without inventing additional billing errors', () => {
  const raw = readFileSync(new URL('./fixtures/loc-1998b-rev-2014.txt', import.meta.url));
  assert.deepEqual(check1998B(raw).diagnostics.map(d => d.code).sort(), ['NON_ASCII', 'TRAILING_WHITESPACE']);
});

for (const [units, cost, adjustment, total] of [
  ['0.1', '0.2', '0.01', '0.03'],
  ['.1', '.2', '', '.02'],
  ['1.', '10.', '', '10.'],
  ['1', '10', '-12', '-2'],
  ['-1', '10', '0', '-10'],
  ['1', '9007199254740993.1234', '0', '9007199254740993.1234'],
]) {
  test(`uses exact decimal arithmetic for ${units} × ${cost} + ${adjustment || '0'}`, () => {
    const result = check1998B(file({ LINE_ITEM_NUMBER_OF_UNITS: units, LINE_ITEM_UNIT_COST: cost,
      LINE_ITEM_ADJUSTMENT_AMOUNT: adjustment, LINE_ITEM_TOTAL: total, INVOICE_TOTAL: total }));
    if (cost === '9007199254740993.1234') {
      assert.equal(result.status, 'warn');
      assert.equal(result.summary.warningCount, 3);
      assert.ok(result.diagnostics.every(d => d.code === 'NUMERIC_WIDTH'));
    } else assert.equal(result.status, 'pass', JSON.stringify(result.diagnostics));
  });
}

for (const type of ['IF', 'IE']) {
  test(`checks ${type} using adjustment and ignores units/cost`, () => {
    const row = { 'EXP/FEE/INV_ADJ_TYPE': type, LINE_ITEM_ADJUSTMENT_AMOUNT: '-10', LINE_ITEM_TOTAL: '-10', INVOICE_TOTAL: '-10',
      LINE_ITEM_NUMBER_OF_UNITS: 'ignored', LINE_ITEM_UNIT_COST: 'ignored', TIMEKEEPER_ID: '', TIMEKEEPER_NAME: '',
      TIMEKEEPER_CLASSIFICATION: '', LINE_ITEM_DESCRIPTION: '', LINE_ITEM_TASK_CODE: '', LINE_ITEM_ACTIVITY_CODE: '' };
    assert.equal(check1998B(file(row)).status, 'pass');
    const bad = check1998B(file({ ...row, LINE_ITEM_TOTAL: '-9', INVOICE_TOTAL: '-9' }));
    assert.equal(finding(bad, 'LINE_TOTAL_MISMATCH').expected, '-10');
  });
}

for (const [field, zeroCode] of [['LINE_ITEM_NUMBER_OF_UNITS', 'ZERO_UNITS'], ['LINE_ITEM_UNIT_COST', 'ZERO_UNIT_COST']]) {
  for (const type of ['F', 'E']) {
    test(`requires nonzero ${field} for ${type}`, () => {
      const base = { 'EXP/FEE/INV_ADJ_TYPE': type, LINE_ITEM_EXPENSE_CODE: type === 'E' ? 'E101' : '' };
      finding(check1998B(file({ ...base, [field]: '' })), 'REQUIRED_FIELD', field);
      finding(check1998B(file({ ...base, [field]: '-0.0000' })), zeroCode, field);
    });
  }
}

for (const value of ['1e2', '1,000', '$12.34', 'NaN', 'Infinity', ' 12.34', '12.34567', '.', '+']) {
  test(`rejects noncanonical decimal ${JSON.stringify(value)}`, () => {
    finding(check1998B(file({ LINE_ITEM_TOTAL: value })), 'INVALID_DECIMAL', 'LINE_ITEM_TOTAL');
  });
}

test('locates a line-total mismatch and shows exact expected/actual values', () => {
  const input = file({ LINE_ITEM_TOTAL: '12.35', INVOICE_TOTAL: '12.35' });
  const issue = finding(check1998B(input), 'LINE_TOTAL_MISMATCH', 'LINE_ITEM_TOTAL');
  assert.equal(issue.expected, '12.34');
  assert.equal(issue.actual, '12.35');
  assert.equal(issue.line, 3);
  assert.equal(issue.offset, input.lastIndexOf('12.35'));
});

test('reports the invoice total against the sum of its line totals', () => {
  const issue = finding(check1998B(file({ INVOICE_TOTAL: '99' })), 'INVOICE_TOTAL_MISMATCH', 'INVOICE_TOTAL');
  assert.equal(issue.expected, '12.34');
  assert.equal(issue.actual, '99');
});

test('does not fabricate aggregate arithmetic after an invalid line total', () => {
  const result = check1998B(file({ LINE_ITEM_TOTAL: 'bad' }, { LINE_ITEM_NUMBER: '002', LINE_ITEM_TOTAL: '3' }));
  finding(result, 'INVALID_DECIMAL', 'LINE_ITEM_TOTAL');
  assert.ok(!result.diagnostics.some(d => d.code === 'INVOICE_TOTAL_MISMATCH'));
});

test('does not fabricate line arithmetic after an invalid adjustment', () => {
  const result = check1998B(file({ LINE_ITEM_ADJUSTMENT_AMOUNT: 'bad' }));
  finding(result, 'INVALID_DECIMAL', 'LINE_ITEM_ADJUSTMENT_AMOUNT');
  assert.ok(!result.diagnostics.some(d => d.code === 'LINE_TOTAL_MISMATCH'));
});

test('uses first invoice metadata and accepts later blank repetitions', () => {
  const result = check1998B(file({ INVOICE_TOTAL: '24.68' }, {
    LINE_ITEM_NUMBER: '002', INVOICE_DATE: '', INVOICE_TOTAL: '', BILLING_START_DATE: '', BILLING_END_DATE: '', INVOICE_DESCRIPTION: '', CLIENT_ID: '',
  }));
  assert.equal(result.status, 'pass', JSON.stringify(result.diagnostics));
});

test('warns about conflicting invoice metadata while retaining first-occurrence arithmetic', () => {
  const result = check1998B(file({ INVOICE_TOTAL: '24.68' }, { LINE_ITEM_NUMBER: '002', INVOICE_TOTAL: '99', INVOICE_DATE: '20261102' }));
  assert.equal(result.status, 'warn');
  assert.equal(finding(result, 'INVOICE_FIELD_CONFLICT', 'INVOICE_TOTAL').record, 2);
  finding(result, 'INVOICE_FIELD_CONFLICT', 'INVOICE_DATE');
  assert.ok(!result.diagnostics.some(d => d.code === 'INVOICE_TOTAL_MISMATCH'));
});

test('treats numerically equal repeated totals as equal', () => {
  assert.equal(check1998B(file({ INVOICE_TOTAL: '24.68' }, { LINE_ITEM_NUMBER: '002', INVOICE_TOTAL: '024.6800' })).status, 'pass');
});

test('warns about conflicting client IDs within the same law-firm matter', () => {
  const result = check1998B(file({}, { INVOICE_NUMBER: 'OTHER', CLIENT_ID: 'OTHER-CLIENT' }));
  assert.equal(result.status, 'warn');
  assert.equal(finding(result, 'MATTER_CLIENT_CONFLICT', 'CLIENT_ID').record, 2);
});

test('sums nonadjacent invoice records independently', () => {
  const result = check1998B(file({ INVOICE_TOTAL: '24.68' }, { INVOICE_NUMBER: 'OTHER' },
    { INVOICE_TOTAL: '24.68', LINE_ITEM_NUMBER: '002' }));
  assert.equal(result.status, 'pass', JSON.stringify(result.diagnostics));
  assert.equal(result.summary.invoiceCount, 2);
});

test('rejects a repeated line ID within a nonadjacent invoice', () => {
  const result = check1998B(file({ INVOICE_TOTAL: '24.68' }, { INVOICE_NUMBER: 'OTHER' }, { INVOICE_TOTAL: '24.68' }));
  assert.equal(finding(result, 'DUPLICATE_LINE_ITEM', 'LINE_ITEM_NUMBER').record, 3);
});

test('permits reused line IDs across invoices and distinguishes leading-zero IDs', () => {
  assert.equal(check1998B(file({}, { INVOICE_NUMBER: 'OTHER' })).status, 'pass');
  assert.equal(check1998B(file({ INVOICE_TOTAL: '24.68', LINE_ITEM_NUMBER: '1' },
    { INVOICE_TOTAL: '24.68', LINE_ITEM_NUMBER: '01' })).status, 'pass');
});

for (const field of ['LINE_ITEM_TOTAL', 'INVOICE_TOTAL']) {
  test(`reports an explicit tolerance boundary for ${field}`, () => {
    const input = file({ [field]: '12.35', ...(field === 'LINE_ITEM_TOTAL' ? { INVOICE_TOTAL: '12.35' } : {}) });
    assert.equal(check1998B(input).status, 'fail');
    const allowed = check1998B(input, { amountTolerance: '0.01' });
    assert.equal(allowed.status, 'warn');
    assert.equal(finding(allowed, 'ROUNDING_DIFFERENCE', field).expected, '12.34');
    assert.equal(check1998B(input, { amountTolerance: '0.0099' }).status, 'fail');
  });
}

test('retains eight-place multiplication precision without binary rounding', () => {
  const input = file({ LINE_ITEM_NUMBER_OF_UNITS: '0.0001', LINE_ITEM_UNIT_COST: '0.0001', LINE_ITEM_TOTAL: '0', INVOICE_TOTAL: '0' });
  assert.equal(finding(check1998B(input), 'LINE_TOTAL_MISMATCH').expected, '0.00000001');
  assert.equal(check1998B(input, { amountTolerance: '0.0001' }).status, 'warn');
});

test('rejects invalid tolerance options instead of silently applying a default', () => {
  for (const options of [null, [], { amountTolerance: -1 }, { amountTolerance: '-0.01' },
    { amountTolerance: 'NaN' }, { amountTolerance: '0.00001' }, { tolerance: '1' }]) {
    finding(check1998B(golden, options), 'INVALID_OPTIONS');
  }
});
