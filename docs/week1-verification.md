# Week-1 verification, 2026-11-01

Done, with gaps: the local parser and builder pass their tests. Semantic validation, customer files and live portal acceptance remain untested.

## Delivered

- `parse1998B`: all 24 ordered string fields, multiple invoices, original field preservation and located diagnostics.
- `build1998B`: complete own-field checks, safe ASCII serialization, exact field order and CRLF framing.
- One unchanged LOC sample, a separately repaired derivative and one independent synthetic golden fixture.
- MIT-licensed code, TypeScript declarations and ESM output. No runtime dependencies.
- A private local Git repository on `codex/week1-1998b`, with no remote and no commits.

## Verification evidence

| Check | Result |
|---|---|
| TypeScript 6.0.3 build | Passed |
| Node 22.23.2 | 46 tests passed |
| Bun 1.4.0 | 46 tests passed |
| Deno 2.9.7 | 46 tests passed |
| Local isolate without Node globals | ESM import, byte parsing and golden build passed |
| npm pack dry run | Passed, no publication. Sources and third-party fixtures excluded |
| `npm ls --omit=dev` | Empty runtime dependency tree |
| Independent review | Two findings fixed, four regressions failed before the fixes and passed afterward |

The isolate test uses Node's experimental VM module support. It approximates a Workers-style global environment. It does not establish behavior in deployed Cloudflare Workers.

## Review fixes

1. A repeated header could become a data record. The parser now treats it as a structural error and returns no records.
2. The builder could omit unknown symbol or non-enumerable own properties. It now inspects all own keys and refuses those fields.

No review finding remains deferred. The second finding was regraded from minor because it violated the builder's no-silent-loss contract.

## Decisions and costs

- The user approved this local start. The implementation follows the existing handover without another approval cycle. API details may change before publication.
- The repository is isolated from existing products. No commits were made because the handover requires an explicit request. Uncommitted files remain the only local implementation record.
- Recoverable character errors retain records for inspection. Callers must inspect diagnostics before treating input as valid.
- The parser tolerates noncanonical framing with warnings. The builder always emits CRLF. Individual portals may be stricter.
- Byte input uses one-to-one byte preservation. It does not guess text encoding. Applications needing decoded Unicode must decode explicitly.
- LOC source material remains local reference material. Fixtures are excluded from the npm package. Repository redistribution rights need review before publication.
- Semantic billing checks belong to week 2. A successful build can still contain invalid dates, amounts or client-specific values.
- CLI, MCP, hosted services and publication remain outside this local deliverable. The product cannot yet be used as a full checker.
- Node, Bun, Deno and isolated JavaScript were checked locally. Customer integrations and portal acceptance need real samples and later verification.
- The supported boundary is ordinary record objects and same-realm byte arrays. Hostile getters, proxies, cross-realm byte arrays and large-file resource limits were not evaluated.

No paid service, domain, membership or ad was purchased. No message was sent or scheduled in this implementation step. The earlier four scheduled emails remain documented in the research folder.
