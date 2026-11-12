import type { Role } from '../../shared/models/models';

export type Palette = Record<string, string>;

export interface Branding {
  appName: string;
  tagline: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  accentColor: string | null;
  palette: { primary: Palette; accent: Palette };
}

/** What the server says this user may see and do inside their company. */
export interface ClientConfig {
  company: { slug: string; name: string };
  branding: Branding;
  role: Role;
  allowedModules: string[];
  permissions: string[];
  limits?: { maxUsers: number | null };
}

export interface PublicBranding {
  slug: string;
  name: string;
  branding: Branding;
}
