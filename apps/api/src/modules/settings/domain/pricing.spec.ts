import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PRICING,
  marginPercent,
  priceBreakdown,
  priceUsdFromPen,
  productPricing,
} from './pricing.js';

describe('pricing', () => {
  it('adds IGV and converts to soles using the exchange rate', () => {
    const price = priceBreakdown(82.3917, DEFAULT_PRICING);
    expect(price.igvUsd).toBeCloseTo(14.8305, 3);
    expect(price.priceWithIgvUsd).toBeCloseTo(97.2222, 3);
    expect(price.priceWithIgvPen).toBe(350);
  });

  it('derives the base USD price from a sol price with IGV', () => {
    expect(priceUsdFromPen(350, DEFAULT_PRICING)).toBeCloseTo(82.3917, 3);
  });

  it('computes margin over the sale price and ignores unknown values', () => {
    expect(marginPercent(100, 60)).toBe(40);
    expect(marginPercent(null, 60)).toBeNull();
    expect(marginPercent(100, null)).toBeNull();
    expect(marginPercent(0, 10)).toBeNull();
  });

  it('builds retail and wholesale breakdowns', () => {
    const pricing = productPricing(
      { priceUsd: 82.3917, costUsd: null, wholesalePriceUsd: 70.6214, wholesaleMinQty: 24 },
      DEFAULT_PRICING,
    );
    expect(pricing.retail?.priceWithIgvPen).toBe(350);
    expect(pricing.wholesale?.priceWithIgvPen).toBe(300);
    expect(pricing.wholesale?.minQty).toBe(24);
    expect(pricing.marginPercent).toBeNull();
  });
});
