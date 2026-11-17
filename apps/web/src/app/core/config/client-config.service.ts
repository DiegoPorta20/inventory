import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { BrandingService } from './branding.service';
import type { ClientConfig, PublicBranding } from './client-config.models';

const COMPANY_KEY = 'inventory.company';

/** The signed-in user's view of the company: branding, usable modules and permissions. */
@Injectable({ providedIn: 'root' })
export class ClientConfigService {
  private readonly http = inject(HttpClient);
  private readonly branding = inject(BrandingService);

  private readonly _config = signal<ClientConfig | null>(null);
  readonly config = this._config.asReadonly();

  readonly appName = computed(
    () => this._config()?.branding.appName ?? this.branding.current()?.appName ?? 'Inventario',
  );
  readonly allowedModules = computed(() => this._config()?.allowedModules ?? []);
  readonly canSeeCosts = computed(() => this.can('products.costs.view'));
  readonly canSeePrices = computed(() => this.can('products.prices.view'));

  can(code: string): boolean {
    return this._config()?.permissions.includes(code) ?? false;
  }

  allows(module: string): boolean {
    return this.allowedModules().includes(module);
  }

  get lastCompany(): string | null {
    return localStorage.getItem(COMPANY_KEY);
  }

  async load(): Promise<void> {
    const config = await firstValueFrom(this.http.get<ClientConfig>('/api/config'));
    this._config.set(config);
    localStorage.setItem(COMPANY_KEY, config.company.slug);
    this.branding.apply(config.branding);
    this.branding.remember(config.company.slug, config.branding);
  }

  clear(): void {
    this._config.set(null);
  }

  /** Branding for the sign-in page of a company; null when the company does not exist. */
  async loadPublicBranding(slug: string): Promise<PublicBranding | null> {
    const cached = this.branding.restore(slug);
    if (cached) this.branding.apply(cached);
    try {
      const result = await firstValueFrom(
        this.http.get<PublicBranding>(`/api/public/companies/${encodeURIComponent(slug)}/branding`),
      );
      this.branding.apply(result.branding);
      this.branding.remember(result.slug, result.branding);
      return result;
    } catch {
      return null;
    }
  }
}
