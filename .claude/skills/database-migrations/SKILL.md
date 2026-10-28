---
name: database-migrations
description: Change the MySQL schema safely with Drizzle (edit schema.ts, generate, review and apply a migration). Use for any table/column/index change.
---

# Database migrations (Drizzle + MySQL)

Schema: `apps/api/src/shared/infrastructure/database/schema.ts`. Migrations: `apps/api/drizzle/` (committed).

## Workflow

1. Edit `schema.ts`. Conventions: `snake_case` columns, `int` autoincrement ids, `created_at`/`updated_at` on mutable tables, explicit FKs with `onDelete` behavior, indexes for every filter/sort column.
2. `pnpm db:generate` → creates `drizzle/NNNN_name.sql`. Review the SQL.
3. `pnpm db:up` (MySQL) then `pnpm db:migrate`.
4. Update mappers/repositories and tests.
5. Commit schema + SQL + snapshot (`drizzle/meta/`) together.

## Rules

- Never edit an applied migration; add a new one.
- Destructive changes (drop column/table, type narrowing) need an explicit data-preservation plan; ask the user first.
- New NOT NULL columns on populated tables need a default or a two-step migration.
- Money: `decimal(12,4)` with `mode: 'number'`. Booleans: `boolean`. Enumerations: `varchar` + TS union (keeps migrations cheap); validate in zod and domain.
- Production applies migrations on boot when `RUN_MIGRATIONS=true` (Docker default).
- Verify with a clean database: `docker compose down -v && pnpm db:up && pnpm db:migrate`.
