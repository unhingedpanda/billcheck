import type { Ledes1998BField, Ledes1998BRecord } from './format.js';
import type { IssueReporter } from './check.js';
import { parseDecimal } from './decimal.js';
import { TIMEKEEPER_CLASSIFICATIONS, LEGACY_CLASSIFICATIONS } from './classifications.js';

const characterLimits: readonly (readonly [Ledes1998BField, number])[] = [
  ['INVOICE_NUMBER', 20], ['CLIENT_ID', 20], ['LAW_FIRM_MATTER_ID', 20], ['LINE_ITEM_NUMBER', 20],
  ['LINE_ITEM_TASK_CODE', 20], ['LINE_ITEM_EXPENSE_CODE', 20], ['LINE_ITEM_ACTIVITY_CODE', 20],
  ['TIMEKEEPER_ID', 20], ['LAW_FIRM_ID', 20], ['CLIENT_MATTER_ID', 20],
  ['EXP/FEE/INV_ADJ_TYPE', 2], ['TIMEKEEPER_NAME', 30], ['TIMEKEEPER_CLASSIFICATION', 10],
];
const numericWidths: readonly (readonly [Ledes1998BField, number])[] = [
  ['INVOICE_TOTAL', 8], ['LINE_ITEM_NUMBER_OF_UNITS', 6], ['LINE_ITEM_ADJUSTMENT_AMOUNT', 6],
  ['LINE_ITEM_TOTAL', 6], ['LINE_ITEM_UNIT_COST', 6],
];

export function checkFields(record: Ledes1998BRecord, index: number, firstForInvoice: boolean,
  firstForMatter: boolean, add: IssueReporter, checkReferenceClassification = true): void {
  for (const [field, limit] of characterLimits) {
    if (field === 'CLIENT_ID' && !firstForMatter) continue;
    if (record[field].length > limit) add('FIELD_TOO_LONG', index, field, 'error',
      { expected: String(limit), actual: String(record[field].length) });
  }
  for (const field of ['INVOICE_DESCRIPTION', 'LINE_ITEM_DESCRIPTION'] as const) {
    if (field === 'INVOICE_DESCRIPTION' && !firstForInvoice) continue;
    const size = record[field].length;
    // On valid ASCII input one character is one byte. NON_ASCII is handled by parsing.
    if (size > 15360) add('FIELD_TOO_LONG', index, field, 'error', { expected: '15360', actual: String(size) });
    else if (size > 15000) add('DESCRIPTION_SIZE_AMBIGUOUS', index, field, 'warning',
      { expected: '15000', actual: String(size) });
  }
  const name = record.TIMEKEEPER_NAME;
  const comma = name.indexOf(',');
  if (name.trim() !== '' && (comma < 0 || name.slice(0, comma).trim() === '' || name.slice(comma + 1).trim() === '')) {
    add('INVALID_TIMEKEEPER_NAME', index, 'TIMEKEEPER_NAME');
  }
  const classification = record.TIMEKEEPER_CLASSIFICATION;
  if (checkReferenceClassification && classification.trim() !== '' && !TIMEKEEPER_CLASSIFICATIONS.has(classification)) {
    if (LEGACY_CLASSIFICATIONS.has(classification)) add('LEGACY_TIMEKEEPER_CLASSIFICATION', index, 'TIMEKEEPER_CLASSIFICATION', 'warning');
    else add('UNKNOWN_TIMEKEEPER_CLASSIFICATION', index, 'TIMEKEEPER_CLASSIFICATION');
  }
  const adjustment = ['IF', 'IE'].includes(record['EXP/FEE/INV_ADJ_TYPE']);
  for (const [field, digits] of numericWidths) {
    if (field === 'INVOICE_TOTAL' && !firstForInvoice) continue;
    if (adjustment && (field === 'LINE_ITEM_NUMBER_OF_UNITS' || field === 'LINE_ITEM_UNIT_COST')) continue;
    const value = record[field];
    if (parseDecimal(value) === null) continue;
    const whole = value.replace(/^[+-]/, '').split('.')[0]!.replace(/^0+/, '');
    if (whole.length > digits) add('NUMERIC_WIDTH', index, field, 'warning',
      { expected: String(digits), actual: String(whole.length) });
  }
}
