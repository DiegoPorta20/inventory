export interface PricingSettings {
  igvRate: number;
}

export const DEFAULT_PRICING: PricingSettings = { igvRate: 0.18 };

/** All amounts are in soles (PEN). */
export interface PriceBreakdown {
  /** Price without IGV (the stored base price). */
  pricePen: number;
  igvPen: number;
  priceWithIgvPen: number;
}

export interface ProductPricing {
  retail: PriceBreakdown | null;
  wholesale: (PriceBreakdown & { minQty: number | null }) | null;
  marginPercent: number | null;
}

const round = (value: number, decimals: number): number => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

/** `pricePen` is the sale price in soles without IGV (the base price of the price list). */
export function priceBreakdown(pricePen: number, settings: PricingSettings): PriceBreakdown {
  return {
    pricePen: round(pricePen, 4),
    igvPen: round(pricePen * settings.igvRate, 4),
    priceWithIgvPen: round(pricePen * (1 + settings.igvRate), 2),
  };
}

/** Base price (without IGV) from a price that already includes IGV. */
export function pricePenFromWithIgv(priceWithIgvPen: number, settings: PricingSettings): number {
  return round(priceWithIgvPen / (1 + settings.igvRate), 4);
}

/** Gross margin over the sale price, in percent. Null when price or cost is unknown. */
export function marginPercent(pricePen: number | null, costPen: number | null): number | null {
  if (pricePen == null || costPen == null || pricePen <= 0) return null;
  return round(((pricePen - costPen) / pricePen) * 100, 1);
}

export function productPricing(
  product: {
    pricePen: number | null;
    costPen: number | null;
    wholesalePricePen: number | null;
    wholesaleMinQty: number | null;
  },
  settings: PricingSettings,
): ProductPricing {
  return {
    retail: product.pricePen == null ? null : priceBreakdown(product.pricePen, settings),
    wholesale:
      product.wholesalePricePen == null
        ? null
        : {
            ...priceBreakdown(product.wholesalePricePen, settings),
            minQty: product.wholesaleMinQty,
          },
    marginPercent: marginPercent(product.pricePen, product.costPen),
  };
}
