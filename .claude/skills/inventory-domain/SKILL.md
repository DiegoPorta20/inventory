---
name: inventory-domain
description: Business rules and glossary for the spare-parts inventory (stock, movements, imports, physical counts, reorder). Use before changing or adding any domain logic.
---

# Inventory domain

Source of truth: `docs/domain-analysis.md`. Summary of the invariants the code must keep.

## Glossary

- **Product**: a part/tool/equipment identified by `code` (supplier code, or internal `INT-0001`). Names are NOT unique.
- **Import (#IMP)**: purchase order + shipment from a supplier. Lines = product + quantity + unit cost.
- **Stock movement**: immutable ledger row (`IN | OUT | ADJUSTMENT`) with signed `quantity` and `stockAfter`.
- **Stock count**: physical inventory sheet. Freezes `systemQty`, user enters `countedQty`, completing applies adjustments.
- **Reorder suggestion**: product whose `stock + incoming <= minStock` (with `minStock > 0`).

## Invariants

1. `products.stock >= 0` always. Only `StockLedger.apply()` changes it, inside a transaction, with the product row locked (`FOR UPDATE`).
2. Movement quantity sign: `IN` > 0, `OUT` < 0 (stored signed), `ADJUSTMENT` ≠ 0.
3. Allowed reasons per type live in `modules/inventory/domain/stock-movement.ts` (`REASONS_BY_TYPE`). `IMPORT_RECEIPT` and `COUNT_ADJUSTMENT` are system-only.
4. Stock status: `OUT` (0) → `LOW` (`minStock > 0 && stock <= minStock`) → `OK`.
5. Reorder quantity = `max(minStock * 2 - available, reorderQuantity)` where `available = stock + incoming`.
6. Import state machine: `DRAFT → ORDERED → IN_TRANSIT → RECEIVED`; `CANCELLED` allowed before `RECEIVED`. Editable only while not `RECEIVED`/`CANCELLED`.
7. Receiving an import: one `IN / IMPORT_RECEIPT` movement per line with `receivedQty > 0`, product `cost` updated from the line's unit cost when provided, status → `RECEIVED`, all in one transaction.
8. Completing a count: each line with `countedQty != null` whose `countedQty` differs from the product's **current** stock generates `ADJUSTMENT / COUNT_ADJUSTMENT` of `countedQty - currentStock` (current, not frozen, so movements made during the count are not lost). The note records the frozen `systemQty`.
9. Products with movements cannot be deleted, only deactivated.
10. Codes are unique case-insensitively; normalize with `normalizeProductCode` (trim, remove inner whitespace, uppercase).
11. Pricing: all money is in soles (PEN). `products.pricePen` is the sale price **without IGV**; `costPen` and `wholesalePricePen` follow the same convention. The IGV rate lives in `settings` (default 18 %). Derived prices (`pricing.retail/wholesale`, with `igvPen` and `priceWithIgvPen`) are computed by `modules/settings/domain/pricing.ts` and returned by the products API; never store derived prices. There is no exchange rate.
12. Wholesale price applies from `wholesaleMinQty`. Margin = (price − cost) / price, null when either is unknown.
13. `isConsignment` is true only for products found exclusively in consignment sections of the price list. Cost centers (`cost_centers`) are business lines, independent from categories.

## When adding behavior

- Put the rule in `domain/` as a pure function or entity method and unit test it first.
- Expose it through a use case; never duplicate the rule in a controller or SQL.
- If a rule changes, update `docs/domain-analysis.md` and this file in the same commit.
