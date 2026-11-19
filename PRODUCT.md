# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Existing zero-runtime-dependency TypeScript library with local Node tooling. The browser surface uses static HTML, CSS and JavaScript around the existing checker. This implementation choice preserves the user's approved local-only scope.

## Users

The handover targets outsourced legal-billing bureaus and small law firms. A billing worker needs to inspect a LEDES invoice before submission. Customer demand remains unproven.

## Product Purpose

Read LEDES 1998B files, detect implemented format and arithmetic problems, and explain corrections at the affected fields. Never claim that a pass guarantees portal acceptance.

## Operating Context

Users select an invoice file and review errors and warnings. The owner is validating the product through email-only discovery. Current examples are synthetic or LOC reference files, not customer evidence.

## Capabilities and Constraints

The parser, builder, core checks and explanations already exist. The new interface must reuse them. Processing stays in browser memory. No upload, account, analytics, saved history, paid service, publication or automatic invoice repair is authorized.

The checker validates field lengths, timekeeper name format and reference classification membership. Ambiguous description sizes and numeric widths warn. Client-specific code lists are available through the library and CLI, but not this browser interface. Client guidelines and live portal acceptance remain unverified. The interface must disclose these limits.

## Brand Commitments

`billcheck` is the approved working name. Final branding and domain are undecided. No existing visual identity was supplied. Visual choices in this task are implementation assumptions, not claimed user preferences.

## Evidence on Hand

`docs/week2-verification.md`, `examples/invalid-invoice.txt`, the synthetic golden fixture and the LOC field specification support the current implementation. There are no customer testimonials, proven savings or portal-acceptance results.

## Product Principles

- Preserve the original file and its values.
- Make the location and correction of a problem understandable.
- Separate implemented checks from client-dependent requirements.
- Keep the validation experiment local and inexpensive.
