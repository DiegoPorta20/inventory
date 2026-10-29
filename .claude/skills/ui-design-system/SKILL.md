---
name: ui-design-system
description: Visual language, tokens, shared UI components and UX patterns for the inventory web app. Use when building or restyling any screen.
---

# UI design system

Goal: a calm, dense-but-readable operations tool. Fast scanning of tables, obvious stock status, minimal clicks.

## Tokens (defined in `apps/web/src/styles.css` under `@theme`)

- Brand: `--color-brand-50…900` (navy `#273f85` from the WY Miner logo/site; `accent-*` is its cyan `#01abce`). Primary actions use `brand-600`, hover `brand-700`.
- Neutrals: slate scale. The page background is a tinted `--page` (`#eceff5`); cards are off-white (`bg-white` = `#fcfdfe`) with a hairline `--line` border and a soft shadow, so surfaces float on the page. Text `slate-900/600/500`.
- Status colors (always paired with icon/text, never color alone): OK = emerald, LOW = amber, OUT = rose, info = sky, neutral = slate.
- Shape: the whole UI is rounded. Cards/panels `--r-card` (22px, `rounded-2xl`), dialogs `rounded-3xl`, form fields `rounded-xl` (12px). Buttons, search boxes, toolbar selects (`input-pill`), chips and badges are full pills; the sidebar is a floating 26px panel. Shadows are soft and low-opacity with a long offset blur (`shadow-sm` for cards, `shadow-xl` for dialogs/menus/popovers).
- Typography: Urbanist (variable, self-hosted via `@fontsource-variable/urbanist`). Page title `.page-title` (clamp 26-34px, semibold, tight tracking), section labels `.section-title` (uppercase, bold), numbers `tabular-nums`.
- Spacing scale: 4/8 grid; page gutter `--gutter` (16-28px); max content width 1600px.

## Motion

One easing everywhere: `--ease` = `cubic-bezier(.2,.8,.2,1)`. Always respect `prefers-reduced-motion` (the global rule already shortens everything).

- Hover/press: buttons and fields transition colour, border and shadow in 0.2-0.25s; buttons scale to 0.97 on press. `.card-lift` raises a card 3px on hover.
- Entrances: pages fade in; cards and table rows rise 14px in a short stagger (`rise`). Dialogs, menus, popovers and toasts use `.pop-in` (scale + fade). Progress bars grow with `.meter-fill`.
- Sidebar: a single `.nav-pill` slides behind the active item (0.55s) instead of each item switching background.
- `.magnetic` on a primary header button makes it drift toward the cursor (desktop with a fine pointer only; handled by `ShellComponent`).
- Use only `transform`/`translate`/`scale`/`opacity` for movement; never animate layout properties.

## Shared components (`shared/ui`)

`ui-button` (variants: primary, secondary, ghost, danger; sizes sm/md; `loading`), `ui-input`/`ui-select`/`ui-textarea` via `FieldComponent` wrapper (label, hint, error), `ui-badge` (tone), `ui-stock-badge` (OUT/LOW/OK), `ui-card`, `ui-stat-card`, `ui-table` helpers (sticky header, zebra off, row hover), `ui-pagination`, `ui-empty-state`, `ui-skeleton`, `ui-dialog` (CDK Dialog, focus trap), `ui-confirm-dialog`, `ui-toast` (via `ToastService`), `ui-icon` (inline SVG set), `ui-page-header`, `ui-filter-bar`, `ui-tabs`.

## UX patterns

- **Layout**: floating dark sidebar (off-canvas on mobile) + borderless top bar with the global product search pill (`/` shortcut) and user menu.
- **Lists**: filter bar on top (search + selects + chips of active filters with "Limpiar"), table below, pagination footer showing "1–25 de 638". Row click opens detail; row actions in a kebab menu.
- **Stock**: always show quantity + unit + status badge. Low/out rows get a subtle left border in the status color.
- **Forms**: single column up to `md`, two columns after; primary action bottom-right; unsaved-changes guard on long forms.
- **Quick actions**: "Registrar movimiento" is reachable from the product detail and the top bar.
- **Feedback**: toast for success, inline for validation, banner for page-level errors. Buttons show spinner and are disabled while saving.
- **Empty states** explain what the screen is for and offer the primary action.
- **Numbers**: right-aligned, `tabular-nums`, thousands separators, soles (`S/`, `pen` pipe) with 2 decimals (4 on cost inputs); always label whether a price is "sin IGV" or "con IGV".
- **Dark mode**: not in scope; keep tokens so it can be added.

## Accessibility

Contrast ≥ 4.5:1, focus ring `ring-2 ring-brand-500 ring-offset-2` on every interactive element, `aria-live="polite"` for toasts, dialogs with `role="dialog"`, `aria-modal`, labelled by title; tables use `<th scope>`; icon-only buttons have `aria-label`.
