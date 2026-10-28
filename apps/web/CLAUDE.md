# Web (Angular + Tailwind)

Follow the root `CLAUDE.md`. Frontend specifics:

## Structure

```
src/app/
  core/       api client, auth (session store, guard, interceptor), layout shell, error handling
  shared/     ui/ (design-system components), pipes, utils, models
  features/<name>/   routes.ts, pages/, components/, <name>.api.ts, <name>.store.ts (optional)
```

## Rules

- Standalone components only, `ChangeDetectionStrategy.OnPush`, `inject()`, signals (`signal`, `computed`, `input()`, `output()`), `@if/@for/@switch`.
- Zoneless app. Do not rely on Zone.js behavior.
- One `*.api.ts` per feature wraps `HttpClient`; components never call `HttpClient` directly.
- Typed reactive forms (`FormBuilder.nonNullable`). Show inline validation and server errors.
- Every data view handles: loading (skeleton), empty (call to action), error (retry).
- Filters live in the URL query params so views are shareable and survive refresh.
- UI strings are Spanish; identifiers, files and API types are English.
- Use design-system components from `shared/ui` before creating new ones. Tailwind utility classes + theme tokens defined in `styles.css` (`@theme`).
- Accessibility: semantic elements, labels bound to inputs, visible focus, `aria-*` for dialogs/menus, color never the only signal.

## Commands

```
pnpm --filter @inventory/web dev      # ng serve with /api proxy to :3000
pnpm --filter @inventory/web build
pnpm --filter @inventory/web test
```
