export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type UnitOfMeasure = 'UNIT' | 'PCS' | 'SET';
export type StockStatus = 'OUT' | 'LOW' | 'OK';
export type StockStatusFilter = StockStatus | 'UNCONFIGURED';
export type Role = 'ADMIN';

export interface User {
  id: number;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  parentId: number | null;
  sortOrder: number;
  productCount: number;
}

export interface Supplier {
  id: number;
  name: string;
  country: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  isActive: boolean;
}

export interface EquipmentModel {
  id: number;
  name: string;
  brand: string | null;
  description: string | null;
  productCount?: number;
}

export interface Product {
  id: number;
  code: string;
  isInternalCode: boolean;
  name: string;
  description: string | null;
  categoryId: number | null;
  unit: UnitOfMeasure;
  stock: number;
  minStock: number;
  reorderQuantity: number;
  location: string | null;
  costUsd: number | null;
  priceUsd: number | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductListItem extends Product {
  categoryName: string | null;
  stockStatus: StockStatus;
  incomingQty: number;
}

export interface ProductDetail extends ProductListItem {
  categoryPath: string | null;
  equipment: EquipmentModel[];
}

export type MovementType = 'IN' | 'OUT' | 'ADJUSTMENT';
export type MovementReason =
  | 'IMPORT_RECEIPT'
  | 'CUSTOMER_RETURN'
  | 'INITIAL_LOAD'
  | 'SALE'
  | 'SUPPLIER_RETURN'
  | 'DAMAGE'
  | 'INTERNAL_USE'
  | 'COUNT_ADJUSTMENT'
  | 'CORRECTION'
  | 'OTHER';

export interface StockMovement {
  id: number;
  productId: number;
  productCode: string;
  productName: string;
  unit: UnitOfMeasure;
  type: MovementType;
  reason: MovementReason;
  quantity: number;
  stockAfter: number;
  unitPriceUsd: number | null;
  counterparty: string | null;
  referenceType: 'IMPORT_ORDER' | 'STOCK_COUNT' | null;
  referenceId: number | null;
  note: string | null;
  userName: string | null;
  occurredAt: string;
}

export type ImportStatus = 'DRAFT' | 'ORDERED' | 'IN_TRANSIT' | 'RECEIVED' | 'CANCELLED';

export interface ImportOrderSummary {
  id: number;
  number: number;
  supplierId: number | null;
  supplierName: string | null;
  status: ImportStatus;
  reference: string | null;
  orderedAt: string | null;
  expectedAt: string | null;
  receivedAt: string | null;
  exchangeRate: number | null;
  notes: string | null;
  createdAt: string;
  itemCount: number;
  totalOrdered: number;
  totalReceived: number;
  totalCostUsd: number;
}

export interface ImportOrderItem {
  id: number;
  productId: number;
  productCode: string;
  productName: string;
  unit: UnitOfMeasure;
  quantityOrdered: number;
  quantityReceived: number;
  unitCostUsd: number | null;
  notes: string | null;
}

export interface ImportOrderDetail extends ImportOrderSummary {
  items: ImportOrderItem[];
}

export type StockCountStatus = 'OPEN' | 'COMPLETED' | 'CANCELLED';

export interface StockCountSummary {
  itemsTotal: number;
  itemsCounted: number;
  itemsWithDifference: number;
  netDifference: number;
}

export interface StockCount {
  id: number;
  name: string;
  status: StockCountStatus;
  categoryId: number | null;
  categoryName: string | null;
  note: string | null;
  completedAt: string | null;
  createdAt: string;
  summary: StockCountSummary;
}

export interface StockCountItem {
  id: number;
  productId: number;
  productCode: string;
  productName: string;
  unit: UnitOfMeasure;
  categoryName: string | null;
  systemQty: number;
  countedQty: number | null;
  difference: number | null;
  note: string | null;
}

export interface ReorderSuggestion {
  product: ProductListItem;
  suggestedQty: number;
  estimatedCostUsd: number | null;
}

export interface ReorderReport {
  items: ReorderSuggestion[];
  summary: { total: number; outOfStock: number; estimatedCostUsd: number };
}

export interface DashboardSummary {
  totals: {
    activeProducts: number;
    totalUnits: number;
    inventoryValueUsd: number;
    outOfStock: number;
    lowStock: number;
    unconfiguredMinStock: number;
    incomingUnits: number;
    openImports: number;
  };
  stockByCategory: {
    categoryId: number | null;
    name: string;
    products: number;
    units: number;
    valueUsd: number;
  }[];
  dailyMovements: { date: string; inQty: number; outQty: number }[];
  topSold: { productId: number; code: string; name: string; quantity: number }[];
  recentMovements: {
    id: number;
    productId: number;
    productCode: string;
    productName: string;
    type: MovementType;
    reason: MovementReason;
    quantity: number;
    occurredAt: string;
    userName: string | null;
  }[];
  attention: (ProductListItem & { suggestedQty: number })[];
}
