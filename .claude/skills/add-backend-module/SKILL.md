---
name: add-backend-module
description: Create or extend a NestJS module following this repo's clean architecture (domain/application/infrastructure/presentation), including use cases, repository ports, Drizzle adapters, zod validation and tests.
---

# Add a backend module / use case

Work inside `apps/api/src/modules/<name>/`. Use `modules/suppliers` as the reference implementation.

## Layout

```
<name>/
  domain/            <entity>.ts, <entity>.rules.ts (pure), errors if specific
  application/
    ports/           <Entity>Repository (abstract class)
    use-cases/       create-<entity>.ts, update-<entity>.ts, list-<entity>.ts ...
    <entity>.types.ts   input/view types
  infrastructure/    drizzle-<entity>.repository.ts, <entity>.mapper.ts
  presentation/      <entity>.controller.ts, <entity>.schemas.ts (zod)
  <name>.module.ts
```

## Steps

1. **Schema**: add/adjust tables in `shared/infrastructure/database/schema.ts`, then follow skill `database-migrations`.
2. **Domain**: entity as `interface`/class with only what rules need. Put rules as pure functions. No imports from `@nestjs/*` or `drizzle-orm`.
3. **Port**: `export abstract class XRepository { abstract findById(id: number): Promise<X | null>; ... }`.
4. **Use cases**: one `@Injectable()` per operation (small CRUD modules may group their use cases in one `<entity>-use-cases.ts` file):
   ```ts
   @Injectable()
   export class CreateSupplier {
     constructor(private readonly suppliers: SupplierRepository) {}
     async execute(input: CreateSupplierInput): Promise<Supplier> { ... }
   }
   ```
   - Multi-write → inject `UnitOfWork` and `run()` once at the top.
   - Throw `NotFoundError`, `ConflictError`, `BusinessRuleError` from `shared/domain/errors.js`.
5. **Adapter**: `DrizzleXRepository` using `this.database.db`; map rows → domain in a mapper; map duplicate-key errors (`ER_DUP_ENTRY`) to `ConflictError` via `isDuplicateEntry(err)`.
6. **Presentation**: zod schemas in `*.schemas.ts` export both schema and `z.infer` type; controller uses `@Body(new ZodValidationPipe(schema))`, `@Query(new ZodValidationPipe(schema))`, `ParseIntPipe` for ids. Add `@Roles(Role.ADMIN)` where restricted. Controllers only call `useCase.execute(...)` and return the result.
7. **Module**: register controllers, use cases, and `{ provide: XRepository, useClass: DrizzleXRepository }`. Export ports other modules need. Import `AppModule` registration in `app.module.ts`.
8. **Tests**: unit-test domain rules and use cases with in-memory fakes of the ports (`test doubles` in `application/use-cases/*.spec.ts`). See skill `testing`.

## Do / Don't

- Do return plain serializable objects (dates as `Date`, Nest serializes to ISO).
- Do paginate lists with `Page<T>`; clamp `pageSize` ≤ 100.
- Don't leak Drizzle row types outside `infrastructure/`.
- Don't call another module's repository directly; depend on its exported use case/service or port.
- Don't put validation rules in controllers beyond shape validation.
