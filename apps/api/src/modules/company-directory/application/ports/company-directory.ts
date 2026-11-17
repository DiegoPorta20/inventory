import type { CompanyProfile } from '../../domain/company-profile.js';

/** Read-only view of the companies, owned and configured by config_inventory. */
export interface LookupOptions {
  /** Skip the short-lived cache; use it where a stale status would matter (sign-in, refresh). */
  fresh?: boolean;
}

export abstract class CompanyDirectory {
  abstract findBySlug(slug: string, options?: LookupOptions): Promise<CompanyProfile | null>;
  abstract findById(id: number, options?: LookupOptions): Promise<CompanyProfile | null>;
}
