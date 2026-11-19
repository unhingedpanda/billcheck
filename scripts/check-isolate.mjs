import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SourceTextModule, createContext, runInContext } from 'node:vm';

// This harness uses Node outside the isolate. Library modules receive only
// standard JavaScript globals, as a local check of a Workers-style boundary.
const context = createContext({});
const modules = new Map();
const base = new URL('../dist/', import.meta.url);
async function load(url) {
  if (!url.href.startsWith(base.href)) throw new Error('Unexpected runtime import');
  if (!modules.has(url.href)) {
    modules.set(url.href, new SourceTextModule(await readFile(url, 'utf8'), {
      context, identifier: url.href,
    }));
  }
  return modules.get(url.href);
}
const entry = await load(new URL('index.js', base));
await entry.link((specifier, parent) => {
  if (!specifier.startsWith('./')) throw new Error('Nonlocal runtime import');
  return load(new URL(specifier, parent.identifier));
});
await entry.evaluate();
assert.equal(runInContext('typeof process', context), 'undefined');
assert.equal(runInContext('typeof Buffer', context), 'undefined');
const golden = await readFile(new URL('../tests/fixtures/synthetic-1998b.txt', import.meta.url), 'utf8');
const bytes = runInContext(`Uint8Array.from(${JSON.stringify([...new TextEncoder().encode(golden)])})`, context);
const parsed = entry.namespace.parse1998B(bytes);
assert.equal(parsed.records.length, 1);
assert.equal(parsed.diagnostics.length, 0);
assert.equal(entry.namespace.build1998B(parsed.records).text, golden);
assert.equal(entry.namespace.check1998B(bytes).status, 'pass');
const mismatch = entry.namespace.check1998B(golden.replace('12.3400', '99'));
assert.equal(mismatch.status, 'fail');
assert.equal(mismatch.diagnostics.find(d => d.code === 'INVOICE_TOTAL_MISMATCH').expected, '12.34');
assert.equal(entry.namespace.explain('INVALID_DATE').code, 'INVALID_DATE');
console.log('PASS: ESM import, byte parse, build, exact-amount check and explain without Node globals.');
console.log('This is a local runtime check. Cloudflare deployment and live portal behavior are untested.');
