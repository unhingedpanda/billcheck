# Format checks and explicit code lists, 2026-11-01

Done, with gaps: implementation and local checks pass. Independent review fixes are recorded below. Customer files and live portal acceptance remain untested.

## Behavior

- Character limits, description-size handling and surname/comma/given-name structure now produce located findings.
- Reference classification checks use 51 exact LOC identifiers. Former 1998B codes warn without mapping.
- Numeric widths warn on an explicitly documented interpretation. Exact arithmetic remains unchanged.
- First-occurrence invoice and client/matter precedence remain intact. IF/IE units and unit cost remain ignored.
- Library `codeLists` and CLI `--codes` accept explicit client lists. Omitted lists differ from empty lists.
- Supplied classifications replace reference membership, while field limits still apply.
- Invalid configuration fails explicitly. Plain-object accessors are rejected. JavaScript proxies may run traps during inspection, and inspection exceptions become `INVALID_OPTIONS`.
- The local browser uses the new default checks. It cannot load client code lists.

These statements were checked now against source and passing tests. The [source record](sources/README.md) identifies the downloaded workbooks and their hashes.

## Verification

| Check, run 2026-11-01 | Result |
|---|---|
| TypeScript build | Passed |
| Node 22.23.2, library and CLI | 170 passed |
| Bun 1.4.0, portable library | 158 passed |
| Deno 2.9.7, portable library | 158 passed |
| Local isolate without Node globals | Passed |
| Chromium browser | 12 passed |
| Local server boundary | 1 passed |
| Package dry run | Includes compiled modules and CLI. Excludes source downloads and third-party fixtures. |
| Workbook comparison | All 51 classification identifiers match source rows 4–54. |
| Rendered browser review | Desktop 1440px and mobile 375px captures inspected. No page errors, missing assets or horizontal overflow. |

Format tests first produced 22 failures against the earlier implementation. Code-list and CLI tests first produced nine failures. The new browser test first failed because the static server omitted the new modules. Each test group passed after implementation.

The huge-number regression still checks exact arithmetic beyond JavaScript Number precision. It now expects width warnings, with no arithmetic mismatch.

Independent review found a crash when JavaScript callers supply revoked or throwing proxies as configuration. It also found misleading description-overflow wording on identifier-length errors. Both regressions failed before the fixes. Configuration inspection now catches exceptions, and length explanations distinguish description-specific limits. The wording issue was treated as Important because it could direct billing staff toward an unrelated field.

The reviewer deferred live portal/customer-rule evidence, other browser engines, unchanged unbounded CLI/library inputs, and prospect research. These remain explicit limits. The main agent separately verified the prospect counts and all three draft recipient sources. No second review was requested.

After both fixes, the complete runtime, browser and server checks passed with the counts above. There are no deferred Minor findings. The local preview was restarted with the new module routes at `http://127.0.0.1:4173`.

Logs, baseline copies and the execution ledger remain in `.superpowers/sdd/2026-11-01-format-checks/`. The repository has no commits, so the baseline copies replace a commit diff for review.

## Limits and decisions

- The 1998B workbook does not define KB or the width notation. Ambiguous sizes and numeric widths warn instead of asserting receiver rejection.
- Explicit code-list membership cannot prove that the source list is current or that a role is approved for a client.
- Client guidelines, LOC standardized error mapping, live portal behavior and real customer files remain unverified.
- Chromium checks do not establish Safari, Firefox or real-device behavior. The isolate is not a Cloudflare deployment test.
- The CLI requires Node. Native binaries, MCP, hosted features and public releases remain later work.

The work stays local, private and uncommitted. No email was sent or scheduled, and no paid service or purchase was created.
