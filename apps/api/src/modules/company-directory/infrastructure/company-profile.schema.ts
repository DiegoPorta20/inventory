import { z } from 'zod';
import { COMPANY_STATUSES } from '../domain/company-profile.js';

const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const companyProfileSchema = z.object({
  id: z.number().int().positive(),
  slug: z.string().min(1),
  name: z.string().min(1),
  status: z.enum(COMPANY_STATUSES),
  config: z.object({
    branding: z.object({
      appName: z.string().min(1),
      tagline: z.string().nullable(),
      logoUrl: z.string().nullable(),
      faviconUrl: z.string().nullable(),
      primaryColor: color,
      accentColor: color.nullable(),
      palette: z.object({
        primary: z.record(z.string(), color),
        accent: z.record(z.string(), color),
      }),
    }),
    modules: z.array(z.string()),
    permissions: z.object({ PERSONAL: z.array(z.string()) }),
    limits: z.object({ maxUsers: z.number().int().positive().nullable() }),
  }),
});
