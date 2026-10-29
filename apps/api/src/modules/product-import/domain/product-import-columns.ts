import type { UnitOfMeasure } from '../../products/domain/product.js';

/**
 * The template is used by Spanish-speaking staff, so headers and row messages are in Spanish.
 * Keys stay in English like the rest of the code base.
 */
export type ImportColumnKey =
  | 'code'
  | 'name'
  | 'specification'
  | 'category'
  | 'costCenter'
  | 'unit'
  | 'initialStock'
  | 'minStock'
  | 'reorderQuantity'
  | 'location'
  | 'costPen'
  | 'priceWithIgvPen'
  | 'wholesaleWithIgvPen'
  | 'wholesaleMinQty'
  | 'consignment'
  | 'equipment'
  | 'notes';

export interface ImportColumn {
  key: ImportColumnKey;
  header: string;
  width: number;
  required: 'always' | 'new' | 'no';
  /** Short help shown as a note on the header and in the instructions sheet. */
  help: string;
  example: string;
}

export const IMPORT_COLUMNS: readonly ImportColumn[] = [
  {
    key: 'code',
    header: 'Código',
    width: 18,
    required: 'no',
    help: 'Si el código ya existe se ACTUALIZA ese producto; si no existe o lo dejas vacío se CREA uno nuevo (con código interno INT-0001 si va vacío).',
    example: 'BRO-T38-45',
  },
  {
    key: 'name',
    header: 'Descripción',
    width: 44,
    required: 'new',
    help: 'Nombre del producto. Obligatorio para productos nuevos. Máximo 255 caracteres.',
    example: 'Broca de botones T38 45 mm',
  },
  {
    key: 'specification',
    header: 'Especificación',
    width: 28,
    required: 'no',
    help: 'Medida o norma, por ejemplo "32 mm x 90 cm". Máximo 500 caracteres.',
    example: '45 mm, rosca T38',
  },
  {
    key: 'category',
    header: 'Categoría',
    width: 30,
    required: 'no',
    help: 'Elige de la lista. También se acepta el nombre sin el grupo (por ejemplo "Brocas").',
    example: 'Perforación > Brocas',
  },
  {
    key: 'costCenter',
    header: 'Centro de costo',
    width: 22,
    required: 'no',
    help: 'Elige de la lista. Debe existir en el sistema.',
    example: 'Repuesto Jumbo',
  },
  {
    key: 'unit',
    header: 'Unidad',
    width: 12,
    required: 'no',
    help: 'Unid., Pzas. o Set. Si lo dejas vacío en un producto nuevo se usa Pzas.',
    example: 'Pzas.',
  },
  {
    key: 'initialStock',
    header: 'Stock inicial',
    width: 14,
    required: 'no',
    help: 'Solo para productos NUEVOS: genera un movimiento de carga inicial. En productos existentes se ignora (usa Registrar movimiento o un conteo).',
    example: '24',
  },
  {
    key: 'minStock',
    header: 'Stock mínimo',
    width: 14,
    required: 'no',
    help: 'Cantidad por debajo de la cual se avisa la reposición. Número entero.',
    example: '10',
  },
  {
    key: 'reorderQuantity',
    header: 'Cantidad de reposición',
    width: 18,
    required: 'no',
    help: 'Cantidad mínima a pedir cuando hay que reponer. Número entero.',
    example: '20',
  },
  {
    key: 'location',
    header: 'Ubicación',
    width: 16,
    required: 'no',
    help: 'Ubicación en almacén. Máximo 60 caracteres.',
    example: 'A-03',
  },
  {
    key: 'costPen',
    header: 'Costo S/ (sin IGV)',
    width: 18,
    required: 'no',
    help: 'Costo unitario en soles, SIN IGV.',
    example: '18.50',
  },
  {
    key: 'priceWithIgvPen',
    header: 'Precio venta S/ (con IGV)',
    width: 22,
    required: 'no',
    help: 'Precio de venta en soles CON IGV. El sistema guarda el precio sin IGV y calcula el IGV con el porcentaje de Configuración.',
    example: '65.00',
  },
  {
    key: 'wholesaleWithIgvPen',
    header: 'Precio por mayor S/ (con IGV)',
    width: 26,
    required: 'no',
    help: 'Precio por mayor en soles CON IGV. Requiere la cantidad mínima por mayor.',
    example: '58.00',
  },
  {
    key: 'wholesaleMinQty',
    header: 'Cantidad mínima por mayor',
    width: 22,
    required: 'no',
    help: 'Desde cuántas unidades aplica el precio por mayor. Número entero mayor que 0.',
    example: '24',
  },
  {
    key: 'consignment',
    header: 'Consignación',
    width: 14,
    required: 'no',
    help: 'Sí o No.',
    example: 'No',
  },
  {
    key: 'equipment',
    header: 'Equipos compatibles',
    width: 34,
    required: 'no',
    help: 'Nombres de equipos separados por punto y coma (;). Deben existir en el sistema. En un producto existente REEMPLAZA los equipos actuales.',
    example: 'Jumbo DK0138; Martillo perforador U1528',
  },
  {
    key: 'notes',
    header: 'Notas',
    width: 30,
    required: 'no',
    help: 'Observaciones libres. Máximo 4000 caracteres.',
    example: '',
  },
];

export const COLUMN_BY_KEY: ReadonlyMap<ImportColumnKey, ImportColumn> = new Map(
  IMPORT_COLUMNS.map((column) => [column.key, column]),
);

/** Columns that must be present in the file even if some rows leave them empty. */
export const REQUIRED_HEADER_KEYS: readonly ImportColumnKey[] = ['code', 'name'];

export const UNIT_TEMPLATE_LABELS: Record<UnitOfMeasure, string> = {
  UNIT: 'Unid.',
  PCS: 'Pzas.',
  SET: 'Set',
};
