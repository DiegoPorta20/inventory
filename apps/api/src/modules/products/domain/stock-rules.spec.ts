import { describe, expect, it } from 'vitest';
import {
  InsufficientStockError,
  needsReorder,
  stockAfter,
  suggestedReorderQuantity,
} from './stock-rules.js';
import { formatInternalCode, normalizeProductCode, stockStatusOf } from './product.js';

describe('stockStatusOf', () => {
  it('is OUT when there is no stock', () => {
    expect(stockStatusOf(0, 5)).toBe('OUT');
  });

  it('is LOW at or below a configured minimum', () => {
    expect(stockStatusOf(5, 5)).toBe('LOW');
    expect(stockStatusOf(3, 5)).toBe('LOW');
  });

  it('is OK above the minimum or when no minimum is configured', () => {
    expect(stockStatusOf(6, 5)).toBe('OK');
    expect(stockStatusOf(1, 0)).toBe('OK');
  });
});

describe('stockAfter', () => {
  it('applies positive and negative deltas', () => {
    expect(stockAfter({ stock: 10 }, 5)).toBe(15);
    expect(stockAfter({ stock: 10 }, -10)).toBe(0);
  });

  it('rejects movements that would make stock negative', () => {
    expect(() => stockAfter({ stock: 3 }, -4)).toThrow(InsufficientStockError);
  });
});

describe('suggestedReorderQuantity', () => {
  const base = { stock: 2, incomingQty: 0, minStock: 10, reorderQuantity: 0 };

  it('restores twice the minimum', () => {
    expect(suggestedReorderQuantity(base)).toBe(18);
  });

  it('never goes below the configured reorder quantity', () => {
    expect(suggestedReorderQuantity({ ...base, reorderQuantity: 50 })).toBe(50);
  });

  it('counts incoming units as available', () => {
    expect(suggestedReorderQuantity({ ...base, incomingQty: 20 })).toBe(0);
    expect(needsReorder({ ...base, incomingQty: 20 })).toBe(false);
  });

  it('ignores products without a minimum', () => {
    expect(suggestedReorderQuantity({ ...base, minStock: 0 })).toBe(0);
  });
});

describe('product codes', () => {
  it('normalizes whitespace and case', () => {
    expect(normalizeProductCode(' 2060 3000\n057 ')).toBe('20603000057');
    expect(normalizeProductCode('z04600000041')).toBe('Z04600000041');
  });

  it('formats internal codes', () => {
    expect(formatInternalCode(7)).toBe('INT-0007');
  });
});
