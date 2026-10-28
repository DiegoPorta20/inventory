---
name: code-review
description: Review checklist for changes in this repo (architecture boundaries, security, data integrity, UX). Use before merging or when asked to review.
---

# Code review checklist

**Architecture**
- Domain/application import nothing from `@nestjs/*`, `drizzle-orm`, or `express`.
- Controllers contain no business logic; use cases hold one operation each.
- Cross-module access goes through exported use cases/ports.
- Stock is changed only via `StockLedger`.

**Data integrity**
- Multi-write operations are inside `UnitOfWork.run`.
- Locking (`FOR UPDATE`) where concurrent stock edits are possible.
- Migration included and reviewed; indexes exist for new filters.

**Security**
- Endpoint is authenticated; role decorators correct; no mass assignment (zod `.strict()`).
- No secrets/tokens/PII in logs or errors; SQL only via Drizzle.
- Cookies httpOnly + SameSite; file uploads (if any) size/type limited.

**Quality**
- Tests cover new rules and a failure path. No commented-out code, no dead exports.
- Comments only where intent isn't obvious. English identifiers.
- Errors are domain errors with stable `code` values.

**Frontend/UX**
- Loading, empty, error states; keyboard + focus handling; responsive.
- Filters in URL; no direct `HttpClient` in components; Spanish copy is consistent.

Report findings as: blocking / should fix / nit, with file:line.
