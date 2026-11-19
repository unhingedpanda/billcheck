import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));
const entry = join(root, 'bin/billcheck.mjs');
const fixture = join(root, 'tests/fixtures/synthetic-1998b.txt');
const golden = readFileSync(fixture, 'utf8');
const run = (args, input, cwd = root) => spawnSync(process.execPath, [entry, ...args], { encoding: 'utf8', input, cwd });

test('CLI checks a local file as JSON without exposing raw invoice records', () => {
  const result = run(['check', fixture, '--json']);
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.status, 'pass');
  assert.equal(report.summary.recordCount, 1);
  assert.equal(report.summary.invoiceCount, 1);
  assert.equal(Object.hasOwn(report, 'records'), false);
  assert.ok(!result.stdout.includes('Doe, Jane'));
});

test('CLI reads stdin and emits a located error with correction guidance', () => {
  const result = run(['check', '-', '--json'], golden.replace('20261101', '20260229'));
  assert.equal(result.status, 2);
  const issue = JSON.parse(result.stdout).diagnostics.find(d => d.code === 'INVALID_DATE');
  assert.equal(issue.line, 3);
  assert.equal(issue.field, 'INVOICE_DATE');
  assert.ok(issue.suggestion.includes('YYYYMMDD'));
});

test('CLI uses exit 1 for warnings', () => {
  const result = run(['check', '-', '--json'], golden.replaceAll('\r\n', '\n'));
  assert.equal(result.status, 1);
  assert.equal(JSON.parse(result.stdout).status, 'warn');
});

test('CLI prints useful human-readable explanations', () => {
  const result = run(['check', '-'], golden.replace('20261101', '20260229'));
  assert.equal(result.status, 2);
  assert.match(result.stdout, /INVALID_DATE/);
  assert.match(result.stdout, /line 3/);
  assert.match(result.stdout, /INVOICE_DATE/);
  assert.match(result.stdout, /YYYYMMDD/);
});

test('CLI forwards explicit decimal tolerance', () => {
  const input = golden.replaceAll('12.3400', '12.3500');
  const result = run(['check', '-', '--tolerance', '0.01', '--json'], input);
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.ok(JSON.parse(result.stdout).diagnostics.some(d => d.code === 'ROUNDING_DIFFERENCE'));
});

test('CLI explains a project diagnostic and rejects unknown codes', () => {
  const result = run(['explain', 'LINE_TOTAL_MISMATCH', '--json']);
  assert.equal(result.status, 0);
  const rule = JSON.parse(result.stdout);
  assert.equal(rule.code, 'LINE_TOTAL_MISMATCH');
  assert.ok(rule.explanation && rule.suggestion && rule.source);
  assert.equal(run(['explain', '__proto__']).status, 2);
});

test('CLI returns a clear structured file-read failure', () => {
  const result = run(['check', '/no-such-billcheck-file-20261101.txt', '--json']);
  assert.equal(result.status, 2);
  const failure = JSON.parse(result.stdout);
  assert.equal(failure.status, 'fail');
  assert.match(failure.error, /read/i);
});

test('CLI rejects unsupported or incomplete arguments', () => {
  for (const args of [['check'], ['check', fixture, 'extra'], ['check', fixture, '--fix'],
    ['check', fixture, '--tolerance'], ['check', fixture, '--tolerance', '0', '--tolerance', '1'],
    ['explain'], ['explain', 'INVALID_DATE', '--tolerance', '1'], ['unknown']]) {
    const result = run(args);
    assert.equal(result.status, 2, `${args}: ${result.stdout} ${result.stderr}`);
    assert.ok(result.stderr.length > 0);
  }
});

test('CLI provides help and never changes an input file', () => {
  assert.match(run(['--help']).stdout, /check/);
  assert.equal(run(['check', '--help']).status, 0);
  const directory = mkdtempSync(join(tmpdir(), 'billcheck cli-'));
  try {
    const target = join(directory, '-invoice.txt');
    const invalid = golden.replace('20261101', '20260229');
    writeFileSync(target, invalid);
    const result = run(['check', '--json', '--', '-invoice.txt'], undefined, directory);
    assert.equal(result.status, 2);
    assert.equal(JSON.parse(result.stdout).diagnostics[0].code, 'INVALID_DATE');
    assert.equal(readFileSync(target, 'utf8'), invalid);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('CLI reads an explicit local code list with invoice stdin and preserves both files', () => {
  const directory = mkdtempSync(join(tmpdir(), 'billcheck codes-'));
  try {
    const target = join(directory, 'codes.json');
    const content = JSON.stringify({ LINE_ITEM_TASK_CODE: ['CUSTOM'] });
    writeFileSync(target, content);
    const result = run(['check', '-', '--codes', target, '--json'], golden);
    assert.equal(result.status, 2);
    assert.ok(JSON.parse(result.stdout).diagnostics.some(d => d.code === 'CODE_NOT_ALLOWED'));
    const valid = run(['check', '-', '--codes', target, '--json'], golden.replace('L110', 'CUSTOM'));
    assert.equal(valid.status, 0, valid.stdout + valid.stderr);
    assert.equal(readFileSync(target, 'utf8'), content);
    assert.equal(readFileSync(fixture, 'utf8'), golden);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('CLI reports missing, malformed, and invalid code-list files as JSON failures', () => {
  const directory = mkdtempSync(join(tmpdir(), 'billcheck bad-codes-'));
  try {
    const target = join(directory, 'codes.json');
    const missing = run(['check', fixture, '--codes', target, '--json']);
    assert.equal(missing.status, 2);
    assert.match(JSON.parse(missing.stdout).error, /code list/i);
    writeFileSync(target, '{bad JSON');
    const syntax = run(['check', fixture, '--codes', target, '--json']);
    assert.equal(syntax.status, 2);
    assert.match(JSON.parse(syntax.stdout).error, /JSON/);
    writeFileSync(target, JSON.stringify({ LINE_ITEM_TASK_CODE: 'L110' }));
    const shape = run(['check', fixture, '--codes', target, '--json']);
    assert.equal(shape.status, 2);
    assert.ok(JSON.parse(shape.stdout).diagnostics.some(d => d.code === 'INVALID_OPTIONS'));
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('CLI rejects incomplete, repeated, stdin, and explain code-list flags', () => {
  for (const args of [['check', fixture, '--codes'], ['check', fixture, '--codes', '-'],
    ['check', fixture, '--codes', 'one.json', '--codes', 'two.json'], ['explain', 'INVALID_DATE', '--codes', 'one.json']]) {
    const result = run([...args, '--json']);
    assert.equal(result.status, 2);
    assert.equal(JSON.parse(result.stdout).status, 'fail');
  }
});
