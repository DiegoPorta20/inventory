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
  scripts/                seed.ts, import-excel.ts (+ excel/ helpers)
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

## Commands

```
pnpm --filter @inventory/api test
pnpm --filter @inventory/api db:generate   # after editing schema.ts
pnpm --filter @inventory/api db:migrate
```
