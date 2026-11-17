export interface InventoryTotals {
  activeProducts: number;
  totalUnits: number;
  inventoryValuePen: number;
  inventoryValueAtPricePen: number;
  withoutPrice: number;
  consignmentUnits: number;
  outOfStock: number;
  lowStock: number;
  unconfiguredMinStock: number;
  incomingUnits: number;
  openImports: number;
}

export interface CategoryStock {
  categoryId: number | null;
  name: string;
  products: number;
  units: number;
  valuePen: number;
}

export interface DailyMovement {
  date: string;
  inQty: number;
  outQty: number;
}

export interface TopSoldProduct {
  productId: number;
  code: string;
  name: string;
  quantity: number;
}

export interface RecentMovement {
  id: number;
  productId: number;
  productCode: string;
  productName: string;
  type: string;
  reason: string;
  quantity: number;
  occurredAt: Date;
  userName: string | null;
}

export abstract class DashboardReader {
  abstract totals(): Promise<InventoryTotals>;
  abstract stockByCategory(): Promise<CategoryStock[]>;
  abstract dailyMovements(days: number): Promise<DailyMovement[]>;
  abstract topSold(days: number, limit: number): Promise<TopSoldProduct[]>;
  abstract recentMovements(limit: number): Promise<RecentMovement[]>;
}
