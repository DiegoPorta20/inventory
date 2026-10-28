import { describe, expect, it } from 'vitest';
import { formatDate, formatQuantity, formatUsd } from './format.pipes';

describe('format helpers', () => {
  it('formats quantities with thousands separators and a placeholder for null', () => {
    expect(formatQuantity(1234)).toMatch(/^1[,\s.]?234$/);
    expect(formatQuantity(null)).toBe('—');
  });

  it('formats USD with two decimals by default and four when precise', () => {
    expect(formatUsd(12.5)).toContain('12.50');
    expect(formatUsd(0.12345, true)).toContain('0.1235');
    expect(formatUsd(undefined)).toBe('—');
  });

  it('formats date-only strings without shifting the day', () => {
    expect(formatDate('2026-09-30')).toContain('30');
  });
});
