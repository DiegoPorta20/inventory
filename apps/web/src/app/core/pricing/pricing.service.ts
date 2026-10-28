import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import type { PriceBreakdown, PricingSettings } from '../../shared/models/models';

const DEFAULTS: PricingSettings = { exchangeRate: 3.6, igvRate: 0.18 };

const round = (value: number, decimals: number): number => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

/** Exchange rate and IGV used to price products; mirrors the API's pricing rules. */
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

  breakdown(priceUsd: number): PriceBreakdown {
    const { igvRate, exchangeRate } = this.settings();
    const withIgv = priceUsd * (1 + igvRate);
    return {
      priceUsd: round(priceUsd, 4),
      igvUsd: round(priceUsd * igvRate, 4),
      priceWithIgvUsd: round(withIgv, 4),
      priceWithIgvPen: round(withIgv * exchangeRate, 2),
    };
  }

  /** Converts a sol price with IGV into the USD price without IGV that is stored. */
  usdFromPen(penWithIgv: number): number {
    const { igvRate, exchangeRate } = this.settings();
    return round(penWithIgv / exchangeRate / (1 + igvRate), 4);
  }
}
