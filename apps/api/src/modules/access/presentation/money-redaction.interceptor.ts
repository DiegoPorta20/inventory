import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { map, type Observable } from 'rxjs';
import type { Access } from '../../../shared/domain/access.js';

/** Fields that reveal what the company pays for its stock. */
const COST_KEYS: ReadonlySet<string> = new Set([
  'costPen',
  'unitCostPen',
  'totalCostPen',
  'estimatedCostPen',
  'inventoryValuePen',
  'valuePen',
  'marginPercent',
]);

/** Fields that reveal what the company charges. */
const PRICE_KEYS: ReadonlySet<string> = new Set([
  'pricePen',
  'wholesalePricePen',
  'wholesaleMinQty',
  'unitPricePen',
  'pricing',
  'inventoryValueAtPricePen',
  'withoutPrice',
]);

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== 'object' || value === null) return false;
  const prototype = Object.getPrototypeOf(value) as unknown;
  return prototype === Object.prototype || prototype === null;
};

function redact(value: unknown, hidden: ReadonlySet<string>): unknown {
  if (Array.isArray(value)) return value.map((item) => redact(item, hidden));
  if (!isPlainObject(value)) return value;
  const result: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (!hidden.has(key)) result[key] = redact(child, hidden);
  }
  return result;
}

/**
 * Strips cost and price fields from every JSON response for users without `products.costs.view`
 * or `products.prices.view`. File downloads are handled where the file is built.
 */
@Injectable()
export class MoneyRedactionInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const { access } = context.switchToHttp().getRequest<Request & { access?: Access }>();
    return next.handle().pipe(
      map((body: unknown) => {
        if (!access) return body;
        const hidden = new Set<string>();
        if (!access.canSeeCosts) COST_KEYS.forEach((key) => hidden.add(key));
        if (!access.canSeePrices) PRICE_KEYS.forEach((key) => hidden.add(key));
        return hidden.size === 0 ? body : redact(body, hidden);
      }),
    );
  }
}
