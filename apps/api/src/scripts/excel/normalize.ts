import type { UnitOfMeasure } from '../../modules/products/domain/product.js';

export function normalizeCode(raw: unknown): string | null {
  const code = String(raw ?? '')
    .replace(/\s+/g, '')
    .toUpperCase();
  return code === '' ? null : code;
}

function sentenceCase(text: string): string {
  const lower = text.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export function normalizeDescription(raw: unknown): string {
  const text = String(raw ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  const letters = text.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, '');
  const isAllCaps = letters.length > 3 && letters === letters.toUpperCase();
  return isAllCaps ? sentenceCase(text) : text;
}

export function normalizeUnit(raw: unknown): UnitOfMeasure {
  const unit = String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/\./g, '');
  if (unit === 'pcs' || unit === 'pc') return 'PCS';
  if (unit === 'set') return 'SET';
  return 'UNIT';
}
