# Remaining 1998B format checks

> Execute inline with superpowers:executing-plans and test-driven development. The user approved this work with “go”.

Goal: Check field lengths, timekeeper names, classification identifiers and numeric widths. Support explicit client code lists through the library and CLI.

Architecture: Add a focused field-rules module and a code-list module. Keep parsing and building lossless. Existing check1998B returns the same result shape. The browser receives default checks through the shared library.

Stack: TypeScript, no runtime dependencies. Existing Node, Bun, Deno and browser tests.

Spec: LOC July 2014 field workbook, re-downloaded with matching SHA-256 on 2026-11-01. LOC June 2023 classification workbook. See docs/sources/README.md.

## Decisions and constraints

- Preserve first-occurrence invoice fields and client/matter precedence. Ignore IF/IE units and unit cost.
- Enforce Character*20, name*30, classification*10 and line type*2 on applicable nonempty fields. Preserve whitespace and input values.
- Description values above 15,360 ASCII characters fail. Values from 15,001 to 15,360 warn because the workbook does not define KB.
- Require a nonempty surname before a comma and a nonempty given-name portion after it. Do not assume names contain only letters or one word.
- Check nonempty classifications against the 51 identifiers in the 2023 reference. Former 1998B identifiers AS, PT, LA, OC and OT warn rather than auto-map.
- Numeric notation 10.4/12.4 lacks a definition in the 1998B workbook. Warn when significant whole digits exceed 6/8. Do not turn this inferred interpretation into a hard portal rejection. Decimal syntax and four-place rules remain errors.
- Optional codeLists maps LINE_ITEM_TASK_CODE, LINE_ITEM_ACTIVITY_CODE, LINE_ITEM_EXPENSE_CODE and TIMEKEEPER_CLASSIFICATION to arrays of exact accepted strings. Only supplied lists constrain membership. An empty list permits no nonblank value. Blank required values still use existing diagnostics. A supplied classification list replaces the reference membership check, but never bypasses field length.
- Reject malformed options, unknown list fields, inherited list configuration, nonstring entries, duplicates, whitespace-padded codes, delimiters, controls and entries beyond field limits.
- CLI --codes <json-file> reads a local object in that shape. Do not read code lists from stdin. The invoice may still use stdin. No JSON rule execution or network retrieval.
- Browser checks reference classifications. Client task/activity/expense membership remains an explicit CLI/library feature for this slice. Update coverage copy truthfully.
- No commits, publication, purchases, outbound messages or UI redesign.

## Task 1: Format rules

Files: src/field-rules.ts, src/classifications.ts, src/check.ts, src/explain.ts, tests/field-rules.test.mjs, tests/check.test.mjs.

- [x] Write boundary and precedence tests. Run against the existing implementation and observe missing diagnostics.
- [x] Implement field rules and 51-code membership. Use project-owned explanations and source links.
- [x] Run npm test. Expected: all tests pass. The existing huge-number arithmetic test must still prove exactness while expecting width warnings.

## Task 2: Explicit code lists

Files: src/code-lists.ts, src/check.ts, src/index.ts, bin/billcheck.mjs, tests/code-lists.test.mjs, tests/cli/cli.test.mjs, examples/client-codes.json.

- [x] Write tests for exact membership, omitted versus empty lists, overrides, malformed configuration, prototypes and CLI JSON/I/O failures.
- [x] Observe failures before implementation.
- [x] Add typed options and read-only CLI support.
- [x] Run npm test. Expected: full suite green.

## Task 3: Integration and handoff

Files: scripts/serve-web.mjs, web/index.html, README.md, PRODUCT.md, source provenance, verification notes and research handover.

- [x] Allow the new browser modules and update coverage wording.
- [x] Add a browser test for new name/classification findings and their explanations.
- [x] Run Node, Bun, Deno, isolate, server and browser checks once the implementation is stable.
- [x] Request one independent review of changed behavior, evidence and ambiguities. Fix important findings with regressions.
- [x] Verify the prospect research and three local email drafts. Update the handover without sending them.

## Review focus

- Later ignored metadata must not override first occurrence or manufacture a new hard failure.
- IF/IE ignored units and rates must stay ignored.
- Custom client codes must work without a universal UTBMS assumption.
- Sign, decimal point and leading zeros must not distort numeric width warnings or exact arithmetic.
- Invalid nested code configuration must never silently disable validation or throw a crash.
