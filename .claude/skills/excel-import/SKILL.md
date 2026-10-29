---
name: excel-import
description: How the Excel importers work (inventory snapshot and sale price list: parsing, code normalization, de-duplication, classification, matching, pricing) and how to extend their rules. Use when changing apps/api/src/scripts/import-*.ts or anything under scripts/excel.
---

# Excel importers

Two scripts, run in this order (files live in `data/`, git-ignored):

1. `pnpm db:import-excel [path] [--reset] [--min-stock=N] [--dry-run]` – inventory snapshot (`data/inventory.xlsx`): products, import batches, stock movements.
2. `pnpm db:import-prices [path] [--dry-run] [--create-missing]` – sale price list (`data/Precios*.xlsx`, sheet `APU`): prices, specification, cost center, consignment, wholesale, equipment links. It updates existing products matched by code (tolerating O/D typos for zero) or by unique name; it never touches stock. `--create-missing` only creates unmatched rows that have a price.

Files (`apps/api/src/scripts/excel/`):

- `inventory-sheet.reader.ts` / `price-sheet.reader.ts` – locate columns by header text (robust to shifts), read formula/rich-text cells.
- `normalize.ts` – code/description/unit normalization (pure, tested).
- `classifier.ts` – ordered keyword rules → category slug (pure, tested). `taxonomy.ts` – category tree.
- `equipment-links.ts` – equipment seeds and token detection (`WD561/DK0138`, `WY800`, `WY1000`, `U1528`, `Yuchai`).
- `plan-import.ts`, `plan-prices.ts` – pure planners that turn raw rows into a plan; tested without a database.
- `../import-excel.ts`, `../import-prices.ts` – apply the plan to MySQL in one transaction.

## Inventory sheet (header row 3, data from row 4)

B ITEM · C #IMP · D CODE · E DESCRIPTION · F UNIT · G RECEIVED · H SOLD · I THEORETICAL STOCK (formula) · J PHYSICAL · K DIFF · L NOTES.

- Code: remove all whitespace, uppercase. Empty → `INT-0001…` (`isInternalCode = true`); identical names without code share one internal code.
- Same code in several rows → one product; stock = Σreceived − Σsold; each row becomes an import line.
- Description: trim, collapse whitespace; ALL-CAPS → sentence case. Unit: `unid.`→`UNIT`, `pcs`→`PCS`, `set`→`SET`.
- One `RECEIVED` import per `#IMP`, `receivedAt` = snapshot date (2026-09-30); sold quantity → one `OUT / SALE` movement per product.
- Classification: first matching rule wins, fallback `uncategorized`; the script prints the unclassified list.
- Idempotency: aborts if products exist unless `--reset` (clears inventory tables, not users).

## Price sheet (`APU`, header row 3)

D CODE · C DESCRIPTION · E SPECIFICATION · F COST CENTER · K PRICE USD WITHOUT IGV · N PRICE S/ WITH IGV (rate in N4) · wholesale block (`PRECIO USD X unidad`, `CANTIDAD POR MES`).

- Section rows (no data) set the context: `Jumbo` → equipment _Jumbo DK0138_, `Yuchai` → also _Motor Yuchai_, `Consignación` → consignment flag.
- Several rows with the same code → quantity-weighted average price. The legacy price list is in USD (wholesale USD has IGV): `import-prices` converts it to soles with the exchange rate found in the file (default 3.6) and stores prices without IGV.
- Specification cleanup removes Chinese text and placeholders (`Repuesto`, `/`).
- Cost center names are normalized (`repuesto Jumbo` → `Repuesto Jumbo`).
- Stock columns of the price list are ignored on purpose.

## Extending

1. Add/adjust a rule in `classifier.ts` (most specific first; match on accent-stripped lowercase).
2. Add a test with the real description that failed (`import.spec.ts`, `plan-prices.spec.ts`).
3. Never commit the real spreadsheets; use tiny synthetic fixtures.
