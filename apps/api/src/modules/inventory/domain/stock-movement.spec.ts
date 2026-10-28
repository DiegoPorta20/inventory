import { describe, expect, it } from 'vitest';
import { assertManualReason, signedDelta } from './stock-movement.js';

describe('signedDelta', () => {
  it('stores entries as positive and exits as negative', () => {
    expect(signedDelta('IN', 4)).toBe(4);
    expect(signedDelta('OUT', 4)).toBe(-4);
  });

  it('keeps the sign of adjustments', () => {
    expect(signedDelta('ADJUSTMENT', -3)).toBe(-3);
  });

  it('rejects zero, fractional and negative entry/exit quantities', () => {
    expect(() => signedDelta('IN', 0)).toThrow();
    expect(() => signedDelta('IN', 1.5)).toThrow();
    expect(() => signedDelta('OUT', -2)).toThrow();
  });
});

describe('assertManualReason', () => {
  it('accepts reasons valid for the movement type', () => {
    expect(() => assertManualReason('OUT', 'SALE')).not.toThrow();
  });

  it('keeps system reasons out of manual movements', () => {
    expect(() => assertManualReason('IN', 'IMPORT_RECEIPT')).toThrow();
    expect(() => assertManualReason('ADJUSTMENT', 'COUNT_ADJUSTMENT')).toThrow();
    expect(() => assertManualReason('IN', 'SALE')).toThrow();
  });
});
