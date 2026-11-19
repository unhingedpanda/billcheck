import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parse1998B, build1998B } from '../../dist/index.js';

export const golden = readFileSync(new URL('../fixtures/synthetic-1998b.txt', import.meta.url), 'utf8');
export const seed = parse1998B(golden).records[0];
export function file(...changes) {
  const result = build1998B(changes.map(change => ({ ...seed, ...change })));
  assert.notEqual(result.text, null, JSON.stringify(result.diagnostics));
  return result.text;
}
export const issues = (report, code, field) => report.diagnostics.filter(d => d.code === code && (!field || d.field === field));
