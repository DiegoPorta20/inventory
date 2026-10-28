import { z } from 'zod';
import { MAX_PAGE_SIZE } from '../application/page.js';

export const pageQueryShape = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(25),
};

export const idParam = z.coerce.number().int().positive();

export const queryBoolean = z.enum(['true', 'false']).transform((value) => value === 'true');

export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === '' ? null : value))
    .nullable()
    .optional();

export const sortDirection = z.enum(['asc', 'desc']).default('asc');
