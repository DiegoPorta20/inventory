import { describe, expect, it } from 'vitest';
import { formatDate, formatPen, formatQuantity } from './format.pipes';

describe('format helpers', () => {
  it('formats quantities with thousands separators and a placeholder for null', () => {
    expect(formatQuantity(1234)).toMatch(/^1[,\s.]?234$/);
    expect(formatQuantity(null)).toBe('—');
  });

  it('formats soles with two decimals by default and four when precise', () => {
    expect(formatPen(12.5)).toBe('S/ 12.50');
    expect(formatPen(0.12345, true)).toBe('S/ 0.1235');
    expect(formatPen(undefined)).toBe('—');
  });

  it('formats date-only strings without shifting the day', () => {
    expect(formatDate('2026-09-30')).toContain('30');
  });
});
