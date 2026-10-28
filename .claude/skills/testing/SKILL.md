---
name: testing
description: How to write and run tests in this repo (Vitest for API and web, fakes over mocks, e2e against MySQL). Use when adding features or fixing bugs.
---

# Testing

## What to test (priority order)

1. **Domain rules** (pure functions/entities): stock status, reorder quantity, import state machine, movement reasons, classifier, normalizers.
2. **Use cases** with in-memory fakes of repository ports and a fake `UnitOfWork` (`run: fn => fn()`).
3. **Repositories / e2e** against real MySQL (`pnpm db:up`), only for queries with non-trivial SQL (filters, aggregations, locking). Files: `test/*.e2e-spec.ts`; use a dedicated `inventory_test` database.
4. **Frontend**: pure helpers, API services (`HttpTestingController`), components with logic (filters/forms). Skip pixel/markup assertions.

## Conventions

- Co-locate `*.spec.ts` next to the code. Name: `it('rejects an OUT movement greater than stock')` – behavior, not method names.
- Prefer hand-written fakes (`InMemoryProductRepository`) over `vi.fn()` mocks; assert outcomes, not calls.
- One behavior per test; arrange with small factory helpers (`aProduct({ stock: 5 })`).
- No real Excel or secrets in fixtures.
- Fix flaky/slow tests; do not `skip` them.

## Commands

```
pnpm test                               # all workspaces
pnpm --filter @inventory/api test -- stock-ledger
pnpm --filter @inventory/api test:e2e   # needs MySQL + DATABASE_URL pointing to test DB
pnpm --filter @inventory/web test
```
