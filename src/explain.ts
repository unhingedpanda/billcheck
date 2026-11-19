const SPEC = 'https://ledes.org/wp-content/uploads/2014/08/Ledes-1998B-Format-Rev-7-2014.xls';
const SAMPLE = 'https://ledes.org/wp-content/uploads/2017/11/Ledes98B-Sample-File-Rev-7-2014.txt';
const ASCII = 'https://ledes.org/ledes-98b-format/';
const POLICY = 'billcheck local validation policy (README.md)';
const CLASSIFICATIONS = 'https://ledes.org/wp-content/uploads/2023/06/LEDES-Revised-Timekeeper-Classifications-Reference-Document-6-2023-Upd.xlsx';

export interface RuleExplanation {
  readonly code: string;
  readonly title: string;
  readonly explanation: string;
  readonly suggestion: string;
  readonly source: string;
}

// These are original billcheck explanations, not LOC error-code descriptions.
const definitions: readonly (readonly [string, string, string, string, string])[] = [
  ['INVALID_INPUT', 'Unsupported input', 'The operation cannot read this input shape.', 'Provide a string or byte array for checking, or a record array for building.', POLICY],
  ['INVALID_SIGNATURE', 'Wrong format signature', 'The file does not identify itself as LEDES 1998B.', 'Use the 1998B exporter and ensure the file starts with LEDES1998B[].', SAMPLE],
  ['INVALID_HEADER', 'Incorrect or repeated header', 'Column names or their position make record interpretation unsafe.', 'Use the exact 24-field header once, after the signature.', SAMPLE],
  ['MISSING_TERMINATOR', 'Incomplete record', 'A record has no closing [] marker.', 'Check the indicated record and restore its terminator without dropping data.', SAMPLE],
  ['FIELD_COUNT', 'Wrong number of fields', 'A record cannot be mapped reliably to 24 fields.', 'Inspect missing separators or literal pipes in field text.', SAMPLE],
  ['EMPTY_DOCUMENT', 'No invoice records', 'The file contains no data records to check.', 'Export at least one complete invoice line.', POLICY],
  ['NON_ASCII', 'Non-ASCII content', '1998B uses ASCII. This value contains another character or byte.', 'Review the source text and explicitly replace or re-export unsupported characters.', ASCII],
  ['INVALID_CONTROL', 'Control character in a field', 'Invisible controls can alter how records are read.', 'Inspect the original field and remove unintended controls explicitly.', POLICY],
  ['NON_CANONICAL_NEWLINE', 'Noncanonical record ending', 'The parser accepted framing that differs from canonical CRLF output.', 'Export CRLF after every [] terminator, including the last record.', SAMPLE],
  ['TRAILING_WHITESPACE', 'Whitespace after the last record', 'Extra trailing whitespace is outside the invoice records.', 'Review the tail and use canonical export if it contains no data.', POLICY],
  ['INVALID_RECORD', 'Invalid record object', 'The builder needs a complete record object.', 'Supply all 24 own fields as strings.', POLICY],
  ['UNKNOWN_FIELD', 'Unknown field', 'The builder will not silently discard an extra field.', 'Map the extra data intentionally before exporting 1998B.', POLICY],
  ['MISSING_FIELD', 'Missing field key', 'The builder cannot infer an omitted field.', 'Supply the field explicitly, using an empty string only when allowed.', POLICY],
  ['INVALID_FIELD', 'Non-string field value', 'Automatic conversion could lose formatting or precision.', 'Provide the original value as a string.', POLICY],
  ['RESERVED_CHARACTER', 'Delimiter inside a value', 'A pipe or [] would change record boundaries.', 'Review the source value before replacing a reserved sequence.', POLICY],
  ['REQUIRED_FIELD', 'Required value missing', 'This field is required for the applicable record or first occurrence.', 'Restore the value from the billing source. Do not invent a placeholder.', SPEC],
  ['INVALID_DATE', 'Invalid date', 'This value is not a real calendar date in the required format.', 'Use YYYYMMDD with a valid year, month and day.', SPEC],
  ['FIELD_TOO_LONG', 'Field exceeds its length limit', 'The field exceeds its character limit. For descriptions, this check uses the larger 15,360-byte interpretation of 15KB. Expected and actual show maximum and observed character counts.', 'Review the source and shorten the value explicitly. Do not truncate identifiers automatically.', SPEC],
  ['DESCRIPTION_SIZE_AMBIGUOUS', 'Description approaches the 15KB limit', 'The description exceeds 15,000 ASCII bytes but fits within 15,360. The workbook does not define whether KB is decimal or binary. Expected and actual show the conservative limit and observed count.', 'Confirm the receiver’s limit, or shorten the description to at most 15,000 ASCII characters.', SPEC],
  ['INVALID_TIMEKEEPER_NAME', 'Timekeeper name needs surname, given name', 'The name must contain a nonempty surname before a comma and a nonempty given-name portion after it.', 'Format the source name as Last name, First name without inventing missing parts.', SPEC],
  ['UNKNOWN_TIMEKEEPER_CLASSIFICATION', 'Unknown reference classification', 'This value is absent from the LOC June 2023 timekeeper classification identifiers. Membership does not establish role eligibility or client approval.', 'Confirm the exact classification with the source system, or supply the receiver’s explicit classification list.', CLASSIFICATIONS],
  ['LEGACY_TIMEKEEPER_CLASSIFICATION', 'Former timekeeper classification', 'This is a former 1998B classification identifier. The reference now lists revised identifiers, and a former code can have more than one replacement.', 'Confirm the receiver’s accepted classification. Do not map the former value automatically.', CLASSIFICATIONS],
  ['NUMERIC_WIDTH', 'Numeric width needs receiver confirmation', 'The value exceeds 6 significant whole digits for 10.4 or 8 for 12.4. This is an inferred interpretation because the 1998B workbook does not define the notation. Expected and actual show whole-digit counts.', 'Confirm the receiver’s numeric limit. The checker preserves the amount and checks arithmetic exactly.', SPEC],
  ['INVALID_LINE_TYPE', 'Unknown line type', 'The type controls fee, expense and adjustment checks.', 'Use F, E, IF or IE to match the actual entry.', SPEC],
  ['INVALID_BILLING_PERIOD', 'Reversed billing period', 'The billing end precedes the billing start.', 'Confirm both period dates against the source invoice.', SPEC],
  ['LINE_DATE_OUTSIDE_PERIOD', 'Line date outside billing period', 'Line dates are usually within the billing period, but exceptions may be valid.', 'Confirm the date and the receiving client’s policy before changing it.', SPEC],
  ['ACTIVITY_WITHOUT_TASK', 'Activity without task', 'The field notes advise against an activity code without a task code.', 'Confirm the receiving client’s required code set and supply the appropriate task if needed.', SPEC],
  ['INVALID_DECIMAL', 'Invalid decimal', 'The value cannot be checked as a plain decimal with at most four fractional digits.', 'Use a decimal string without grouping, exponent notation or currency symbols.', SPEC],
  ['ZERO_UNITS', 'Zero units', 'Fee and expense entries need nonzero units.', 'Confirm the actual units, or use an invoice adjustment type when appropriate.', SPEC],
  ['ZERO_UNIT_COST', 'Zero unit cost', 'Fee and expense entries need a nonzero unit cost.', 'Confirm the unit cost or the correct adjustment type.', SPEC],
  ['DUPLICATE_LINE_ITEM', 'Duplicate line ID', 'Line IDs must be unique within each invoice.', 'Restore the correct source identifier for each line without deleting legitimate entries.', SPEC],
  ['LINE_TOTAL_MISMATCH', 'Line total does not reconcile', 'The stated total differs from the applicable line formula beyond the configured tolerance.', 'Compare units, cost, adjustment and total with the source. Confirm the receiver’s rounding policy.', SPEC],
  ['INVOICE_TOTAL_MISMATCH', 'Invoice total does not reconcile', 'The first invoice total differs from its line-total sum beyond the configured tolerance.', 'Check missing lines, duplicates and adjustments before changing the invoice total.', SPEC],
  ['ROUNDING_DIFFERENCE', 'Difference within supplied tolerance', 'The values differ, but the difference falls within the caller’s explicit tolerance.', 'Confirm that this tolerance is agreed with the receiving client.', POLICY],
  ['INVOICE_FIELD_CONFLICT', 'Conflicting repeated invoice field', 'The workbook gives the first occurrence precedence over later invoice metadata.', 'Compare the repeated values and confirm the first occurrence is correct.', SPEC],
  ['MATTER_CLIENT_CONFLICT', 'Conflicting client for a matter', 'The first client ID for a law-firm matter governs later occurrences.', 'Check the matter/client mapping in the billing source.', SPEC],
  ['CODE_NOT_ALLOWED', 'Code absent from the supplied list', 'The nonblank field value does not exactly match an entry in the caller-supplied list. Case and whitespace remain significant.', 'Confirm the code with the receiving client and update the source or the supplied list explicitly.', 'caller-supplied codeLists (README.md)'],
  ['INVALID_OPTIONS', 'Invalid checker options', 'An option or code list has an unsupported shape or value. Only plain data, known fields, valid decimal tolerance and unique printable ASCII codes within field limits are accepted.', 'Use amountTolerance as a nonnegative decimal string and codeLists as field-name arrays. See README.md for the exact schema.', POLICY],
];

const rules = new Map<string, RuleExplanation>(definitions.map(([code, title, explanation, suggestion, source]) =>
  [code, Object.freeze({ code, title, explanation, suggestion, source })]));

/** Explain a billcheck diagnostic. Unknown and LOC identifiers return null. */
export function explain(code: string): RuleExplanation | null {
  return rules.get(code) ?? null;
}
