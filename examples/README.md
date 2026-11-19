# Local demonstration

`invalid-invoice.txt` contains fictitious data with two deliberate problems: an impossible invoice date, 2026-02-29, and an invoice total of 99 against line totals of 12.34.

After `npm run build`, run:

```sh
node bin/billcheck.mjs check examples/invalid-invoice.txt
node bin/billcheck.mjs explain INVOICE_TOTAL_MISMATCH
```

The check exits with code 2. `invalid-report.txt` captures the human-readable report. The command does not change the invoice.

The passing sample is `tests/fixtures/synthetic-1998b.txt`.
