import { sql } from 'drizzle-orm';
import { importOrderItems, importOrders, products } from './schema.js';

/** Units ordered but not yet received, from open import orders, for the outer `products` row. */
export const incomingQtySql = sql<number>`(
  SELECT COALESCE(SUM(${importOrderItems.quantityOrdered} - ${importOrderItems.quantityReceived}), 0)
  FROM ${importOrderItems}
  INNER JOIN ${importOrders} ON ${importOrders.id} = ${importOrderItems.importOrderId}
  WHERE ${importOrderItems.productId} = ${products.id}
    AND ${importOrders.status} IN ('ORDERED', 'IN_TRANSIT')
)`.mapWith(Number);
