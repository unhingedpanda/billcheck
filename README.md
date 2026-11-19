# billcheck

A local LEDES 1998B parser, builder and invoice checker, written in TypeScript with zero runtime dependencies.

billcheck reads invoice files, checks field formats and exact arithmetic, and explains problems. The library and CLI also accept explicit client code lists. Client guidelines and live portal acceptance remain outside this version. A pass covers only implemented checks. Parsing or building alone does not validate billing values.

The package is named `billcheck`. It is private and unpublished.

## Run locally

```sh
npm ci
npm test
npm run test:bun
npm run test:deno
npm run test:isolate
```

The build emits ESM and TypeScript declarations to `dist/`. The local CLI requires Node. TypeScript and Playwright are development dependencies. The library uses standard JavaScript, with no filesystem, network, Node globals, or runtime imports outside this package.

## Use the local browser checker

```sh
npm run web
```

Open `http://127.0.0.1:4173`. Choose or drop one invoice, or explore either synthetic example. Expand a finding for its location, explanation, correction and source. Download the complete report as JSON when needed. The checker preserves the input file.

The browser reads original bytes and checks them in a cancellable module worker. Invoice content stays in browser memory. The application has no upload endpoint, analytics, cookies or saved history. Clear file, reload or leaving the page discards the active selection and findings. Downloading a report explicitly saves its filename, tolerance, summary and diagnostics. Reports omit full invoice records, but findings can include original values.

The preview accepts up to 5,000,000 bytes and 10,000 data records. Checks stop after 15 seconds. Larger files can use the local CLI. Results show 50 findings per page. Long display values are clipped at 300 characters, with full values retained in the JSON report. Changing the amount tolerance invalidates the previous result until you check again.

The static server binds to `127.0.0.1` and serves only explicit application assets. It rejects write methods and unexpected Host headers. Its content policy blocks browser connections. Fonts and scripts are local. Clicking a source link deliberately opens the official source in another tab without a referrer.

Use `npm run web -- --port 4175` to choose another port. Stop the server with Ctrl+C. Test the server with `npm run test:server`. Run Chromium browser tests with `npm run test:web`. Install the test browser with `npx playwright install chromium --only-shell` if it is missing.

See [browser verification](docs/web-checker-verification.md) and [design system](DESIGN.md). Lato font files use the SIL Open Font License in `web/assets/OFL.txt`.

## Check and explain locally

```sh
npm run billcheck -- check tests/fixtures/synthetic-1998b.txt
npm run --silent billcheck -- check invoice.txt --json
npm run billcheck -- explain LINE_TOTAL_MISMATCH
npm run billcheck -- check invoice.txt --tolerance 0.01
npm run billcheck -- check invoice.txt --codes examples/client-codes.json
```

After building, `node bin/billcheck.mjs` runs the same commands directly. `check -` reads stdin. Use `--` before a filename starting with a dash. Exit codes are 0 for pass, 1 for warnings and 2 for errors, including argument and file-read failures.

Human-readable reports and JSON include issue locations, explanations, correction guidance and source references. Arithmetic issues include expected and actual amounts. Reports omit full invoice records. The CLI never changes the input file. It makes no network requests.

```js
import { check1998B, explain } from './dist/index.js';

const report = check1998B(input);
// { status, summary: { recordCount, invoiceCount, errorCount, warningCount }, diagnostics }
const details = explain('LINE_TOTAL_MISMATCH');
// { code, title, explanation, suggestion, source }, or null for an unknown code
```

Checks cover required and conditional fields, real calendar dates, billing-period order, line types, nonzero fee/expense units and costs, duplicate line IDs per invoice, line formulas and invoice sums. Invoice-level IF/IE adjustments ignore units and unit cost. Their total is checked against their adjustment amount.

The first invoice metadata governs that invoice. Blank repetitions are accepted. Nonempty conflicts warn and never overwrite the first value. Invoice totals compare numerically, so different decimal formatting does not cause a conflict. The first client ID for each law-firm matter also takes precedence. Multiple invoices and nonadjacent records are supported.

All amounts use exact decimal arithmetic. Numeric fields accept plain decimal strings with at most four fractional digits, including a trailing decimal point. Exponents, grouping and currency symbols are rejected. A product may retain eight decimal places for comparison.

By default, **every arithmetic mismatch is an error**. An explicit `check1998B(input, { amountTolerance: '0.01' })` changes discrepancies up to that absolute amount into warnings. It never hides them. The CLI flag is `--tolerance 0.01`. No universal portal tolerance is assumed. Confirm any tolerance with the receiving client.

Line dates outside the billing period and activity codes without task codes produce warnings. The checker cannot infer whether a client requires task codes, activity codes or client matter IDs. It does not automatically rewrite narratives, substitute codes or repair amounts.

All diagnostic codes and explanations belong to billcheck. Source links identify the specification, reference sample or a documented project policy.

### Related LOC error codes

Where one fits unambiguously, a check diagnostic also carries `locCode`, the related identifier from the [LOC Standardized Error Codes V2](https://ledes.org/ledes-error-codes/loc-standardized-error-codes-v2-2024-09/) (2024-09). The CLI prints it as `Related LOC code: [1318-0041]` and the browser checker shows it beside the billcheck code. The code depends on the line type: a line-total mismatch is `1318-0041` on a fee line, `1617-0041` on an expense line and `1018-0041` on an adjustment line.

`locCode` names the closest LOC condition. It does not predict what a portal will return, because each receiving system chooses which codes it uses. It is absent where the workbook gives no 98B row, or more than one, for the rule, field and line type. That includes a missing `LAW_FIRM_ID`, timekeeper ID or classification on fee lines, and all character, length and classification checks. billcheck embeds only the identifiers. For the official error names and resolution notes, see the LOC workbook. `explain` covers billcheck codes only.

The workbook and billcheck disagree in a few places. The workbook lists task and activity codes as format-required on fee lines, and treats a line date on an adjustment line as ignored. billcheck leaves task and activity requirements to the client's code lists and still requires a line date. These checks are unchanged, and no LOC code is attached where the two disagree.

### Credits

LEDES and the LEDES 1998B format are maintained by the [LEDES Oversight Committee](https://ledes.org/) (LOC). billcheck uses the following LOC material with the LOC's permission:

- the LOC Standardized Error Codes V2 identifiers, © 2024 LEDES Oversight Committee
- the 51 identifiers from the revised timekeeper classification reference, June 2023
- the official 1998B sample file, as a test fixture

The identifiers in the code are used under that permission. The sample file, its derivative and the LOC workbooks keep their LOC copyright and are not covered by the MIT licence. billcheck is an independent project. The LOC does not endorse it.

### Field formats and reference classifications

The checker enforces character limits of 20 for identifiers and task/activity/expense codes, 2 for line types, 30 for names, and 10 for classifications. Whitespace counts toward length. Ignored repetitions of invoice metadata and client IDs retain first-occurrence precedence.

Names need nonempty parts around a comma, as in `Doe, Jane`. The checker does not infer a person's correct name. Nonblank classifications use the 51 identifiers in the LOC June 2023 reference. Former identifiers `AS`, `PT`, `LA`, `OC` and `OT` warn without automatic mapping. Membership does not prove role eligibility or client approval.

The workbook limits descriptions to 15KB without defining KB. Values above 15,360 ASCII characters fail. Values from 15,001 through 15,360 warn. Shortening to at most 15,000 ASCII characters avoids this ambiguity.

The workbook uses numeric notation `10.4` and `12.4` without defining total width. Billcheck warns above 6 significant whole digits for line amounts/units/rates or 8 for invoice totals. This is an inferred interpretation, not a universal receiver limit. Signs and leading zeros do not affect these counts. Four-place decimal syntax and exact arithmetic remain separate checks. IF/IE units and unit cost remain ignored.

### Explicit client code lists

There is no universal task, activity or expense list. Supply the lists the receiving client actually accepts:

```js
const report = check1998B(input, {
  amountTolerance: '0',
  codeLists: {
    LINE_ITEM_TASK_CODE: ['L110', 'CUSTOM-TASK'],
    LINE_ITEM_ACTIVITY_CODE: ['A101'],
    LINE_ITEM_EXPENSE_CODE: ['E101'],
    TIMEKEEPER_CLASSIFICATION: ['ASSOC', 'PARTNR'],
  },
});
```

`CodeLists`, `Ledes1998BCodeField` and `CheckOptions` are exported TypeScript types. Omitted lists do not constrain their fields. An empty list permits no nonblank code. Optional blank fields remain optional. Required values still use their existing checks. Matching is exact and case-sensitive, without whitespace normalization.

A supplied classification list replaces reference and legacy membership checks. It never bypasses field length. Lists must contain unique, nonempty printable ASCII strings within field limits. Padded strings, delimiters, controls, unknown fields, inherited configuration and accessors fail with `INVALID_OPTIONS`.

The CLI `--codes` file contains only the `codeLists` object shown above. `examples/client-codes.json` is synthetic demonstration data, not any real client's approved list. Code lists must come from a local JSON file, while the invoice can still come from stdin. The CLI never executes rules or retrieves lists over the network. The browser currently uses reference classifications and cannot load custom lists.

## Read a file

```js
import { parse1998B, build1998B } from './dist/index.js';

// `input` can be a string or Uint8Array supplied by your application.
const parsed = parse1998B(input);

if (parsed.records === null) {
  // Ambiguous framing or columns. Do not process a partial invoice.
  console.error(parsed.diagnostics);
} else if (parsed.diagnostics.some(issue => issue.severity === 'error')) {
  // Original fields remain available for inspection and explicit correction.
  console.error(parsed.diagnostics);
} else {
  const built = build1998B(parsed.records);
  if (built.text !== null) {
    // Your application decides whether and where to save it.
    console.log(built.text);
  }
}
```

`Ledes1998BRecord` has all 24 standard field names as keys. Every value is a string, including amounts, dates, identifiers and empty fields. The parser preserves leading zeros, decimal scale, field whitespace, invoice order and line-item order. It does not group or deduplicate records.

`parse1998B` returns `{ records, locations, diagnostics }`. `locations` provides each field’s starting offset, line and column, aligned with `records`. Both are null on structural failure. Missing or incorrect signature/header, wrong field counts, incomplete records and empty documents return `records: null`. Character problems leave records available with error diagnostics. Always inspect diagnostics.

Canonical framing uses the exact ordered header, `[]` terminators and CRLF after each record. The parser also reads LF, CR, adjacent terminated records and a missing final newline, with warnings. A whitespace-only tail produces a warning and is omitted by the builder. These are parsing accommodations, not promises about portal support.

For `Uint8Array`, the parser maps each byte to the same numeric character value. It does not guess UTF-8 or Windows-1252, strip a BOM, or replace undecodable bytes. ASCII input behaves identically as bytes or text. A non-ASCII byte is preserved for inspection and reported. To inspect decoded Unicode text, decode explicitly in your application and pass a string.

Diagnostics have project-owned codes, severity and original explanations. Parser locations use one-based lines and columns. `offset` is zero-based bytes for byte input or UTF-16 code units for string input. `record` is the one-based data record, excluding signature and header. `field` is present for field-level errors. Each field reports its first non-ASCII character and first control character. Parser codes are billcheck codes. `check1998B` adds the related LOC code where one maps.

## Build a file

`build1998B(records)` returns `{ text, diagnostics }`. Supply a nonempty array with all 24 own string fields on each object. It rejects unknown fields, missing fields, non-string values, non-ASCII characters, control characters, pipes and `[]` inside values. It returns `text: null` on any error and never emits a partial invoice.

The builder retains string values exactly and writes fields in standard order. It does not repair text, round amounts, insert missing values or alter inputs. Correct a copied record explicitly before retrying.

## Fixtures and verification

The unchanged LOC sample contains byte `0x92` in the first line item's description and a whitespace-only tail. Tests preserve this anomaly and require an error before export. A separate derived golden fixture replaces that one byte with an ASCII apostrophe and removes the tail. The parser and builder never perform that repair themselves.

An independent synthetic golden checks field order, empty trailing fields, decimal scale and CRLF output. Malformed-file tests check that later bad records cannot produce a silently incomplete invoice.

See [source provenance](docs/sources/README.md) and the [implementation plan](docs/superpowers/plans/2026-11-01-week1-1998b.md). The LOC sample and its derivative remain LOC material, used with permission. They sit in the repository and are excluded from the npm package. The billcheck code is MIT licensed.

Real customer files and live portal acceptance remain untested. The CLI and browser preview are local. Native binaries, hosted services, MCP and paid features remain later work.

Week-1 history is recorded in `docs/week1-verification.md`. Current check/explain implementation decisions are recorded in `docs/superpowers/specs/2026-11-01-week2-checks-design.md`.

Current format-check evidence and review fixes are in [format-check verification](docs/format-checks-verification.md).
