import ExcelJS from 'exceljs';

export interface PriceRow {
  rowNumber: number;
  section: string;
  description: string;
  code: string | null;
  specification: string | null;
  costCenter: string | null;
  unit: string | null;
  totalQuantity: number | null;
  consumedQuantity: number | null;
  stock: number | null;
  priceUsd: number | null;
  priceWithIgvPen: number | null;
  wholesaleUsdWithIgv: number | null;
  wholesaleMinQty: number | null;
}

export interface PriceSheet {
  exchangeRate: number | null;
  rows: PriceRow[];
}

const HEADER_SCAN_ROWS = 10;
const SECTION_HINT = /jumbo|consignaci|yuchai|minidumper|barrenos/i;

const key = (value: ExcelJS.CellValue): string =>
  String(cellText(value) ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '');

export function cellText(value: ExcelJS.CellValue): string | null {
  if (value == null) return null;
  if (typeof value === 'object') {
    if ('richText' in value) return value.richText.map((part) => part.text).join('');
    if ('result' in value) return value.result == null ? null : String(value.result);
    if ('text' in value) return String(value.text);
    return null;
  }
  return String(value);
}

function cellNumber(value: ExcelJS.CellValue): number | null {
  const result =
    typeof value === 'object' && value !== null && 'result' in value ? value.result : value;
  const parsed = typeof result === 'number' ? result : Number(result);
  return result == null || result === '' || !Number.isFinite(parsed) ? null : parsed;
}

const clean = (value: string | null): string | null => {
  const text = (value ?? '').replace(/\s+/g, ' ').trim();
  return text === '' ? null : text;
};

export async function readPriceSheet(filePath: string): Promise<PriceSheet> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheet = workbook.getWorksheet('APU') ?? workbook.worksheets[0];
  if (!sheet) throw new Error('The workbook has no sheets');

  const columns = locateColumns(sheet);
  const rows: PriceRow[] = [];
  let section = '';

  for (let rowNumber = columns.headerRow + 2; rowNumber <= sheet.rowCount; rowNumber++) {
    const row = sheet.getRow(rowNumber);
    const get = (column: number) => row.getCell(column).value;
    const description = clean(cellText(get(columns.description)));
    if (!description) continue;

    const code = clean(cellText(get(columns.code)));
    const totalQuantity = cellNumber(get(columns.total));
    const priceUsd = cellNumber(get(columns.price));
    const hasData = totalQuantity !== null || priceUsd !== null || code !== null;

    if (!hasData) {
      if (SECTION_HINT.test(description)) section = description;
      continue;
    }

    rows.push({
      rowNumber,
      section,
      description,
      code,
      specification: clean(cellText(get(columns.specification))),
      costCenter: clean(cellText(get(columns.costCenter))),
      unit: clean(cellText(get(columns.unit))),
      totalQuantity,
      consumedQuantity: cellNumber(get(columns.consumed)),
      stock: cellNumber(get(columns.stock)),
      priceUsd: priceUsd !== null && priceUsd > 0 ? priceUsd : null,
      priceWithIgvPen: cellNumber(get(columns.pricePen)),
      wholesaleUsdWithIgv: cellNumber(get(columns.wholesaleUsd)),
      wholesaleMinQty: cellNumber(get(columns.wholesaleQty)),
    });
  }

  return {
    exchangeRate: cellNumber(sheet.getRow(columns.headerRow + 1).getCell(columns.pricePen).value),
    rows,
  };
}

function locateColumns(sheet: ExcelJS.Worksheet) {
  for (let headerRow = 1; headerRow <= HEADER_SCAN_ROWS; headerRow++) {
    const headers = new Map<string, number>();
    sheet.getRow(headerRow).eachCell((cell, column) => headers.set(key(cell.value), column));
    if (!headers.has('descripcion')) continue;

    const find = (predicate: (header: string) => boolean): number => {
      const match = [...headers.entries()].find(([header]) => predicate(header));
      if (!match) throw new Error(`Price sheet column not found (header row ${headerRow})`);
      return match[1];
    };
    return {
      headerRow,
      description: find((h) => h === 'descripcion'),
      code: find((h) => h === 'codigo'),
      specification: find((h) => h.startsWith('especificacion')),
      costCenter: find((h) => h.startsWith('centrodecosto')),
      unit: find((h) => h.startsWith('unid')),
      total: find((h) => h.startsWith('cant.total')),
      consumed: find((h) => h.startsWith('consumo')),
      stock: find((h) => h === 'stock'),
      price: find((h) => h.startsWith('preciosinigv')),
      pricePen: find((h) => h.startsWith('p.ucon')),
      wholesaleUsd: find((h) => h.startsWith('preciousdxunidad')),
      wholesaleQty: find((h) => h.startsWith('cantidadpormes')),
    };
  }
  throw new Error('Header row with "DESCRIPCION" not found');
}
