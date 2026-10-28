export interface PricingSettings {
  exchangeRate: number;
  igvRate: number;
}

export const DEFAULT_PRICING: PricingSettings = { exchangeRate: 3.6, igvRate: 0.18 };

export interface PriceBreakdown {
  priceUsd: number;
  igvUsd: number;
  priceWithIgvUsd: number;
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

/** `priceUsd` is the sale price in USD without IGV (the base price of the price list). */
export function priceBreakdown(priceUsd: number, settings: PricingSettings): PriceBreakdown {
  const withIgv = priceUsd * (1 + settings.igvRate);
  return {
    priceUsd: round(priceUsd, 4),
    igvUsd: round(priceUsd * settings.igvRate, 4),
    priceWithIgvUsd: round(withIgv, 4),
    priceWithIgvPen: round(withIgv * settings.exchangeRate, 2),
  };
}

export function priceUsdFromPen(penWithIgv: number, settings: PricingSettings): number {
  return round(penWithIgv / settings.exchangeRate / (1 + settings.igvRate), 4);
}

/** Gross margin over the sale price, in percent. Null when price or cost is unknown. */
export function marginPercent(priceUsd: number | null, costUsd: number | null): number | null {
  if (priceUsd == null || costUsd == null || priceUsd <= 0) return null;
  return round(((priceUsd - costUsd) / priceUsd) * 100, 1);
}

export function productPricing(
  product: {
    priceUsd: number | null;
    costUsd: number | null;
    wholesalePriceUsd: number | null;
    wholesaleMinQty: number | null;
  },
  settings: PricingSettings,
): ProductPricing {
  return {
    retail: product.priceUsd == null ? null : priceBreakdown(product.priceUsd, settings),
    wholesale:
      product.wholesalePriceUsd == null
        ? null
        : {
            ...priceBreakdown(product.wholesalePriceUsd, settings),
            minQty: product.wholesaleMinQty,
          },
    marginPercent: marginPercent(product.priceUsd, product.costUsd),
  };
}
