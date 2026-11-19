import { HEADER, LEDES_1998B_FIELDS, characterIssues } from './format.js';
import type { Diagnostic, Ledes1998BRecord } from './format.js';

export interface BuildResult {
  /** Null on any error. The builder never returns a partial invoice. */
  text: string | null;
  diagnostics: Diagnostic[];
}

/**
 * Emit canonical ASCII 1998B framing without repairing or coercing fields.
 * This checks safe serialization, not dates, amounts or client billing rules.
 */
export function build1998B(records: readonly Ledes1998BRecord[]): BuildResult {
  if (!Array.isArray(records) || records.length === 0) {
    return { text: null, diagnostics: [{ code: 'INVALID_INPUT', severity: 'error',
      message: 'Supply a nonempty array of LEDES 1998B records.',
    }] };
  }
  const diagnostics: Diagnostic[] = [];
  const lines = ['LEDES1998B[]', HEADER + '[]'];
  for (let i = 0; i < records.length; i++) {
    const input: unknown = records[i];
    const record = i + 1;
    if (input === null || typeof input !== 'object' || Array.isArray(input)) {
      diagnostics.push({ code: 'INVALID_RECORD', severity: 'error', record,
        message: 'Each record must be an object with 24 string fields.',
      });
      continue;
    }
    for (const key of Reflect.ownKeys(input)) {
      if (typeof key !== 'string' || !(LEDES_1998B_FIELDS as readonly string[]).includes(key)) {
        diagnostics.push({ code: 'UNKNOWN_FIELD', severity: 'error', record,
          message: `Unknown field: ${String(key)}.`,
        });
      }
    }
    const values: string[] = [];
    for (const field of LEDES_1998B_FIELDS) {
      if (!Object.hasOwn(input, field)) {
        diagnostics.push({ code: 'MISSING_FIELD', severity: 'error', record, field,
          message: 'Supply this field explicitly, including an empty string when appropriate.',
        });
        continue;
      }
      const value: unknown = (input as Record<string, unknown>)[field];
      if (typeof value !== 'string') {
        diagnostics.push({ code: 'INVALID_FIELD', severity: 'error', record, field,
          message: 'Field values must be strings. No automatic conversion is performed.',
        });
        continue;
      }
      if (value.includes('|') || value.includes('[]')) {
        diagnostics.push({ code: 'RESERVED_CHARACTER', severity: 'error', record, field,
          message: 'A field must not contain a pipe separator or [] record terminator.',
        });
      }
      for (const issue of characterIssues(value)) {
        diagnostics.push({ code: issue.code, message: issue.message, severity: 'error', record, field });
      }
      values.push(value);
    }
    lines.push(values.join('|') + '[]');
  }
  return { text: diagnostics.length ? null : lines.join('\r\n') + '\r\n', diagnostics };
}
