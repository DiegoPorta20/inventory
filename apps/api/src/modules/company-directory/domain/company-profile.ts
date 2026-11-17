export const COMPANY_STATUSES = ['ACTIVE', 'SUSPENDED'] as const;
export type CompanyStatus = (typeof COMPANY_STATUSES)[number];

/** Color scales keyed by shade, e.g. `{ '600': '#273f85' }`. */
export type Palette = Record<string, string>;

export interface CompanyBranding {
  appName: string;
  tagline: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  accentColor: string | null;
  palette: { primary: Palette; accent: Palette };
}

/** Everything config_inventory decides for one company. Inventory only reads it. */
export interface CompanyConfig {
  branding: CompanyBranding;
  /** Keys of the enabled modules (see config_inventory's catalog). */
  modules: string[];
  /** Permission codes granted to the PERSONAL role. ADMIN always gets everything enabled. */
  permissions: { PERSONAL: string[] };
  limits: { maxUsers: number | null };
}

export interface CompanyProfile {
  id: number;
  slug: string;
  name: string;
  status: CompanyStatus;
  config: CompanyConfig;
}

export const normalizeSlug = (slug: string): string => slug.trim().toLowerCase();
