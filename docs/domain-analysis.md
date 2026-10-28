# Análisis del dominio (basado en el Excel de inventario)

Fuente: `INVENTARIO 30.09 - Almacén WY Miner.xlsx` (no se versiona; vive en `data/`, ignorado por git).

## 1. Qué contiene el Excel

| Hoja | Visible | Contenido |
| --- | --- | --- |
| `INVENTARIO 30.09` | Sí | 638 filas: ITEM, #IMP, CÓDIGO, DESCRIPCIÓN, UNIDAD, TOTAL INGRESADO, TOTAL VENDIDO, STOCK TEÓRICO (fórmula), STOCK FÍSICO, DIFERENCIA, OBSERVACIONES |
| `IMPORTACIONES` | No | 1 137 filas: cantidades recibidas por importación (#IMP) |
| `#5` … `#16` | No | Costeo por importación: FOB, desaduanaje, costo de adquisición, GG, utilidad, IGV, percepción, precio unitario en USD y S/ (T.C. 3.8) |

### Hallazgos que condicionan el diseño

- **Todo producto viene de una importación** (#IMP 2 al 16). El negocio compra por lotes importados; hace falta un módulo de importaciones/compras, no solo un listado de productos.
- **70 filas no tienen código**. Son equipos y herramientas (Winche, Minidumper, brocas de marca propia). Se les asigna un código interno `INT-0001…` y se marcan como `isInternalCode`.
- **54 códigos aparecen en más de una fila** (mismo repuesto llegó en distintas importaciones). El importador los consolida en un solo producto y conserva cada fila como línea de importación.
- **Las descripciones no son únicas** ("Conector de transición" ×94, "Conjunto de manguera" ×20): la identidad del producto es el código, no el nombre. La búsqueda debe cubrir código + nombre.
- Los códigos traen espacios y saltos de línea (`20603000\n057`): se normalizan.
- **Solo 36 filas tienen ventas** (columna VENDIDO) y no hay fechas ni cliente. Se migran como una salida histórica por producto.
- **STOCK FÍSICO y DIFERENCIA están vacías**: el conteo físico se hace aparte. Se modela como módulo de conteos (toma de inventario) que genera ajustes.
- **No existe stock mínimo ni ubicación ni precio** en el Excel. Sin stock mínimo no hay alertas: la UI muestra cuántos productos no lo tienen configurado y permite fijarlo en lote.
- Unidades: `Unid.` (75), `pcs` (560), `set` (2).
- OBSERVACIONES guarda referencias cruzadas (`#11 y 15`) a otras importaciones; se conservan como nota del producto.
- Mezcla **equipos** (Winche, Minidumper, Jumbo WD561, vehículo eléctrico) con **repuestos** (sellos, filtros, mangueras, pernos, sensores, partes de motor) y **herramientas**. Los repuestos pertenecen a un equipo (WD561, Minidumper WY800/WY1000, martillo U1528).

## 2. Módulos del sistema

| Módulo | Qué resuelve | Origen en el Excel |
| --- | --- | --- |
| Autenticación y usuarios | Login interno, sesión por cookie httpOnly, rol `ADMIN` hoy; guards listos para más roles | — |
| Dashboard | Qué tengo, cuánto vale, qué se acaba, qué viene en camino, últimos movimientos | Totales de la hoja principal |
| Productos | Listado, filtros, detalle, alta/edición, stock mínimo y cantidad de reposición, ubicación, costo y precio | Hoja principal |
| Categorías | Árbol de clasificación (2 niveles) y auto-clasificación al importar | No existe: se infiere de la descripción |
| Equipos compatibles | Relación repuesto ↔ equipo (WD561, WY800, WY1000, U1528…) | Texto de la descripción |
| Proveedores | Proveedor de cada importación | — |
| Importaciones (compras) | Orden → en tránsito → recibida; recepción suma stock y registra costo | `#IMP`, hoja IMPORTACIONES |
| Movimientos de stock | Libro mayor: entradas, salidas (venta, merma, uso interno), ajustes | TOTAL INGRESADO / VENDIDO |
| Conteos físicos | Toma de inventario por categoría, diferencia vs. teórico, ajuste automático | STOCK FÍSICO / DIFERENCIA |
| Reposición | Qué pedir, cuánto y por qué (stock + en camino ≤ mínimo); exporta a Excel | Requisito del negocio |
| Reportes / exportación | Excel de productos filtrados, movimientos y reposición | — |

## 3. Filtros por pantalla

**Productos**: búsqueda libre (código/nombre), categoría (incluye subcategorías), unidad, estado de stock (`Sin stock`, `Bajo`, `OK`, `Sin mínimo configurado`), importación (#IMP), equipo compatible, activo/inactivo, tipo de código (interno/proveedor), orden (código, nombre, stock, actualización) y paginación.

**Movimientos**: producto, tipo (entrada/salida/ajuste), motivo, rango de fechas, usuario, búsqueda.

**Importaciones**: estado, proveedor, rango de fechas, búsqueda por número/producto.

**Conteos**: estado, categoría; dentro de un conteo: solo con diferencias, pendientes de contar.

**Reposición**: categoría, equipo, búsqueda; solo críticos (sin stock).

## 4. Reglas de negocio

1. `stock` nunca es negativo. Una salida mayor al stock se rechaza (`INSUFFICIENT_STOCK`).
2. `stock` se modifica solo mediante movimientos (libro mayor). Cada movimiento guarda `stockAfter`.
3. Estado de stock: `OUT` si stock = 0; `LOW` si `minStock > 0` y `stock ≤ minStock`; `OK` en otro caso.
4. Reposición sugerida: `disponible = stock + enCamino`. Si `minStock > 0` y `disponible ≤ minStock`, sugerir `max(minStock × 2 − disponible, reorderQuantity)`.
5. Importación: `DRAFT → ORDERED → IN_TRANSIT → RECEIVED`; `CANCELLED` desde cualquier estado previo a `RECEIVED`. Solo se edita antes de `RECEIVED`. Recibir genera movimientos `IN / IMPORT_RECEIPT` y actualiza el costo del producto.
6. Conteo físico: al crearse congela el stock teórico por producto. Al completarse, cada diferencia genera un movimiento `ADJUSTMENT / COUNT_ADJUSTMENT`. Un conteo completado no se edita.
7. Un producto con movimientos no se elimina; se desactiva.
8. Códigos de producto únicos (sin distinguir mayúsculas).

## 5. Fuera de alcance (por ahora)

- Costeo detallado (GG, utilidad, IGV, percepción) de las hojas `#N`: se conserva solo el costo unitario final por producto.
- Ventas/facturación y clientes: las salidas por venta se registran como movimientos con un campo de contraparte libre.
- Multi-almacén, lotes/series y códigos de barras.
- Roles distintos de `ADMIN` (la infraestructura de roles está lista).
