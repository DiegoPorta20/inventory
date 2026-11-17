import { Inject, Injectable } from '@nestjs/common';
import { ENV, type Env } from '../../../config/env.js';
import { ServiceUnavailableError } from '../../../shared/domain/errors.js';
import { CompanyDirectory, type LookupOptions } from '../application/ports/company-directory.js';
import { normalizeSlug, type CompanyProfile } from '../domain/company-profile.js';
import { companyProfileSchema } from './company-profile.schema.js';

const FOUND_TTL_MS = 60_000;
const MISSING_TTL_MS = 10_000;
const REQUEST_TIMEOUT_MS = 5_000;

interface CacheEntry {
  profile: CompanyProfile | null;
  at: number;
}

/**
 * Asks config_inventory for a company. Answers are cached briefly so the config service is not
 * hit on every request; when it is unreachable the last known answer is still served.
 */
@Injectable()
export class HttpCompanyDirectory extends CompanyDirectory {
  private readonly cache = new Map<string, CacheEntry>();

  constructor(@Inject(ENV) private readonly env: Env) {
    super();
  }

  findBySlug(slug: string, options?: LookupOptions): Promise<CompanyProfile | null> {
    const normalized = normalizeSlug(slug);
    return this.lookup(`slug:${normalized}`, `by-slug/${encodeURIComponent(normalized)}`, options);
  }

  findById(id: number, options?: LookupOptions): Promise<CompanyProfile | null> {
    return this.lookup(`id:${id}`, `by-id/${id}`, options);
  }

  private async lookup(
    key: string,
    path: string,
    options?: LookupOptions,
  ): Promise<CompanyProfile | null> {
    const cached = this.cache.get(key);
    const isFresh =
      cached && Date.now() - cached.at < (cached.profile ? FOUND_TTL_MS : MISSING_TTL_MS);
    if (cached && isFresh && !options?.fresh) return cached.profile;

    try {
      const response = await fetch(this.urlFor(path), {
        headers: { 'x-service-key': this.env.CONFIG_SERVICE_KEY },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (response.status === 404) return this.remember(key, null);
      if (!response.ok) throw new Error(`config service answered ${response.status}`);
      return this.remember(key, companyProfileSchema.parse(await response.json()));
    } catch {
      if (cached) return cached.profile;
      throw new ServiceUnavailableError('The company configuration service is unavailable');
    }
  }

  private remember(key: string, profile: CompanyProfile | null): CompanyProfile | null {
    const entry = { profile, at: Date.now() };
    this.cache.set(key, entry);
    if (profile) {
      this.cache.set(`slug:${profile.slug}`, entry);
      this.cache.set(`id:${profile.id}`, entry);
    }
    return profile;
  }

  private urlFor(path: string): string {
    return `${this.env.CONFIG_SERVICE_URL.replace(/\/+$/, '')}/api/service/companies/${path}`;
  }
}
