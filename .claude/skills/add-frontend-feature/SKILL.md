---
name: add-frontend-feature
description: Create an Angular feature (lazy routes, pages, API service, signal state, forms, tables with URL-synced filters) following this repo's conventions.
---

# Add a frontend feature

Work in `apps/web/src/app/features/<name>/`. Use `features/products` as the reference.

## Layout

```
<name>/
  <name>.routes.ts          lazy routes (exported const)
  <name>.api.ts             HttpClient wrapper + request/response types
  pages/<name>-list.page.ts, <name>-detail.page.ts, <name>-form.page.ts
  components/               feature-only presentational components
```

Register in `app.routes.ts`: `{ path: '<name>', loadChildren: () => import('./features/<name>/<name>.routes').then(m => m.<NAME>_ROUTES) }` inside the authenticated shell route.

## Conventions

- Components: `standalone`, `ChangeDetectionStrategy.OnPush`, inline `template` if < ~60 lines, otherwise `.html` file next to it.
- State: `signal`/`computed`; async via `resource()`/`rxResource()` or `toSignal`. Keep side effects in `effect()` sparingly.
- API service: `inject(HttpClient)`, base path `/api/<plural>`, returns typed `Observable`. Query params built with `HttpParams` from a filter object, dropping empty values.
- List pages: filters in the URL (`ActivatedRoute.queryParamMap` ⇄ `router.navigate({queryParams, queryParamsHandling: 'merge'})`), debounce search (300 ms), pagination component, loading skeleton, empty state, error state with retry.
- Forms: typed `FormBuilder.nonNullable`; map server `VALIDATION_ERROR.details` to controls; disable submit while pending; toast on success/failure via `ToastService`.
- Destructive actions use `ConfirmDialog` (never `window.confirm`).
- Labels in Spanish; keep texts short and action-oriented ("Guardar", "Registrar salida").
- Format numbers/dates with the shared pipes (`es-PE` locale): `quantity`, `pen` (soles), `dateTime`.

## Checklist

- [ ] Route + nav item (sidebar in `core/layout`) + page title
- [ ] Loading / empty / error states
- [ ] Keyboard and screen-reader pass (labels, focus after dialogs)
- [ ] Responsive: table → cards or horizontal scroll under `md`
- [ ] Spec for api service or store logic (see `testing`)
