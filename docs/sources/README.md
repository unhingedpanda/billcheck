# LEDES 1998B source provenance

Retrieved from the LEDES Oversight Committee on 2026-11-01:

| Source | Local evidence | SHA-256 |
|---|---|---|
| [Field specification, July 2014 revision](https://ledes.org/wp-content/uploads/2014/08/Ledes-1998B-Format-Rev-7-2014.xls) | `ledes-1998b-rev-2014.xls`, ignored by Git | `ecabeafbd58f16edeb0da3b38e1f8b480082796a448f4cec5aca3c877b19e26e` |
| [Official sample](https://ledes.org/wp-content/uploads/2017/11/Ledes98B-Sample-File-Rev-7-2014.txt) | `../../tests/fixtures/loc-1998b-rev-2014.txt`, unchanged | `82196405dd47ccf887053e75860ebd4b336c4519a8f7c650d614278f73e85d77` |
| [LOC overview](https://ledes.org/ledes-98b-format/) | `overview.html`, ignored by Git | Describes ASCII, pipe delimiters and 24 fields. |
| [Timekeeper classifications, June 2023 update](https://ledes.org/wp-content/uploads/2023/06/LEDES-Revised-Timekeeper-Classifications-Reference-Document-6-2023-Upd.xlsx) | `timekeeper-classifications-2023.xlsx`, ignored by Git | `2c363f8d4f102ae7ab573b7891a1f0bcfe3f3e79a557aaa2102aebf5e0e12093` |

The workbook was read with xlrd 2.0.2 in a temporary uv environment. That tool is not a project dependency. `spec-extract.txt` is a local, ignored text extraction for inspection.

The workbook carries LOC copyright and an all-rights-reserved notice. No ownership or MIT relicensing of LOC material is asserted. Downloads are local reference material. On 2026-11-19 the LOC board approved the use of its error-code and classification identifiers and of the sample file in a public repository, with credit to LEDES. LOC fixtures and derivatives stay excluded from the npm package.

## Observations and choices

- The unchanged 1,509-byte sample has six data records across two invoices, including an invoice fee adjustment.
- Its first data record contains the single byte `0x92`, which is not ASCII. The parser reports `NON_ASCII` and retains it for inspection.
- The sample ends with a space-only line after the last CRLF. The parser reports `TRAILING_WHITESPACE` and the builder omits it.
- `loc-1998b-ascii-canonical.txt` is derived only by replacing that single `0x92` with `0x27` and removing the last three bytes, space + CRLF.
- `synthetic-1998b.txt` is independently authored, with fictitious identifiers and amounts. It is not based on customer data.
- CRLF output follows the official sample and the handover. Tolerant input framing is a project choice.
- The builder's printable-ASCII/control-character policy protects record serialization. It is not a complete implementation of the field specification.
- The workbook allows multiple invoices in one file. Field validation and invoice-level consistency checks belong to week 2.

No LOC standardized error-code descriptions are embedded. Diagnostic identifiers and wording belong to this project. Related LOC identifiers are covered below.

## Format-check follow-through, 2026-11-01

The field workbook was downloaded again. Its SHA-256 matched the original local copy. The classification workbook was retrieved from the [LOC classification page](https://ledes.org/loc-revised-timekeeper-classification-codes-august-2014/). Python's standard ZIP/XML libraries read its first sheet, rows 4–54. All 51 identifiers were compared against `src/classifications.ts`. Identifiers include the exact source spellings `TRANEE` and `IPSVPV`.

Only bare classification identifiers are embedded. Definitions, eligibility tables and official error descriptions are not reproduced. Former 1998B identifiers AS, PT, LA, OC and OT produce project-authored warnings. No automatic replacement or client-approval inference occurs.

Character limits and surname/comma/given-name structure follow the field workbook. The workbook does not define KB or numeric-width notation. Description sizes from 15,001 to 15,360 ASCII bytes warn. Larger descriptions fail. Numeric width warnings use 6/8 significant whole digits for the workbook's 10.4/12.4 notation. This interpretation remains receiver-dependent and does not change exact arithmetic.

Task and activity requirements depend on the receiving client. Explicit code lists allow custom identifiers within the specification's field lengths. No universal UTBMS membership list is assumed.

## LOC error-code mapping, 2026-11-19

| Source | Local evidence | SHA-256 |
|---|---|---|
| [LOC Standardized Error Codes V2, 2024-09](https://ledes.org/ledes-error-codes/loc-standardized-error-codes-v2-2024-09/) | `loc-error-codes-v2-2024-09.xlsx`, ignored by Git | `a98d2248d9eeade08d8594c78d43311b59fea22cc832a8f0656006eeba3f3f93` |

The page URL serves the workbook directly. Python's standard ZIP/XML libraries read its three sheets. On every row of the "V2 Error Codes" sheet, the error code equals the prefix, a hyphen and the four-digit suffix.

`loc-error-codes-v2-98b.txt` lists 251 identifiers: the 246 distinct identifiers whose rows name 98B (251 rows, five repeated) and the five fatal file codes. It holds identifiers only. `src/loc-codes.ts` maps a billcheck rule, field and line type to one identifier. Each entry names its spreadsheet row, not the value in the sheet's "Row #" column. The table has 45 entries: 2 structural, 13 invoice-level, 11 fee, 13 expense and 6 adjustment.

The line type selects the prefix range from the XML segment the sheet assigns: 12xx to 14xx for fee lines (TKSUM, FEE, FEE_ITEM_DISC_CRED), 16xx and 17xx for expense lines (EXPENSE, EXPENSE_ITEM_DISC_CRED) and 10xx for IF and IE lines (MATTER_DISC_CRED). Invoice and matter fields use prefixes below 1000. An entry exists only where exactly one identifier matches. The sheet reuses some prefixes for different fields (1011, 802), which the field match handles.

Each entry was checked against its row for identifier, field name, suffix, prefix range and 98B applicability. Unmapped by design: `LAW_FIRM_ID` (101, 202 and 302), fee-line `TIMEKEEPER_ID`, `TIMEKEEPER_CLASSIFICATION` and `LINE_ITEM_UNIT_COST` (TKSUM and FEE both match), fee-line adjustment amounts (FEE and FEE_ITEM_DISC_CRED both match) and `INVALID_SIGNATURE` (1-0003 and 1-0004 both fit). Suffix 33, allowed values, has no 98B row, so line-type, classification and character checks stay unmapped.
