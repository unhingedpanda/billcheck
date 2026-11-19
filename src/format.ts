/** Field order from the LOC 1998B field specification, revision July 2014. */
export const LEDES_1998B_FIELDS = Object.freeze([
  'INVOICE_DATE', 'INVOICE_NUMBER', 'CLIENT_ID', 'LAW_FIRM_MATTER_ID',
  'INVOICE_TOTAL', 'BILLING_START_DATE', 'BILLING_END_DATE', 'INVOICE_DESCRIPTION',
  'LINE_ITEM_NUMBER', 'EXP/FEE/INV_ADJ_TYPE', 'LINE_ITEM_NUMBER_OF_UNITS',
  'LINE_ITEM_ADJUSTMENT_AMOUNT', 'LINE_ITEM_TOTAL', 'LINE_ITEM_DATE',
  'LINE_ITEM_TASK_CODE', 'LINE_ITEM_EXPENSE_CODE', 'LINE_ITEM_ACTIVITY_CODE',
  'TIMEKEEPER_ID', 'LINE_ITEM_DESCRIPTION', 'LAW_FIRM_ID', 'LINE_ITEM_UNIT_COST',
  'TIMEKEEPER_NAME', 'TIMEKEEPER_CLASSIFICATION', 'CLIENT_MATTER_ID',
] as const);

export type Ledes1998BField = typeof LEDES_1998B_FIELDS[number];
/** All fields remain strings, including amounts, dates and empty values. */
export type Ledes1998BRecord = Record<Ledes1998BField, string>;

export interface FieldLocation { offset: number; line: number; column: number }
export type RecordLocations = Record<Ledes1998BField, FieldLocation>;

export interface Diagnostic {
  /** Project-owned identifier. A related LOC code, when one maps, is `locCode` on check results. */
  code: string;
  severity: 'error' | 'warning';
  message: string;
  /** One-based physical line and column in the source, when available. */
  line?: number;
  column?: number;
  /** Zero-based byte offset for byte input, UTF-16 offset for strings. */
  offset?: number;
  /** One-based data record index. Signature and header are excluded. */
  record?: number;
  field?: Ledes1998BField;
}

export interface ParseResult {
  /** Null means structural failure. Non-null records may still have errors. */
  records: Ledes1998BRecord[] | null;
  /** Field starts aligned with records, or null on structural failure. */
  locations: RecordLocations[] | null;
  diagnostics: Diagnostic[];
}

export const HEADER = LEDES_1998B_FIELDS.join('|');

/** Report the first instance of each character problem within a field. */
export function characterIssues(value: string): { code: string; message: string; index: number }[] {
  const issues = [];
  const nonAscii = value.search(/[^\x00-\x7f]/);
  if (nonAscii !== -1) issues.push({
    code: 'NON_ASCII', message: 'This field contains a non-ASCII character. Review it before export.', index: nonAscii,
  });
  const control = value.search(/[\x00-\x1f\x7f]/);
  if (control !== -1) issues.push({
    code: 'INVALID_CONTROL', message: 'This field contains a control character. Review it before export.', index: control,
  });
  return issues;
}
