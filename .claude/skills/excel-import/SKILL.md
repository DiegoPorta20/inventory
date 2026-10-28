---
name: excel-import
description: How the Excel inventory importer works (parsing, code normalization, de-duplication, category classification, import batches, sales) and how to extend its rules. Use when changing apps/api/src/scripts/import-excel.ts or classifier rules.
---

# Excel importer

Run: `pnpm db:import-excel [path] [--reset] [--min-stock=N] [--dry-run]` (default path `data/inventory.xlsx`).

Files (`apps/api/src/scripts/excel/`):
- `inventory-sheet.reader.ts` – reads sheet `INVENTARIO 30.09` rows into `RawRow[]` (handles formula cells via `.result`).
- `normalize.ts` – code/description/unit normalization (pure, tested).
- `classifier.ts` – ordered keyword rules → category slug (pure, tested).
- `equipment-links.ts` – detects equipment tokens (`WD561`, `WY800`, `WY1000`, `U1528`) in descriptions.
- `plan-import.ts` – turns raw rows into an `ImportPlan` (products, imports, movements). Pure and tested.
- `../import-excel.ts` – applies the plan to MySQL in one transaction.

## Sheet columns (row 3 header, data from row 4)

B ITEM · C #IMP · D CODE · E DESCRIPTION · F UNIT · G RECEIVED · H SOLD · I THEORETICAL STOCK (formula) · J PHYSICAL · K DIFF · L NOTES.

## Rules

- Code: remove all whitespace, uppercase. Empty → `INT-0001…` (sequential, `isInternalCode = true`).
- Same code in several rows → one product; stock = Σreceived − Σsold; each row becomes an import line.
- Description: trim, collapse whitespace; ALL-CAPS descriptions → sentence case. Keep Spanish text as is.
- Unit: `unid.`→`UNIT`, `pcs`→`PCS`, `set`→`SET`, missing→`UNIT`.
- Imports: one `RECEIVED` import per `#IMP` number, `receivedAt` = snapshot date (2026-09-30), note "Migrated from Excel".
- Sold quantity → single `OUT / SALE` movement per product, note "Historical sales until snapshot (Excel)".
- Classification: first matching rule wins; fallback category `uncategorized`. Print an "unclassified" report so rules can be improved.
- Idempotency: aborts if products exist unless `--reset`, which clears inventory tables (not users).

## Extending

1. Add/adjust a rule in `classifier.ts` (keep rules ordered from most specific to most generic; match on accent-stripped lowercase).
2. Add a test case in `classifier.spec.ts` with the real description that failed.
3. Never commit the real spreadsheet; use tiny synthetic fixtures under `test/fixtures`.
