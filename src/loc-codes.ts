import type { Ledes1998BField } from './format.js';

/**
 * Related identifiers from the LEDES Oversight Committee's Standardized Error Codes V2, 2024-09,
 * used with LOC permission. Only identifiers are copied. Error names and messages are not.
 * Each comment names the spreadsheet row on the workbook's "V2 Error Codes" sheet, not the
 * sheet's own "Row #" column. An entry exists only where
 * exactly one 98B row matches the rule, field and line type. Ambiguous cases stay unmapped.
 */
const structural: Readonly<Record<string, string>> = {
  INVALID_HEADER: '1-0003', // row 5
  FIELD_COUNT: '1-0003', // row 5
};

/** Invoice and matter fields, independent of line type. */
const invoiceLevel: Readonly<Record<string, string>> = {
  'REQUIRED_FIELD INVOICE_NUMBER': '401-0031', // row 260
  'REQUIRED_FIELD INVOICE_DATE': '402-0031', // row 266
  'REQUIRED_FIELD BILLING_START_DATE': '407-0031', // row 283
  'REQUIRED_FIELD BILLING_END_DATE': '408-0031', // row 288
  'REQUIRED_FIELD INVOICE_TOTAL': '459-0031', // row 412
  'REQUIRED_FIELD CLIENT_ID': '301-0031', // row 164
  'REQUIRED_FIELD LAW_FIRM_MATTER_ID': '802-0031', // row 544
  'REQUIRED_FIELD EXP/FEE/INV_ADJ_TYPE': '847-0031', // row 678
  'INVALID_DATE INVOICE_DATE': '402-0036', // row 270
  'INVALID_DATE BILLING_START_DATE': '407-0036', // row 286
  'INVALID_DATE BILLING_END_DATE': '408-0036', // row 292
  'INVALID_DECIMAL INVOICE_TOTAL': '459-0037', // row 416
  'INVOICE_TOTAL_MISMATCH INVOICE_TOTAL': '459-0041', // row 418
};

/** Line fields. IE uses the IF entries because both map to the same sheet rows. */
const lineLevel: Readonly<Record<string, string>> = {
  'REQUIRED_FIELD LINE_ITEM_NUMBER F': '1319-0031', // row 1024
  'REQUIRED_FIELD LINE_ITEM_TOTAL F': '1318-0031', // row 1018
  'REQUIRED_FIELD LINE_ITEM_DATE F': '1301-0031', // rows 912, 913
  'REQUIRED_FIELD LINE_ITEM_DESCRIPTION F': '1308-0031', // row 945
  'REQUIRED_FIELD TIMEKEEPER_NAME F': '1204-0031', // row 857
  'REQUIRED_FIELD LINE_ITEM_NUMBER_OF_UNITS F': '1313-0031', // row 980
  'INVALID_DATE LINE_ITEM_DATE F': '1301-0036', // row 917
  'INVALID_DECIMAL LINE_ITEM_TOTAL F': '1318-0037', // row 1019
  'INVALID_DECIMAL LINE_ITEM_NUMBER_OF_UNITS F': '1313-0040', // row 984
  'LINE_TOTAL_MISMATCH LINE_ITEM_TOTAL F': '1318-0041', // row 1020
  'DUPLICATE_LINE_ITEM LINE_ITEM_NUMBER F': '1319-0035', // row 1028

  'REQUIRED_FIELD LINE_ITEM_NUMBER E': '1619-0031', // row 1189
  'REQUIRED_FIELD LINE_ITEM_TOTAL E': '1617-0031', // row 1181
  'REQUIRED_FIELD LINE_ITEM_DATE E': '1601-0031', // row 1087
  'REQUIRED_FIELD LINE_ITEM_EXPENSE_CODE E': '1609-0031', // row 1136
  'REQUIRED_FIELD LINE_ITEM_NUMBER_OF_UNITS E': '1612-0031', // row 1152
  'REQUIRED_FIELD LINE_ITEM_UNIT_COST E': '1613-0031', // row 1163
  'INVALID_DATE LINE_ITEM_DATE E': '1601-0036', // row 1092
  'INVALID_DECIMAL LINE_ITEM_TOTAL E': '1617-0037', // row 1182
  'INVALID_DECIMAL LINE_ITEM_UNIT_COST E': '1613-0037', // row 1167
  'INVALID_DECIMAL LINE_ITEM_ADJUSTMENT_AMOUNT E': '1706-0037', // row 1229
  'INVALID_DECIMAL LINE_ITEM_NUMBER_OF_UNITS E': '1612-0040', // row 1156
  'LINE_TOTAL_MISMATCH LINE_ITEM_TOTAL E': '1617-0041', // row 1183
  'DUPLICATE_LINE_ITEM LINE_ITEM_NUMBER E': '1619-0035', // row 1193

  'REQUIRED_FIELD LINE_ITEM_NUMBER IF': '1019-0031', // row 805
  'REQUIRED_FIELD LINE_ITEM_TOTAL IF': '1018-0031', // row 798
  'INVALID_DECIMAL LINE_ITEM_TOTAL IF': '1018-0037', // row 800
  'INVALID_DECIMAL LINE_ITEM_ADJUSTMENT_AMOUNT IF': '1016-0037', // row 789
  'LINE_TOTAL_MISMATCH LINE_ITEM_TOTAL IF': '1018-0041', // row 801
  'DUPLICATE_LINE_ITEM LINE_ITEM_NUMBER IF': '1019-0035', // row 809
};

/** Return the related LOC V2 identifier, or undefined when none maps unambiguously. */
export function locCodeFor(code: string, field?: Ledes1998BField, lineType?: string): string | undefined {
  if (field === undefined) return Object.hasOwn(structural, code) ? structural[code] : undefined;
  const invoiceKey = `${code} ${field}`;
  if (Object.hasOwn(invoiceLevel, invoiceKey)) return invoiceLevel[invoiceKey];
  const lineKey = `${invoiceKey} ${lineType === 'IE' ? 'IF' : lineType}`;
  return Object.hasOwn(lineLevel, lineKey) ? lineLevel[lineKey] : undefined;
}

/** Every identifier the mapping can return, for tests and documentation. */
export const MAPPED_LOC_CODES: readonly string[] = Object.freeze(
  [...new Set([...Object.values(structural), ...Object.values(invoiceLevel), ...Object.values(lineLevel)])].sort());
