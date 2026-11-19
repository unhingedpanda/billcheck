import { parseDecimal } from './decimal.js';

export type Ledes1998BCodeField = 'LINE_ITEM_TASK_CODE' | 'LINE_ITEM_ACTIVITY_CODE' |
  'LINE_ITEM_EXPENSE_CODE' | 'TIMEKEEPER_CLASSIFICATION';
export type CodeLists = Partial<Record<Ledes1998BCodeField, readonly string[]>>;
export interface CheckOptions { amountTolerance?: string; codeLists?: CodeLists }

const codeFields: readonly Ledes1998BCodeField[] = [
  'LINE_ITEM_TASK_CODE', 'LINE_ITEM_ACTIVITY_CODE', 'LINE_ITEM_EXPENSE_CODE', 'TIMEKEEPER_CLASSIFICATION',
];

function dataObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== null && prototype !== Object.prototype) return false;
  return Reflect.ownKeys(value).every(key => typeof key === 'string' &&
    Object.hasOwn(Object.getOwnPropertyDescriptor(value, key)!, 'value'));
}

/** Compile plain-data configuration. Reject accessors and catch inspection failures. */
export function readCheckOptions(options: unknown): {
  tolerance: bigint;
  codeLists: ReadonlyMap<Ledes1998BCodeField, ReadonlySet<string>>;
} | null {
  // JavaScript callers can supply proxies. Reflection can run traps or throw.
  try { return inspectOptions(options); }
  catch { return null; }
}

function inspectOptions(options: unknown): {
  tolerance: bigint;
  codeLists: ReadonlyMap<Ledes1998BCodeField, ReadonlySet<string>>;
} | null {
  if (!dataObject(options)) return null;
  // Include non-enumerable own options in the same strict schema.
  if (Object.getOwnPropertyNames(options).some(key => key !== 'amountTolerance' && key !== 'codeLists')) return null;
  let tolerance = 0n;
  if (Object.hasOwn(options, 'amountTolerance')) {
    const amount = options.amountTolerance;
    if (typeof amount !== 'string') return null;
    const parsed = parseDecimal(amount);
    if (parsed === null || parsed < 0n) return null;
    tolerance = parsed;
  }
  const codeLists = new Map<Ledes1998BCodeField, ReadonlySet<string>>();
  if (!Object.hasOwn(options, 'codeLists')) return { tolerance, codeLists };
  const supplied = options.codeLists;
  if (!dataObject(supplied)) return null;
  for (const field of Object.getOwnPropertyNames(supplied)) {
    if (!codeFields.includes(field as Ledes1998BCodeField)) return null;
    const values = supplied[field];
    if (!Array.isArray(values) || Reflect.ownKeys(values).length !== values.length + 1) return null;
    const accepted = new Set<string>();
    for (let index = 0; index < values.length; index++) {
      const descriptor = Object.getOwnPropertyDescriptor(values, String(index));
      if (!descriptor || !Object.hasOwn(descriptor, 'value')) return null;
      const value: unknown = descriptor.value;
      const limit = field === 'TIMEKEEPER_CLASSIFICATION' ? 10 : 20;
      if (typeof value !== 'string' || value === '' || value.trim() !== value || value.length > limit ||
        !/^[\x20-\x7E]+$/.test(value) || value.includes('|') || value.includes('[]') || accepted.has(value)) return null;
      accepted.add(value);
    }
    codeLists.set(field as Ledes1998BCodeField, accepted);
  }
  return { tolerance, codeLists };
}
