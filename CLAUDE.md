# Inventory

Internal web app for a spare-parts company: know what is in stock, what to reorder, product details and classification. Monolith repo: Angular SPA + NestJS API + MySQL, served as one deployable.

Business context and rules: `docs/domain-analysis.md` (read before touching domain logic).

## Layout

```
apps/api   NestJS 12 (ESM) + Drizzle ORM + MySQL, clean architecture
apps/web   Angular 22 (standalone, signals, zoneless) + Tailwind 4
docs/      domain analysis
data/      real Excel files (git-ignored, never commit)
.claude/   skills, agents, settings
```

## Commands (pnpm workspace, run from repo root)

```
pnpm install
pnpm db:up              # MySQL in docker (needs .env from .env.example)
pnpm db:migrate         # apply migrations
pnpm db:seed            # first admin user + base categories
pnpm db:import-excel    # load data/inventory.xlsx
pnpm db:import-prices   # apply data/Precios*.xlsx (prices, cost centers, consignment)
pnpm db:seed-demo       # dev only: random commercial data, imports, sales, count
pnpm dev                # api :3000 + web :4200 (proxy /api)
pnpm lint | typecheck | test | build
```

On Windows PowerShell use `pnpm.cmd` if script execution is blocked.

## Language and style rules

- All code, identifiers, commits, API fields and error messages in **English**. The UI text is Spanish (Peru) and lives in templates.
- **Comment sparingly**: only non-obvious business rules, invariants, or workarounds. No comments that restate code, no JSDoc boilerplate.
- TypeScript strict. No `any` (use `unknown` + narrowing). No default exports (except Angular lazy routes if required).
- Small files, one responsibility. Prefer pure functions and immutable data.
- Never edit generated migration SQL by hand after it was applied; add a new migration.
- Windows/PowerShell 5: do not rewrite source files with `Get-Content | Set-Content` (it corrupts UTF-8 accents and adds a BOM). Use the editor tools.

## Architecture (backend)

Clean architecture per module, dependencies point inward only:

```
presentation  → application → domain
infrastructure → application/domain (implements ports)
```

- `domain/`: entities, value objects, domain errors, business rules. No Nest, no Drizzle, no I/O.
- `application/`: one class per use case (`execute(input)`), repository **ports** (abstract classes), DTO/view types. Depends on domain only.
- `infrastructure/`: Drizzle repositories, hashing, external adapters. Implements ports.
- `presentation/`: controllers, zod schemas, guards. Translates HTTP ⇄ use case input. No business logic.
- Modules wire ports to adapters: `{ provide: ProductRepository, useClass: DrizzleProductRepository }`.
- Stock changes go through `StockLedger` only (inside a `UnitOfWork`). Never `UPDATE products SET stock` elsewhere.
- Validation: zod at the edge (`ZodValidationPipe`). Domain errors extend `DomainError` and are mapped to HTTP by one global filter.

See skills `add-backend-module`, `database-migrations`, `testing`.

## Architecture (frontend)

`core/` (api client, auth, layout shell), `shared/` (design system `ui/`, pipes, utils), `features/<name>/` (lazy routes, pages, components, data-access). Signals + `inject()`, `OnPush`, new control flow (`@if/@for`), typed reactive forms. See skills `add-frontend-feature`, `ui-design-system`.

## Security baseline

- JWT in httpOnly, SameSite=Strict cookies (access 15m, refresh 7d). Global auth guard; opt out with `@Public()`.
- Passwords hashed with scrypt behind the `PasswordHasher` port. Never log secrets or tokens.
- Roles via `@Roles(...)` + `RolesGuard`; only `ADMIN` exists today, keep new endpoints role-aware.
- Rate-limit login. Helmet enabled. All inputs validated by zod. Parameterised queries only (Drizzle).
- `.env` and Excel files are git-ignored. Do not paste real data into tests; use fixtures.

## Definition of done

1. `pnpm lint && pnpm typecheck && pnpm test && pnpm build` pass.
2. New behavior has tests (domain rules and use cases at minimum).
3. DB changes come with a generated migration.
4. UI changes follow the design system, are keyboard accessible, and show loading / empty / error states.
5. Conventional Commit message (`feat(products): …`).

## Skills index (`.claude/skills`)

| Skill | Use when |
| --- | --- |
| `inventory-domain` | Any business logic: stock, movements, imports, counts, reorder |
| `add-backend-module` | Creating or extending an API module/use case |
| `database-migrations` | Changing the schema |
| `excel-import` | Touching the Excel importer or classification rules |
| `add-frontend-feature` | Creating a web page/feature |
| `ui-design-system` | Building or styling UI |
| `testing` | Writing or running tests |
| `git-workflow` | Committing, branching, pushing |
| `code-review` | Reviewing a change before merge |
