import type { Access } from '../domain/access.js';

/** Refuses writes to cost or price fields from users who may not see them. */
export function assertMoneyWritable(
  access: Access,
  fields: { costs?: readonly unknown[]; prices?: readonly unknown[] },
): void {
  if (fields.costs?.some((value) => value !== undefined)) access.requireCosts();
  if (fields.prices?.some((value) => value !== undefined)) access.requirePrices();
}

export const visibilityOf = (access: Access) => ({
  costs: access.canSeeCosts,
  prices: access.canSeePrices,
});
