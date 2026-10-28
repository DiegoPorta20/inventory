import ExcelJS from 'exceljs';

export interface RawRow {
  rowNumber: number;
  importNumber: number | null;
  code: unknown;
  description: unknown;
  unit: unknown;
  received: number;
  sold: number;
  notes: string | null;
}

const SHEET_NAME_PREFIX = 'inventario';
const HEADER_SCAN_ROWS = 15;

const clean = (value: ExcelJS.CellValue): string =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

function cellValue(cell: ExcelJS.Cell): unknown {
  const value = cell.value;
  if (value && typeof value === 'object') {
    if ('result' in value) return value.result;
    if ('richText' in value) return value.richText.map((part) => part.text).join('');
    if ('text' in value) return value.text;
  }
  return value;
}

const toNumber = (value: unknown): number => {
  const parsed = typeof value === 'number' ? value : Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
};

export async function readInventorySheet(filePath: string): Promise<RawRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const sheet =
    workbook.worksheets.find((candidate) => clean(candidate.name).startsWith(SHEET_NAME_PREFIX)) ??
    workbook.worksheets[0];
  if (!sheet) throw new Error('The workbook has no sheets');

  const columns = locateColumns(sheet);
  const rows: RawRow[] = [];
  for (let rowNumber = columns.headerRow + 1; rowNumber <= sheet.rowCount; rowNumber++) {
    const row = sheet.getRow(rowNumber);
    const item = cellValue(row.getCell(columns.item));
    const description = cellValue(row.getCell(columns.description));
    if (item == null || item === '' || description == null || String(description).trim() === '')
      continue;

    const importNumber = toNumber(cellValue(row.getCell(columns.importNumber)));
    const notes = String(cellValue(row.getCell(columns.notes)) ?? '').trim();
    rows.push({
      rowNumber,
      importNumber: importNumber > 0 ? importNumber : null,
      code: cellValue(row.getCell(columns.code)),
      description,
      unit: cellValue(row.getCell(columns.unit)),
      received: toNumber(cellValue(row.getCell(columns.received))),
      sold: toNumber(cellValue(row.getCell(columns.sold))),
      notes: notes === '' ? null : notes,
    });
  }
  return rows;
}

function locateColumns(sheet: ExcelJS.Worksheet) {
  for (let rowNumber = 1; rowNumber <= HEADER_SCAN_ROWS; rowNumber++) {
    const headers = new Map<string, number>();
    sheet
      .getRow(rowNumber)
      .eachCell((cell, column) => headers.set(clean(cell.value).replace(/\s+/g, ''), column));
    if (!headers.has('item')) continue;

    const find = (predicate: (header: string) => boolean): number => {
      const match = [...headers.entries()].find(([header]) => predicate(header));
      if (!match) throw new Error(`Column not found in header row ${rowNumber}`);
      return match[1];
    };
    return {
      headerRow: rowNumber,
      item: find((h) => h === 'item'),
      importNumber: find((h) => h.startsWith('#imp')),
      code: find((h) => h === 'codigo'),
      description: find((h) => h === 'descripcion'),
      unit: find((h) => h.startsWith('unidad')),
      received: find((h) => h.startsWith('totalingresado')),
      sold: find((h) => h.startsWith('totalvendido')),
      notes: find((h) => h.startsWith('observaciones')),
    };
  }
  throw new Error('Header row with "ITEM" not found');
}
