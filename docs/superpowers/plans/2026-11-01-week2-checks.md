# Week-2 checks implementation plan

> **For agentic workers:** Use superpowers:executing-plans. Implement inline with one final independent review. No commits or external mutations.

**Goal:** Make the local library detect invoice errors and explain corrections through an API and CLI.

**Architecture:** Preserve the parser and builder. Add field locations, exact decimal helpers, a rule catalog, semantic checks and a thin Node CLI. Keep financial values as strings at the API boundary and BigInt internally.

**Tech stack:** Existing TypeScript 6.0.3, standard JavaScript and Node CLI. Zero runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-11-01-week2-checks-design.md`. The user approved steps 1–2 from the preceding recommendation.

## Global constraints

- Stay in the repository root and preserve existing uncommitted files.
- No invoice mutation, floating-point money calculations, hosted service or automatic repair.
- Use project-owned diagnostic codes and original wording.
- Check only rules supported by the LOC workbook or explicitly documented project policies.
- Keep client-dependent rules and publication outside this scope.

## Review focus

- First-occurrence invoice metadata and optional repeated blanks.
- Invoice adjustments with ignored units/cost, including negative credits.
- Decimal precision, rounding and explicit tolerance boundaries.
- Multiple nonadjacent invoices and duplicate IDs scoped to each invoice.
- Structural errors, invalid amounts and locations without misleading secondary arithmetic.

### Task 1: Field locations and core field checks

**Files:** `src/format.ts`, `src/parse.ts`, `src/explain.ts`, `src/check.ts`, `src/index.ts`, `tests/check.test.mjs`, `tests/parser.test.mjs`.

**Interfaces:** Add `FieldLocation`, `RecordLocations`, and `ParseResult.locations`. Export `check1998B(input: string | Uint8Array, options?: CheckOptions): CheckResult`, `explain(code: string): RuleExplanation | null` and related types.

- [x] Write failing tests for locations, valid samples, required fields, date/type rules and explanations.
- [x] Run tests and confirm the missing behavior fails.
- [x] Implement source locations, original explanation catalog and core checks.
- [x] Run the full suite and verify existing parse/build behavior.

### Task 2: Exact amounts and invoice relationships

**Files:** `src/decimal.ts`, `src/check.ts`, `tests/check.test.mjs`.

**Interfaces:** Internal fixed-scale decimal parser/formatter using BigInt. `CheckOptions.amountTolerance?: string`. Enriched findings expose string `expected` and `actual` amounts.

- [x] Write failing tests for formulas, IF/IE, zero values, duplicate IDs, first-occurrence metadata, multi-invoice sums and tolerance.
- [x] Run tests and confirm the target failures.
- [x] Implement exact arithmetic and relationships without fabricated totals after invalid inputs.
- [x] Run all library tests on Node, Bun and Deno.

### Task 3: CLI, review and handoff

**Files:** `bin/billcheck.mjs`, `tests/cli/cli.test.mjs`, `package.json`, `README.md`, `scripts/check-isolate.mjs`, verification and research notes.

**Interfaces:** `check <file|-> [--json] [--tolerance <decimal>]` and `explain <CODE> [--json]`. Exit 0/1/2 for pass/warn/fail.

- [x] Write CLI behavior tests and watch them fail.
- [x] Implement read-only human/JSON reports, stdin and clear failures.
- [x] Run the complete Node suite, library tests on Bun/Deno and the isolate smoke check.
- [x] Perform one independent final review and fix important findings with failing regression tests first.
- [x] Verify the package dry run, local demonstration, documentation and handover.
