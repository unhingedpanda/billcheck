# Local check/explain verification, 2026-11-01

Historical record of the core-check slice. The later [format-check verification](format-checks-verification.md) closes name, length and reference-membership gaps and records current test counts.

Done, with gaps: local invoice checks and explanations are complete. Client rules, several format checks and live portal acceptance remain unverified.

## Delivered

- `check1998B` reports pass, warnings or failure, summary counts and located diagnostics.
- Checks cover applicable required fields, calendar dates, period order, line types, nonzero units/cost, line IDs, decimal amounts, line formulas and invoice sums.
- First-occurrence invoice metadata and client/matter mappings retain precedence. Nonempty conflicting repetitions warn.
- `explain` provides original correction guidance and source references for project-owned codes.
- The local Node CLI supports file/stdin input, human-readable/JSON output, explicit tolerance and exit codes 0/1/2.
- No invoice data is changed. Reports omit full invoice records.
- `examples/invalid-invoice.txt` and `examples/invalid-report.txt` provide a synthetic two-error demonstration.

## Evidence

| Check | Result |
|---|---|
| Baseline before this work | 46 tests passed |
| TypeScript 6.0.3 | Build passed |
| Node 22.23.2 | 133 tests passed, including 9 real CLI subprocess tests |
| Bun 1.4.0 | 124 library tests passed |
| Deno 2.9.7 | 124 library tests passed |
| Local isolated runtime | Import, byte parse, build, exact-amount checking and explain passed without Node globals |
| Independent review | No important defect found. One minor gap documented below |
| npm pack dry run | CLI included. Third-party source files and fixtures excluded. Nothing published |
| Demonstration | Impossible date and incorrect invoice total reported at their source fields, exit 2 |
| Runtime dependencies | None added |

The Node VM isolation check uses an experimental test-harness API. It is not a Cloudflare deployment test. Bun/Deno runs exercise the portable library. The CLI currently requires Node.

## Decisions and limits

- The user approved steps 1–2 of the preceding recommendation. The existing handover supplies the design. API details may change before publication.
- Exact comparisons use BigInt. Tolerance defaults to zero because no receiving-system rounding agreement exists. An explicit tolerance changes a small mismatch into a warning, never silent acceptance.
- Invoice-level IF/IE arithmetic uses the adjustment amount and ignores units/cost. This follows the workbook notes and official retainer sample.
- First-occurrence fields and conditional requirements follow the source workbook. Missing client-dependent task/activity/matter IDs cannot be rejected without client context.
- Explanations use project-owned identifiers and wording. No LOC code mapping or official error-description permission is assumed.
- Timekeeper name formatting remains unchecked. The checker requires the name for fee records, but a value without the specified comma can pass. Independent review classified this as a minor gap. README now names it explicitly.
- Text lengths, total numeric widths and code-table membership remain unchecked. Client guidelines and live portal acceptance also remain unverified.
- No public repo, release, native binaries, web checker, MCP server or hosted feature was created. No new outreach was sent or scheduled.
- No purchase or new subscription was required. Existing AI/tool usage remains separate.

Review evidence is in `.superpowers/sdd/2026-11-01-week2-checks/`. The ledger and logs remain local because this repository has no commits.
