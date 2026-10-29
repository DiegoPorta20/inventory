import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PRICING,
  marginPercent,
  priceBreakdown,
  pricePenFromWithIgv,
  productPricing,
} from './pricing.js';

describe('pricing', () => {
  it('adds IGV to the base price in soles', () => {
    const price = priceBreakdown(296.6102, DEFAULT_PRICING);
    expect(price.pricePen).toBe(296.6102);
    expect(price.igvPen).toBeCloseTo(53.3898, 3);
    expect(price.priceWithIgvPen).toBe(350);
  });

  it('derives the base price from a sol price with IGV', () => {
    expect(pricePenFromWithIgv(350, DEFAULT_PRICING)).toBeCloseTo(296.6102, 3);
  });

  it('computes margin over the sale price and ignores unknown values', () => {
    expect(marginPercent(100, 60)).toBe(40);
    expect(marginPercent(null, 60)).toBeNull();
    expect(marginPercent(100, null)).toBeNull();
    expect(marginPercent(0, 10)).toBeNull();
  });

  it('builds retail and wholesale breakdowns', () => {
    const pricing = productPricing(
      { pricePen: 296.6102, costPen: null, wholesalePricePen: 254.2373, wholesaleMinQty: 24 },
      DEFAULT_PRICING,
    );
    expect(pricing.retail?.priceWithIgvPen).toBe(350);
    expect(pricing.wholesale?.priceWithIgvPen).toBe(300);
    expect(pricing.wholesale?.minQty).toBe(24);
    expect(pricing.marginPercent).toBeNull();
  });
});
