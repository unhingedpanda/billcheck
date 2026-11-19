import { parse1998B } from './parse.js';
import { explain } from './explain.js';
import { parseDecimal } from './decimal.js';
import { checkAmounts } from './amounts.js';
import { checkFields } from './field-rules.js';
import { readCheckOptions } from './code-lists.js';
import { locCodeFor } from './loc-codes.js';
import type { CheckOptions } from './code-lists.js';
import type { Diagnostic, Ledes1998BField, Ledes1998BRecord } from './format.js';

export type { CheckOptions } from './code-lists.js';
export interface CheckDiagnostic extends Diagnostic {
  explanation: string;
  suggestion: string;
  source: string;
  /** Related LOC Standardized Error Code V2 identifier, present only where one maps unambiguously. */
  locCode?: string;
  expected?: string;
  actual?: string;
}
export interface CheckResult {
  status: 'pass' | 'warn' | 'fail';
  summary: { recordCount: number; invoiceCount: number; errorCount: number; warningCount: number };
  diagnostics: CheckDiagnostic[];
}

const invoiceFields = ['INVOICE_DATE', 'INVOICE_TOTAL', 'BILLING_START_DATE', 'BILLING_END_DATE', 'INVOICE_DESCRIPTION'] as const;
const alwaysRequired: readonly Ledes1998BField[] = ['INVOICE_NUMBER', 'LAW_FIRM_MATTER_ID', 'LINE_ITEM_NUMBER',
  'EXP/FEE/INV_ADJ_TYPE', 'LINE_ITEM_TOTAL', 'LINE_ITEM_DATE', 'LAW_FIRM_ID'];
const feeRequired: readonly Ledes1998BField[] = ['TIMEKEEPER_ID', 'TIMEKEEPER_NAME', 'TIMEKEEPER_CLASSIFICATION', 'LINE_ITEM_DESCRIPTION'];
const blank = (value: string): boolean => value.trim() === '';
export type IssueReporter = (code: string, index: number, field: Ledes1998BField,
  severity?: 'error' | 'warning', amounts?: { expected: string; actual: string }) => void;

/** Check implemented 1998B rules, without repairing or submitting the file. */
export function check1998B(input: string | Uint8Array, options: CheckOptions = {}): CheckResult {
  const parsed = parse1998B(input);
  const diagnostics: (Diagnostic & { expected?: string; actual?: string })[] = [...parsed.diagnostics];
  const invoices = new Map<string, number>();
  const matters = new Map<string, number>();
  const records = parsed.records;
  const add: IssueReporter = (code, index, field, severity = 'error', amounts) => {
    const rule = explain(code)!;
    diagnostics.push({ code, severity, message: rule.title, record: index + 1, field, ...parsed.locations![index]![field], ...amounts });
  };
  const configuration = readCheckOptions(options);
  if (configuration === null) {
    diagnostics.push({ code: 'INVALID_OPTIONS', severity: 'error', message: explain('INVALID_OPTIONS')!.title });
    return result(records, diagnostics);
  }
  const { tolerance, codeLists } = configuration;

  if (records !== null) records.forEach((record, index) => {
    const number = record.INVOICE_NUMBER;
    const firstIndex = blank(number) ? index : invoices.get(number) ?? index;
    if (!blank(number) && !invoices.has(number)) invoices.set(number, index);
    const first = records[firstIndex]!;
    const firstForInvoice = firstIndex === index;
    const matter = record.LAW_FIRM_MATTER_ID;
    const firstForMatter = blank(matter) || !matters.has(matter);
    if (!blank(matter) && firstForMatter) matters.set(matter, index);
    const type = record['EXP/FEE/INV_ADJ_TYPE'];
    const required = [...alwaysRequired];
    if (firstForInvoice) required.push(...invoiceFields.filter(field => field !== 'INVOICE_DESCRIPTION'));
    if (firstForMatter) required.push('CLIENT_ID');
    if (type === 'F') required.push(...feeRequired);
    if (type === 'E') required.push('LINE_ITEM_EXPENSE_CODE');
    for (const field of required) if (blank(record[field])) add('REQUIRED_FIELD', index, field);
    checkFields(record, index, firstForInvoice, firstForMatter, add, !codeLists.has('TIMEKEEPER_CLASSIFICATION'));
    for (const [field, accepted] of codeLists) {
      if (!blank(record[field]) && !accepted.has(record[field])) add('CODE_NOT_ALLOWED', index, field);
    }

    if (!firstForInvoice) for (const field of invoiceFields) {
      if (blank(record[field])) continue;
      const currentAmount = field === 'INVOICE_TOTAL' ? parseDecimal(record[field]) : null;
      const firstAmount = field === 'INVOICE_TOTAL' ? parseDecimal(first[field]) : null;
      const equal = currentAmount !== null && firstAmount !== null ? currentAmount === firstAmount : record[field] === first[field];
      if (!equal) add('INVOICE_FIELD_CONFLICT', index, field, 'warning');
    }
    if (!firstForMatter && !blank(record.CLIENT_ID) && record.CLIENT_ID !== records[matters.get(matter)!]!.CLIENT_ID) {
      add('MATTER_CLIENT_CONFLICT', index, 'CLIENT_ID', 'warning');
    }

    if (!blank(type) && !['F', 'E', 'IF', 'IE'].includes(type)) add('INVALID_LINE_TYPE', index, 'EXP/FEE/INV_ADJ_TYPE');
    const dateFields: Ledes1998BField[] = ['LINE_ITEM_DATE'];
    if (firstForInvoice) dateFields.push('INVOICE_DATE', 'BILLING_START_DATE', 'BILLING_END_DATE');
    for (const field of dateFields) if (!blank(record[field]) && !validDate(record[field])) add('INVALID_DATE', index, field);

    const start = first.BILLING_START_DATE;
    const end = first.BILLING_END_DATE;
    const periodValid = validDate(start) && validDate(end);
    if (firstForInvoice && periodValid && start > end) add('INVALID_BILLING_PERIOD', index, 'BILLING_END_DATE');
    if (periodValid && start <= end && validDate(record.LINE_ITEM_DATE) &&
      (record.LINE_ITEM_DATE < start || record.LINE_ITEM_DATE > end)) add('LINE_DATE_OUTSIDE_PERIOD', index, 'LINE_ITEM_DATE', 'warning');
    if (!blank(record.LINE_ITEM_ACTIVITY_CODE) && blank(record.LINE_ITEM_TASK_CODE)) {
      add('ACTIVITY_WITHOUT_TASK', index, 'LINE_ITEM_ACTIVITY_CODE', 'warning');
    }
  });
  if (records !== null) checkAmounts(records, add, tolerance);
  return result(records, diagnostics);
}

function result(records: Ledes1998BRecord[] | null, diagnostics: (Diagnostic & { expected?: string; actual?: string })[]): CheckResult {
  const enriched = diagnostics.map(diagnostic => {
    const rule = explain(diagnostic.code)!;
    const lineType = diagnostic.record === undefined ? undefined : records?.[diagnostic.record - 1]?.['EXP/FEE/INV_ADJ_TYPE'];
    const locCode = locCodeFor(diagnostic.code, diagnostic.field, lineType);
    return { ...diagnostic, explanation: rule.explanation, suggestion: rule.suggestion, source: rule.source,
      ...(locCode === undefined ? {} : { locCode }) };
  });
  const errorCount = enriched.filter(d => d.severity === 'error').length;
  const warningCount = enriched.length - errorCount;
  return { status: errorCount ? 'fail' : warningCount ? 'warn' : 'pass',
    summary: { recordCount: records?.length ?? 0,
      invoiceCount: new Set(records?.filter(r => !blank(r.INVOICE_NUMBER)).map(r => r.INVOICE_NUMBER)).size,
      errorCount, warningCount }, diagnostics: enriched };
}

function validDate(value: string): boolean {
  if (!/^\d{8}$/.test(value)) return false;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(4, 6));
  const day = Number(value.slice(6, 8));
  if (year === 0 || month < 1 || month > 12 || day < 1) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  return day <= [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]!;
}
