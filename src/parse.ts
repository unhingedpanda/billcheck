import { HEADER, LEDES_1998B_FIELDS, characterIssues } from './format.js';
import type { Diagnostic, Ledes1998BRecord, ParseResult, RecordLocations } from './format.js';

/**
 * Read LEDES 1998B structure without coercing or repairing field values.
 * Byte input maps each byte to the same code point, without guessing an
 * encoding. Non-ASCII bytes are preserved for inspection and reported.
 */
export function parse1998B(input: string | Uint8Array): ParseResult {
  if (typeof input !== 'string' && !(input instanceof Uint8Array)) {
    return { records: null, locations: null, diagnostics: [{
      code: 'INVALID_INPUT', severity: 'error', message: 'Supply a string or Uint8Array.',
    }] };
  }
  const text = typeof input === 'string' ? input : byteString(input);
  const diagnostics: Diagnostic[] = [];
  const records: Ledes1998BRecord[] = [];
  const locations: RecordLocations[] = [];
  const location = sourceLocator(text);
  let position = 0;
  let frame = 0;
  let structuralError = false;

  function issue(code: string, message: string, offset: number, record?: number): void {
    structuralError = true;
    diagnostics.push({ code, message, severity: 'error', ...location(offset),
      ...(record === undefined ? {} : { record }),
    });
  }

  while (position < text.length) {
    // The official sample includes a whitespace-only tail. Preserve a warning
    // rather than interpreting it as an extra invoice record.
    if (/^[ \t\r\n]*$/.test(text.slice(position))) {
      diagnostics.push({ code: 'TRAILING_WHITESPACE', severity: 'warning',
        message: 'Trailing whitespace is outside the last record and will not be exported.',
        ...location(position),
      });
      break;
    }
    const end = text.indexOf('[]', position);
    if (end === -1) {
      issue('MISSING_TERMINATOR', 'A record is missing its [] terminator.', position,
        frame >= 2 ? frame - 1 : undefined);
      break;
    }
    const content = text.slice(position, end);
    if (frame === 0) {
      if (content !== 'LEDES1998B') issue('INVALID_SIGNATURE', 'Expected the LEDES1998B signature.', position);
    } else if (frame === 1) {
      if (content !== HEADER) issue('INVALID_HEADER', 'Expected the 24 LEDES 1998B fields in their defined order.', position);
    } else if (content === HEADER) {
      issue('INVALID_HEADER', 'A repeated header appears where a data record is required.', position, frame - 1);
    } else {
      const values = content.split('|');
      if (values.length !== LEDES_1998B_FIELDS.length) {
        issue('FIELD_COUNT', `Expected 24 fields, received ${values.length}.`, position, frame - 1);
      } else {
        const record = {} as Ledes1998BRecord;
        const fieldLocations = {} as RecordLocations;
        let offset = position;
        for (let i = 0; i < LEDES_1998B_FIELDS.length; i++) {
          const field = LEDES_1998B_FIELDS[i]!;
          const value = values[i]!;
          record[field] = value;
          fieldLocations[field] = location(offset);
          for (const problem of characterIssues(value)) {
            diagnostics.push({ code: problem.code, message: problem.message, severity: 'error',
              ...location(offset + problem.index), record: frame - 1, field,
            });
          }
          offset += value.length + 1;
        }
        records.push(record);
        locations.push(fieldLocations);
      }
    }
    frame++;
    position = end + 2;
    if (text.startsWith('\r\n', position)) {
      position += 2;
    } else {
      diagnostics.push({ code: 'NON_CANONICAL_NEWLINE', severity: 'warning',
        message: 'Canonical output uses CRLF after every record terminator.', ...location(position),
      });
      if (text[position] === '\r' || text[position] === '\n') position++;
    }
  }
  if (frame === 0 && !diagnostics.some(d => d.code === 'INVALID_SIGNATURE')) {
    issue('INVALID_SIGNATURE', 'Expected the LEDES1998B signature.', 0);
  }
  if (frame < 2) issue('INVALID_HEADER', 'The 24-field header is missing.', text.length);
  if (frame === 2) issue('EMPTY_DOCUMENT', 'At least one data record is required.', text.length);
  return { records: structuralError ? null : records, locations: structuralError ? null : locations, diagnostics };
}

function byteString(bytes: Uint8Array): string {
  const chunks = [];
  for (let i = 0; i < bytes.length; i += 8192) {
    chunks.push(String.fromCharCode(...bytes.subarray(i, i + 8192)));
  }
  return chunks.join('');
}

/** Build once, then locate diagnostics without rescanning the whole file. */
function sourceLocator(text: string): (offset: number) => { offset: number; line: number; column: number } {
  const starts = [0];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\r') {
      if (text[i + 1] === '\n') i++;
      starts.push(i + 1);
    } else if (text[i] === '\n') {
      starts.push(i + 1);
    }
  }
  return offset => {
    let lo = 0;
    let hi = starts.length;
    while (lo + 1 < hi) {
      const mid = Math.floor((lo + hi) / 2);
      if (starts[mid]! <= offset) lo = mid;
      else hi = mid;
    }
    return { offset, line: lo + 1, column: offset - starts[lo]! + 1 };
  };
}
