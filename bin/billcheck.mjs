#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { check1998B, explain } from '../dist/index.js';

const help = `billcheck — local LEDES 1998B checks

Usage:
  billcheck check <file|-> [--json] [--tolerance <decimal>] [--codes <json-file>]
  billcheck explain <CODE> [--json]

Use - to read stdin. Use -- before a filename that starts with a dash.
Tolerance defaults to 0. A nonzero difference within a supplied tolerance still warns.
Code lists are a local JSON object mapping supported field names to accepted string arrays.
Exit codes: 0 = pass, 1 = warnings, 2 = errors or usage/I/O failure.
Files are read only. A pass covers the implemented 1998B rules, not portal acceptance.
Diagnostic codes belong to billcheck. Where one maps unambiguously, the report also names
the related LOC Standardized Error Code V2, used with LOC permission. It is not a portal prediction.
`;

function main(argv) {
  const delimiter = argv.indexOf('--');
  const json = (delimiter === -1 ? argv : argv.slice(0, delimiter)).includes('--json');
  const fail = message => {
    if (json) process.stdout.write(JSON.stringify({ status: 'fail', error: message }, null, 2) + '\n');
    else process.stderr.write(`billcheck: ${message}\nUse --help for usage.\n`);
    return 2;
  };
  if (argv.length === 0 || ['--help', '-h', 'help'].includes(argv[0])) {
    process.stdout.write(help);
    return 0;
  }
  const command = argv[0];
  if (command !== 'check' && command !== 'explain') return fail('Unknown command. Use check or explain.');
  const positional = [];
  let tolerance;
  let codesPath;
  let flags = true;
  for (let i = 1; i < argv.length; i++) {
    const arg = argv[i];
    if (flags && arg === '--') { flags = false; continue; }
    if (flags && (arg === '--help' || arg === '-h')) {
      process.stdout.write(help);
      return 0;
    }
    if (flags && arg === '--json') continue;
    if (flags && arg === '--codes') {
      if (command !== 'check') return fail('--codes is only available with check.');
      if (codesPath !== undefined) return fail('Supply --codes only once.');
      if (argv[i + 1] === undefined || argv[i + 1].startsWith('--')) return fail('--codes needs a local JSON filename.');
      codesPath = argv[++i];
      if (codesPath === '-') return fail('--codes cannot read stdin. Supply a local JSON filename.');
      continue;
    }
    if (flags && arg === '--tolerance') {
      if (command !== 'check') return fail('--tolerance is only available with check.');
      if (tolerance !== undefined) return fail('Supply --tolerance only once.');
      if (argv[i + 1] === undefined) return fail('--tolerance needs a decimal value.');
      tolerance = argv[++i];
      continue;
    }
    if (flags && arg.startsWith('-') && arg !== '-') return fail(`Unknown option: ${arg}`);
    positional.push(arg);
  }
  if (positional.length !== 1) return fail(command === 'check' ? 'Supply exactly one file or - for stdin.' : 'Supply exactly one diagnostic code.');
  if (command === 'explain') {
    const rule = explain(positional[0]);
    if (rule === null) return fail(`Unknown billcheck diagnostic code: ${positional[0]}`);
    process.stdout.write(json ? JSON.stringify(rule, null, 2) + '\n' :
      `${rule.code}: ${rule.title}\nWhy: ${rule.explanation}\nFix: ${rule.suggestion}\nSource: ${rule.source}\n`);
    return 0;
  }
  const options = tolerance === undefined ? {} : { amountTolerance: tolerance };
  if (codesPath !== undefined) {
    let content;
    try { content = readFileSync(codesPath, 'utf8'); }
    catch (error) { return fail(`Could not read code list: ${error.message}`); }
    try { options.codeLists = JSON.parse(content); }
    catch { return fail('Code list is not valid JSON.'); }
  }
  let input;
  try {
    input = readFileSync(positional[0] === '-' ? 0 : positional[0]);
  } catch (error) {
    return fail(`Could not read input: ${error.message}`);
  }
  const report = check1998B(input, options);
  if (json) process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  else {
    const { recordCount, invoiceCount, errorCount, warningCount } = report.summary;
    process.stdout.write(`${report.status.toUpperCase()}: ${recordCount} records, ${invoiceCount} invoices, ${errorCount} errors, ${warningCount} warnings.\n`);
    for (const issue of report.diagnostics) {
      const where = [issue.record && `record ${issue.record}`, issue.line && `line ${issue.line}`,
        issue.column && `column ${issue.column}`, issue.field].filter(Boolean).join(', ');
      process.stdout.write(`\n${issue.severity.toUpperCase()} ${issue.code}${where ? ` — ${where}` : ''}\n`);
      process.stdout.write(`${issue.explanation}\nFix: ${issue.suggestion}\n`);
      if (issue.expected !== undefined) process.stdout.write(`Expected: ${issue.expected}. Actual: ${issue.actual}.\n`);
      if (issue.locCode !== undefined) process.stdout.write(`Related LOC code: [${issue.locCode}]\n`);
      process.stdout.write(`Source: ${issue.source}\n`);
    }
    process.stdout.write('\nA pass covers only implemented 1998B checks. Client rules and portal acceptance need separate verification.\n');
  }
  return report.status === 'pass' ? 0 : report.status === 'warn' ? 1 : 2;
}

process.exitCode = main(process.argv.slice(2));
