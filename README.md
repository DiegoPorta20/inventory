# Inventario

Aplicación web interna para una empresa que vende repuestos: saber qué hay en stock, qué falta y qué pedir, con detalle y clasificación de productos. Monolito pnpm: **Angular** (SPA) + **NestJS** (API) + **MySQL**, servido como un único despliegue.

El análisis del Excel de inventario que originó el diseño está en [`docs/domain-analysis.md`](docs/domain-analysis.md).

## Módulos

Panel · Productos (filtros, detalle, edición en lote, exportación Excel) · Categorías · Movimientos (libro de stock) · Conteos físicos · Reposición (qué pedir y cuánto) · Importaciones (pedido → tránsito → recepción) · Proveedores · Equipos compatibles · Usuarios.

## Requisitos

Node 22+, pnpm 11 (`corepack enable`), Docker (para MySQL).

## Puesta en marcha

```bash
pnpm install
cp .env.example .env          # cambia los secretos JWT
pnpm db:up                    # MySQL 8.4 en Docker
pnpm db:migrate               # crea las tablas
pnpm db:seed                  # admin inicial + categorías + equipos
pnpm db:import-excel          # opcional: carga data/inventory.xlsx
pnpm dev                      # API http://localhost:3000 + web http://localhost:4200
```

Usuario inicial: el definido en `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` (`.env`). Cámbiala desde *Mi cuenta*.

`pnpm db:import-excel [archivo] [--reset] [--dry-run] [--min-stock=N] [--snapshot=YYYY-MM-DD]` clasifica productos, consolida códigos repetidos y crea importaciones y movimientos. Los Excel están en `.gitignore`: nunca se versionan.

## Producción (monolito)

```bash
docker compose --profile app up -d --build   # MySQL + app en :3000
```

La imagen compila Angular y Nest; Nest sirve la SPA y la API (`/api`). Las migraciones se aplican al iniciar (`RUN_MIGRATIONS=true`). Para el primer usuario ejecuta dentro del contenedor `node dist/scripts/seed.js`. Detrás de HTTPS define `COOKIE_SECURE=true`.

## Calidad

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
pnpm --filter @inventory/api test:e2e     # requiere MySQL (usa la BD inventory_test)
```

## Arquitectura

- **API** (`apps/api`): arquitectura limpia por módulo (`domain` → `application` → `infrastructure`/`presentation`), casos de uso, puertos como clases abstractas, Drizzle ORM, validación con zod, transacciones con `UnitOfWork` y un único punto de cambio de stock (`StockLedger`).
- **Web** (`apps/web`): Angular standalone + signals, Tailwind 4, filtros sincronizados con la URL, sistema de diseño propio en `shared/ui`.
- **Seguridad**: JWT en cookies httpOnly SameSite=Strict, scrypt, roles (`ADMIN` hoy), rate limit en login, Helmet.
- **Trabajo con IA**: `CLAUDE.md` y `.claude/skills` describen convenciones y flujos (módulos, migraciones, UI, pruebas, git).
