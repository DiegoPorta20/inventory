import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import type { PriceBreakdown, PricingSettings } from '../../shared/models/models';

const DEFAULTS: PricingSettings = { igvRate: 0.18 };

const round = (value: number, decimals: number): number => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

/** IGV used to price products (all amounts are soles); mirrors the API's pricing rules. */
@Injectable({ providedIn: 'root' })
export class PricingService {
  private readonly http = inject(HttpClient);

  private readonly resource = rxResource<PricingSettings, void>({
    stream: () => this.http.get<PricingSettings>('/api/settings/pricing'),
  });

  readonly settings = computed(() => (this.resource.hasValue() ? this.resource.value() : DEFAULTS));

  reload(): void {
    this.resource.reload();
  }

  /** `pricePen` is the base price in soles without IGV (the stored value). */
  breakdown(pricePen: number): PriceBreakdown {
    const { igvRate } = this.settings();
    return {
      pricePen: round(pricePen, 4),
      igvPen: round(pricePen * igvRate, 4),
      priceWithIgvPen: round(pricePen * (1 + igvRate), 2),
    };
  }

  /** Converts a price with IGV into the base price without IGV that is stored. */
  priceFromWithIgv(priceWithIgvPen: number): number {
    return round(priceWithIgvPen / (1 + this.settings().igvRate), 4);
  }
}
