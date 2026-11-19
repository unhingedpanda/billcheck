# Local web checker implementation

Authorized: local browser checker, same invoice rules, no publication or external service.

1. Add a loopback static server with explicit routes and restrictive headers. Test route boundaries and refused writes first.
2. Build a static, accessible interface. Run byte-preserving checks in a cancellable worker. Bound input size and displayed diagnostics. Export complete JSON only on request.
3. Test passing, failing and warning invoices, raw bytes, tolerance changes, replacement/clear races, paging, export, mobile overflow and local-only requests. Inspect desktop and mobile screenshots.
4. Obtain one independent code and interface review. Resolve material findings. Document actual behavior and remaining validation gaps.

Acceptance: file selection and drop work, errors explain corrections, stale results cannot be exported, and no invoice body reaches the server. A passing result does not promise portal acceptance.

Implementation and verification completed on 2026-11-01. The independent review found one pagination focus issue. Its failing regression now passes. The reviewer scored that fix resolved. See `docs/web-checker-verification.md` for evidence and limits.
