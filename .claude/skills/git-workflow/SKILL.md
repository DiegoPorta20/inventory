---
name: git-workflow
description: Branching, Conventional Commits, pre-commit checks and push rules for this repository. Use when committing or opening a PR.
---

# Git workflow

- Default branch `main`. Work on `feat/…`, `fix/…`, `chore/…` branches; merge via PR (squash).
- **Conventional Commits** in English, imperative, ≤ 72 chars: `feat(imports): receive shipment into stock`. Scopes: `api`, `web`, `products`, `imports`, `inventory`, `reorder`, `auth`, `db`, `docs`, `tooling`.
- Before committing run `pnpm lint && pnpm typecheck && pnpm test`; run `pnpm build` before pushing.
- Commit schema + generated migration together. Never commit `.env`, `data/*.xlsx`, `node_modules`, `dist`.
- Don't rewrite published history or force-push shared branches. Don't skip hooks.
- Only commit/push when the user asks.
- PR description: summary, how it was tested, screenshots for UI changes, migration notes.
