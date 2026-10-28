import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import type { PricingSettings } from '../../shared/models/models';

export interface PricingSettingsInput {
  exchangeRate?: number;
  igvRate?: number;
}

@Injectable({ providedIn: 'root' })
export class SettingsApi {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/settings/pricing';

  getPricing(): Observable<PricingSettings> {
    return this.http.get<PricingSettings>(this.base);
  }

  updatePricing(input: PricingSettingsInput): Observable<PricingSettings> {
    return this.http.put<PricingSettings>(this.base, input);
  }
}
