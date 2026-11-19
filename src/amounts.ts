import { DECIMAL_SCALE, formatDecimal, parseDecimal } from './decimal.js';
import type { Ledes1998BField, Ledes1998BRecord } from './format.js';
import type { IssueReporter } from './check.js';

interface InvoiceAmounts {
  index: number;
  total: bigint | null;
  sum: bigint;
  complete: boolean;
  lineIds: Set<string>;
}

export function checkAmounts(records: Ledes1998BRecord[], add: IssueReporter, tolerance: bigint): void {
  const invoices = new Map<string, InvoiceAmounts>();
  const compare = (code: string, index: number, field: Ledes1998BField, actual: bigint, expected: bigint, places: 4 | 8) => {
    const difference = actual > expected ? actual - expected : expected - actual;
    if (difference === 0n) return;
    const limit = places === 8 ? tolerance * DECIMAL_SCALE : tolerance;
    const withinTolerance = difference <= limit;
    add(withinTolerance ? 'ROUNDING_DIFFERENCE' : code, index, field, withinTolerance ? 'warning' : 'error',
      { expected: formatDecimal(expected, places), actual: records[index]![field] });
  };

  records.forEach((record, index) => {
    const number = record.INVOICE_NUMBER;
    const numeric = (field: Ledes1998BField, empty: bigint | null, required = false): bigint | null => {
      const value = record[field];
      if (value.trim() === '') {
        if (required) add('REQUIRED_FIELD', index, field);
        return empty;
      }
      const amount = parseDecimal(value);
      if (amount === null) add('INVALID_DECIMAL', index, field);
      return amount;
    };
    const lineTotal = numeric('LINE_ITEM_TOTAL', null);
    const adjustment = numeric('LINE_ITEM_ADJUSTMENT_AMOUNT', 0n);
    const type = record['EXP/FEE/INV_ADJ_TYPE'];
    if (type === 'F' || type === 'E') {
      const units = numeric('LINE_ITEM_NUMBER_OF_UNITS', null, true);
      const cost = numeric('LINE_ITEM_UNIT_COST', null, true);
      if (units === 0n) add('ZERO_UNITS', index, 'LINE_ITEM_NUMBER_OF_UNITS');
      if (cost === 0n) add('ZERO_UNIT_COST', index, 'LINE_ITEM_UNIT_COST');
      if (units !== null && cost !== null && units !== 0n && cost !== 0n && adjustment !== null && lineTotal !== null) {
        compare('LINE_TOTAL_MISMATCH', index, 'LINE_ITEM_TOTAL', lineTotal * DECIMAL_SCALE,
          units * cost + adjustment * DECIMAL_SCALE, 8);
      }
    } else if ((type === 'IF' || type === 'IE') && lineTotal !== null && adjustment !== null) {
      compare('LINE_TOTAL_MISMATCH', index, 'LINE_ITEM_TOTAL', lineTotal, adjustment, 4);
    }

    // A missing invoice ID must not merge otherwise unrelated invalid records.
    if (number.trim() === '') return;
    let invoice = invoices.get(number);
    if (!invoice) {
      invoice = { index, total: numeric('INVOICE_TOTAL', null), sum: 0n, complete: true, lineIds: new Set() };
      invoices.set(number, invoice);
    }
    const id = record.LINE_ITEM_NUMBER;
    if (id.trim() !== '') {
      if (invoice.lineIds.has(id)) add('DUPLICATE_LINE_ITEM', index, 'LINE_ITEM_NUMBER');
      invoice.lineIds.add(id);
    }
    if (lineTotal === null) invoice.complete = false;
    else invoice.sum += lineTotal;
  });
  for (const invoice of invoices.values()) {
    if (invoice.complete && invoice.total !== null) {
      compare('INVOICE_TOTAL_MISMATCH', invoice.index, 'INVOICE_TOTAL', invoice.total, invoice.sum, 4);
    }
  }
}
