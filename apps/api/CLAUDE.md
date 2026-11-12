# API (NestJS + Drizzle + MySQL)

Follow the root `CLAUDE.md`. Backend specifics:

## Structure

```
src/
  main.ts / app.module.ts
  config/                 zod-validated env
  shared/{domain,application,infrastructure,presentation}
    domain/errors.ts      DomainError hierarchy
    application/          Page<T>, UnitOfWork port
    infrastructure/database/  schema.ts, DatabaseService (ALS transactions), migrate.ts
    presentation/         ZodValidationPipe, DomainExceptionFilter, @Public, @Roles, @CurrentUser
  modules/<name>/{domain,application,infrastructure,presentation}
  scripts/                seed.ts, import-excel.ts (+ excel/ helpers); all take --company=<slug>
drizzle/                  generated SQL migrations
test/                     e2e (needs MySQL)
```

## Rules

- ESM + `nodenext`: relative imports **must** end in `.js`.
- Inject with the abstract port class (`constructor(private readonly products: ProductRepository)`).
- One use case = one `@Injectable()` class with `execute(input)`; register it in the module providers.
- Repositories read `this.database.db` (never a captured connection) so they join the active transaction.
- Wrap multi-write use cases in `this.uow.run(async () => { ... })`.
- Money is soles (PEN) `decimal(12,4)` in `*_pen` columns, stored without IGV; map to `number` in mappers. Dates: `datetime` UTC, `date` as `YYYY-MM-DD` strings.
- List endpoints return `{ items, total, page, pageSize }`; page size max 100.
- Throw domain errors (`NotFoundError`, `ConflictError`, `BusinessRuleError`), never `HttpException`, from application/domain code.
- Prefix every route with `/api` (global prefix). Routes are kebab-case plural nouns.

## Multi-company (tenancy)

Inventory holds no company configuration. Companies, branding, enabled modules, permissions and user limits belong to the separate `config_inventory` project; this API only reads them (`CompanyDirectory`).

- Shared database: every tenant-owned table has `company_id NOT NULL` (the id assigned by config_inventory, no foreign key), and unique indexes are per company (`(company_id, code)`). Child tables (`*_items`, `product_equipment`) inherit it from their parent.
- Repositories of tenant data inject `TenantContext` and add `eq(table.companyId, this.tenant.companyId)` to **every** select, update and delete, and set `companyId` on every insert. `tenant.companyId` throws when nothing is bound, so a missing binding fails closed.
- The company comes only from the signed JWT (`cid`), bound by `JwtAuthGuard`. Never read it from the request body, params or query.
- Any id received from a client that is stored or joined (category, supplier, product, ...) must be checked through a scoped `findById` before use, so one company cannot reference another's rows. A foreign id must answer 404, never 403.
- Login is `POST /api/auth/login` with `{ company, email, password }`; `company` is the slug known to config_inventory.
- `/api/internal/*` is server-to-server for config_inventory (header `x-service-key` = `INTERNAL_API_KEY`). Keep it minimal.
- Scripts run against one company: `--company=<id>` or `SEED_COMPANY_ID`. They use the raw `db`, so they must scope their own queries.

## Commands

```
pnpm --filter @inventory/api test
pnpm --filter @inventory/api db:generate   # after editing schema.ts
pnpm --filter @inventory/api db:migrate
```
