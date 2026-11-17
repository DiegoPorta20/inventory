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
| Reportes / exportación | Excel de productos filtrados, movimientos, reposición y **lista de precios** | — |
| Precios y centros de costo | Precio de venta (USD sin IGV → IGV → S/), precio por mayor, margen, consignación, línea de negocio; tipo de cambio e IGV configurables | Lista de precios (segundo Excel, sección 5) |

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

## 5. Segundo Excel: lista de precios de venta (`Precios de Venta de Repuestos y equipos menores-2026.xlsx`)

Una sola hoja visible (`APU`, 582 filas de producto, 5 secciones: Minidumper, Barrenos y brocas de botones, Jumbo, Repuestos a consignación Jumbo DK0138, Repuestos de motor Yuchai Jumbo DK0138).

| Columna | Qué es | Dónde queda en el sistema |
| --- | --- | --- |
| Descripción / Código | Misma identidad que el inventario (566 de 582 filas coinciden por código o nombre; hay códigos con errores de tipeo: `2O311…` con letra O, `20306D00354`) | `products` (se actualiza, no se duplica) |
| Especificación | Medida o norma ("32mm x 90 cm", "Capacidad 1 TN"); algunas celdas traen texto chino que se descarta | `products.specification` |
| Centro de costo | Línea de negocio: Minidumper, Repuesto Minidumper, Aceros SDS Max, Barrenos cónicos, Brocas de botones, Repuesto Jumbo | tabla `cost_centers`, `products.cost_center_id` |
| Precio sin IGV $/unid | **Precio de venta base** (valor fijo, no fórmula). La hoja original está en USD; al cargarla se convierte a soles con el tipo de cambio de la propia hoja | `products.price_pen` (soles, sin IGV) |
| IGV / Precio con IGV / P.U. con IGV S/ | Derivados: IGV 18 % sobre el precio sin IGV | se calculan (`settings`: `pricing.igvRate`) |
| Descuento / Por mayor / Cantidad por mes (4 filas de aceros SDS Max) | Precio por mayor en S/ (ej. 350 → 300) desde 24 unidades | `wholesale_price_pen` (sin IGV), `wholesale_min_qty` |
| Sección "Consignación" | Repuestos recibidos en consignación | `products.is_consignment` (solo si el código aparece únicamente en esa sección) |
| Cant. total / Consumo / Stock (20-04-2026) | Foto de stock anterior al inventario del 30-09 | **No se importa** (el inventario del 30-09 manda) |

Hallazgos y decisiones:

- 387 de los 581 productos del inventario tienen fila de precio; 361 con precio. Faltan precios de equipos (Winche, Ventiladores, Minidumper, Jumbo) y de buena parte de la tornillería.
- 39 códigos aparecen con precios distintos (lotes con distinto costo de importación). Se usa el **promedio ponderado por cantidad** como precio único del producto.
- Los precios comerciales se fijan en soles con IGV (350, 270, 390, 290). Se guarda el precio **sin IGV** en soles y se muestran ambos, siempre rotulados "sin IGV" / "con IGV". El sistema ya no maneja dólares ni tipo de cambio.
- El Jumbo aparece como **DK0138** (lista de precios) y **WD561** (inventario): se asumen el mismo equipo y se unifican en el modelo "Jumbo DK0138". Los repuestos de las secciones Jumbo/Consignación/Yuchai se vinculan a él; los del motor Yuchai también a "Motor Yuchai".
- El costo de adquisición por unidad existe en las hojas ocultas `#N` del primer Excel; todavía no se importa, por eso el margen solo se muestra cuando hay costo.

### Reglas de precio

1. `price_pen` = precio de venta en soles **sin IGV**. `IGV = price × igvRate`; `S/ con IGV = price × (1 + igvRate)`.
2. El IGV se configura en *Configuración* (por defecto 18 %); al cambiarlo se recalculan todos los precios con IGV.
3. Margen = `(precio − costo) / precio`, solo si hay costo y precio.
4. El precio por mayor aplica desde `wholesale_min_qty` unidades.
5. Una venta (`OUT / SALE`) propone como precio unitario el precio de venta del producto.
6. La *Lista de precios* exportable incluye solo productos activos con precio.

## 6. Fuera de alcance (por ahora)

- Costeo detallado (GG, utilidad, IGV, percepción) de las hojas `#N`: se conserva solo el costo unitario final por producto (pendiente de importar).
- Ventas/facturación y clientes: las salidas por venta se registran como movimientos con un campo de contraparte libre.
- Multi-almacén, lotes/series y códigos de barras.
- Roles distintos de `ADMIN` (la infraestructura de roles está lista).
