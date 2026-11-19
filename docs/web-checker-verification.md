# Local browser checker verification, 2026-11-01

Historical record of the first browser slice. The later [format-check verification](format-checks-verification.md) records new field checks and 12 passing browser tests.

The browser checker reuses the existing LEDES 1998B rules. It does not add client guidelines or guarantee portal acceptance.

## Delivered

- File selection and single-file drop preserve the original bytes.
- Two labeled synthetic examples demonstrate passing and failing results.
- Findings show location, explanation, correction, expected/actual amounts where applicable, and source.
- Filters and 50-finding pages keep long reports usable. The JSON download includes every finding.
- Tolerance edits invalidate old results and downloads. A new check must finish before export.
- Replacement, clear and page exit terminate the worker and invalidate pending results.
- Files stay in browser memory. The application uses no upload, account, telemetry or saved history.
- The loopback server uses explicit asset routes, a restrictive content policy and no write endpoints.
- The preview limits input to 5 MB and 10,000 data records. A 15-second timeout terminates a slow check.

## Verification performed in this session

| Check | Result |
|---|---|
| TypeScript build | Passed |
| Existing Node library and CLI tests | 133 passed |
| Server boundary test | Passed. Asset routes, headers, write rejection, private paths and Host restriction covered |
| Playwright Chromium tests | 11 passed |
| Local isolated runtime | Passed |
| Browser console during capture | No page errors |
| Responsive overflow | None at 320, 375, 768, 900, 1024 and 1440 pixels |
| Main text and state contrast pairs | Calculated ratios from 5.15:1 to 12.87:1 |
| Runtime dependencies | None |

Browser tests cover examples, original byte 0x92, literal filenames, JSON export, no upload requests, empty cookies/storage, clearing and reload. They also cover stale file reads, tolerance changes, filtering, pagination, page exit, input limits, unreadable files, timeout and mobile result focus. Pagination now focuses the first finding after explicit navigation. Filtering preserves focus on the selected filter.

The initial server test used fetch to override Host, but the client did not send that override. A direct HTTP request confirmed rejection. The test now uses that request. Initial browser failures were ambiguous text selectors and an incorrect expectation for the parser's message. The corrected tests use the actual message and visible region.

## Design evidence

Impeccable supplied the direction contract, screenshot review and detector. Frontend Design guided the functional composition and typography. UI/UX Pro Max supplied relevant minimalism, typography and error-feedback guidance. Its sales-page recommendations did not fit this operating surface and were excluded.

Screenshots in `.impeccable/review/` cover empty, passing, warning and expanded-error states at desktop and mobile widths. The detector ran once. Its only findings concern Lato's familiarity. Lato was deliberately selected for readable billing work and is self-hosted. The finished design records live in `DESIGN.md` and `.impeccable/design.json`.

Independent review found one pagination accessibility defect. Next and Previous replaced the findings but left keyboard focus below the list. A new regression failed before the fix. Explicit page navigation now focuses the first finding and brings it into view. All 11 browser tests passed after the fix. The reviewer scored the pagination fix resolved and returned disposition `ship`. This verdict covers that scored fix. The refreshed captures showed no reported regression.

## Limits

- Chromium is the verified browser. Safari, Firefox and real mobile devices were not exercised.
- Page-exit clearing is tested through the pagehide event. Browser-specific history-cache behavior was not exhaustively tested.
- Automated keyboard and announcement checks do not replace a screen-reader user test.
- Client rules, code membership, timekeeper name formatting, field lengths and numeric total widths remain unchecked.
- Customer invoices, portal acceptance, hosted behavior and public packaging remain unverified.
- A JSON report may contain a filename and individual invoice values. Export occurs only on request.
- This work required no purchase or new paid service. Existing AI/tool usage is separate.

No commit, public repository, release, deployment, purchase or new outreach occurred.
