# Local invoice checks and explanations

The user approved the proposed next steps with “go” on 2026-11-01. This implements the recommended steps 1–2: invoice validation and useful explanations. The existing handover supplies the broader design. The web checker, outreach, publication and paid features are separate work.

## Approach

Extend the existing portable TypeScript library with deterministic rules and a thin local Node CLI. This preserves the zero-runtime-dependency design and allows the same checks to power a later browser interface. A hosted validator would introduce an unnecessary external dependency. An LLM-based checker would make arithmetic and rule explanations less reproducible.

`check1998B(input, options?)` parses the file, reports structural and semantic findings, and returns a status plus counts and diagnostics. It never changes fields. `explain(code)` returns an original explanation, correction guidance and source reference for each project diagnostic. A CLI provides `check` and `explain` with human-readable and JSON output. JSON reports omit the full invoice records.

## Source and rules

The LOC July 2014 1998B field workbook was fetched again on 2026-11-01. Its SHA-256 matches the local source recorded in `docs/sources/README.md`.

Implement:

- Unconditional required fields and conditional fee/expense fields.
- Real YYYYMMDD calendar dates, including century leap-year rules.
- Billing start/end order. Line dates outside the period produce warnings because the workbook says they are typically within it.
- F, E, IF and IE line types. Fees require timekeeper ID, name, classification and description. Expenses require expense codes.
- Nonzero units and unit cost for F/E. IF/IE ignore both fields, as specified.
- Plain decimal amounts with up to four fractional digits. Accept the sample's trailing decimal point. Reject exponent, grouping and currency symbols.
- Exact decimal arithmetic with BigInt. No JavaScript floating-point calculations for invoice values.
- F/E line total = units × cost + adjustment. For IF/IE, ignored units/cost contribute nothing and line total equals adjustment. The latter interpretation is grounded in the workbook's ignored-field notes and official retainer sample.
- Unique line IDs per invoice. Different invoices may reuse line IDs. IDs remain case-sensitive strings.
- Invoice total compared to the sum of all its line totals, including nonadjacent rows and negative adjustments.
- First-occurrence invoice fields govern the invoice, as the workbook specifies. Blank later repetitions are allowed. Nonempty conflicting repetitions warn and do not replace the first value.
- The first client ID per law-firm matter governs that matter. Nonempty conflicts warn.
- An activity code without a task code warns. Missing task/activity codes and client matter IDs are otherwise client-dependent and cannot be required without client context.

## API and policy choices

`CheckResult` contains `status: pass | warn | fail`, summary counts and enriched diagnostics. Each semantic diagnostic includes record, field, physical line, column, offset, explanation, suggestion and source. Arithmetic findings also show expected and actual amounts.

The parser gains additive field-location metadata. Existing fields and parsing behavior remain unchanged.

`amountTolerance` is an optional nonnegative decimal string, default `0`. A nonzero mismatch within an explicitly supplied tolerance still warns. Larger mismatches fail. The workbook's 0.1% and 1% examples are not treated as universal portal policies.

Repeated invoice totals compare by numeric value, so `12.3` and `12.30` do not conflict. Invalid line totals suppress aggregate arithmetic for that invoice to avoid a fabricated total.

A pass means only that these implemented checks found no issue. It does not guarantee portal acceptance. Numeric total-width limits, text length limits, code-table membership, client rules and live portal behavior remain outside this slice.

## CLI and operational limits

`billcheck check <file|-> [--json] [--tolerance <decimal>]`

`billcheck explain <CODE> [--json]`

Exit 0 for pass, 1 for warnings, 2 for errors or usage/I/O failure. `-` reads stdin. The CLI reads files and writes reports to stdout/stderr only. It never writes back to the invoice. This local CLI requires Node. Native binaries remain later packaging work.

All diagnostic identifiers and descriptions belong to billcheck. No LOC code mapping or official descriptions are asserted. No new dependencies, network service, purchase, commit, deployment, email or publication is needed.
