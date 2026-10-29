import type { SpreadsheetCell } from '../../../shared/application/spreadsheet-reader.js';
import type { UnitOfMeasure } from '../../products/domain/product.js';

/** Lowercase, no accents, only letters and digits. Used to match headers and list values. */
export const matchKey = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

export function cellText(cell: SpreadsheetCell | undefined): string | null {
  if (cell === null || cell === undefined) return null;
  if (cell instanceof Date) return null;
  const text = String(cell).replace(/\s+/g, ' ').trim();
  return text === '' ? null : text;
}

export type ParsedNumber = { ok: true; value: number } | { ok: false };

/** Accepts numbers and text such as "1,5", "S/ 12.50" or "1,234.50". */
export function parseNumber(cell: SpreadsheetCell): ParsedNumber {
  if (typeof cell === 'number')
    return Number.isFinite(cell) ? { ok: true, value: cell } : { ok: false };
  const text = cellText(cell);
  if (text === null) return { ok: false };

  let clean = text.replace(/^s\/\.?\s*/i, '').replace(/\s/g, '');
  if (clean.includes(',') && clean.includes('.')) clean = clean.replace(/,/g, '');
  else if (clean.includes(',')) clean = clean.replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(clean)) return { ok: false };
  return { ok: true, value: Number(clean) };
}

const TRUE_WORDS = new Set(['si', 's', 'x', '1', 'true', 'yes', 'y', 'verdadero']);
const FALSE_WORDS = new Set(['no', 'n', '0', 'false', 'falso']);

export function parseYesNo(cell: SpreadsheetCell): boolean | null {
  if (typeof cell === 'boolean') return cell;
  const text = cellText(cell);
  if (text === null) return null;
  const key = matchKey(text);
  if (TRUE_WORDS.has(key)) return true;
  if (FALSE_WORDS.has(key)) return false;
  return null;
}

const UNIT_WORDS: Record<string, UnitOfMeasure> = {
  unit: 'UNIT',
  unid: 'UNIT',
  unidad: 'UNIT',
  unidades: 'UNIT',
  und: 'UNIT',
  pcs: 'PCS',
  pc: 'PCS',
  pza: 'PCS',
  pzas: 'PCS',
  pieza: 'PCS',
  piezas: 'PCS',
  set: 'SET',
  juego: 'SET',
  kit: 'SET',
};

export const parseUnit = (text: string): UnitOfMeasure | null => UNIT_WORDS[matchKey(text)] ?? null;

export const roundTo = (value: number, decimals: number): number => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

export function isBlankRow(values: readonly SpreadsheetCell[]): boolean {
  return values.every(
    (value) => value === null || (typeof value === 'string' && value.trim() === ''),
  );
}
