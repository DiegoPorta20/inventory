---
name: ui-design-system
description: Visual language, tokens, shared UI components and UX patterns for the inventory web app. Use when building or restyling any screen.
---

# UI design system

Goal: a calm, dense-but-readable operations tool. Fast scanning of tables, obvious stock status, minimal clicks.

## Tokens (defined in `apps/web/src/styles.css` under `@theme`)

- Brand: `--color-brand-50…900` (navy `#273f85` from the WY Miner logo/site; `accent-*` is its cyan `#01abce`). Primary actions use `brand-600`, hover `brand-700`.
- Neutrals: slate scale. Page bg `slate-50`, cards white with `border-slate-200`, text `slate-900/600/500`.
- Status colors (always paired with icon/text, never color alone): OK = emerald, LOW = amber, OUT = rose, info = sky, neutral = slate.
- Radius: `rounded-lg` controls, `rounded-xl` cards. Shadow: `shadow-sm` only; elevation for dialogs/menus (`shadow-xl`).
- Typography: Inter/system UI. Page title `text-xl font-semibold`, section `text-sm font-semibold uppercase tracking-wide text-slate-500`, numbers `tabular-nums`.
- Spacing scale: 4/8 grid; page padding `p-4 md:p-6`; max content width `max-w-7xl`.

## Shared components (`shared/ui`)

`ui-button` (variants: primary, secondary, ghost, danger; sizes sm/md; `loading`), `ui-input`/`ui-select`/`ui-textarea` via `FieldComponent` wrapper (label, hint, error), `ui-badge` (tone), `ui-stock-badge` (OUT/LOW/OK), `ui-card`, `ui-stat-card`, `ui-table` helpers (sticky header, zebra off, row hover), `ui-pagination`, `ui-empty-state`, `ui-skeleton`, `ui-dialog` (CDK Dialog, focus trap), `ui-confirm-dialog`, `ui-toast` (via `ToastService`), `ui-icon` (inline SVG set), `ui-page-header`, `ui-filter-bar`, `ui-tabs`.

## UX patterns

- **Layout**: fixed sidebar (collapsible to icons on `lg`, off-canvas on mobile) + top bar with global product search (`/` shortcut) and user menu.
- **Lists**: filter bar on top (search + selects + chips of active filters with "Limpiar"), table below, pagination footer showing "1–25 de 638". Row click opens detail; row actions in a kebab menu.
- **Stock**: always show quantity + unit + status badge. Low/out rows get a subtle left border in the status color.
- **Forms**: single column up to `md`, two columns after; primary action bottom-right; unsaved-changes guard on long forms.
- **Quick actions**: "Registrar movimiento" is reachable from the product detail and the top bar.
- **Feedback**: toast for success, inline for validation, banner for page-level errors. Buttons show spinner and are disabled while saving.
- **Empty states** explain what the screen is for and offer the primary action.
- **Numbers**: right-aligned, `tabular-nums`, thousands separators, USD with 2 decimals (4 on cost inputs).
- **Dark mode**: not in scope; keep tokens so it can be added.

## Accessibility

Contrast ≥ 4.5:1, focus ring `ring-2 ring-brand-500 ring-offset-2` on every interactive element, `aria-live="polite"` for toasts, dialogs with `role="dialog"`, `aria-modal`, labelled by title; tables use `<th scope>`; icon-only buttons have `aria-label`.
