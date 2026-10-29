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
  specification: string | null;
  categoryId: number | null;
  costCenterId: number | null;
  unit: UnitOfMeasure;
  stock: number;
  minStock: number;
  reorderQuantity: number;
  location: string | null;
  costPen: number | null;
  /** Sale price in soles without IGV. */
  pricePen: number | null;
  wholesalePricePen: number | null;
  wholesaleMinQty: number | null;
  isConsignment: boolean;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PriceBreakdown {
  pricePen: number;
  igvPen: number;
  priceWithIgvPen: number;
}

export interface ProductPricing {
  retail: PriceBreakdown | null;
  wholesale: (PriceBreakdown & { minQty: number | null }) | null;
  marginPercent: number | null;
}

export interface PricingSettings {
  igvRate: number;
}

export interface CostCenter {
  id: number;
  name: string;
  productCount: number;
}

export interface ProductListItem extends Product {
  categoryName: string | null;
  costCenterName: string | null;
  stockStatus: StockStatus;
  incomingQty: number;
}

/** Product list/detail responses include the computed price breakdown. */
export interface PricedProduct extends ProductListItem {
  pricing: ProductPricing;
}

export interface ProductDetail extends PricedProduct {
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
  unitPricePen: number | null;
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
  notes: string | null;
  createdAt: string;
  itemCount: number;
  totalOrdered: number;
  totalReceived: number;
  totalCostPen: number;
}

export interface ImportOrderItem {
  id: number;
  productId: number;
  productCode: string;
  productName: string;
  unit: UnitOfMeasure;
  quantityOrdered: number;
  quantityReceived: number;
  unitCostPen: number | null;
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
  estimatedCostPen: number | null;
}

export interface ReorderReport {
  items: ReorderSuggestion[];
  summary: { total: number; outOfStock: number; estimatedCostPen: number };
}

export interface DashboardSummary {
  totals: {
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
  };
  stockByCategory: {
    categoryId: number | null;
    name: string;
    products: number;
    units: number;
    valuePen: number;
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

export interface ProductImportIssue {
  column: string;
  message: string;
}

export interface ProductImportRow {
  rowNumber: number;
  action: 'CREATE' | 'UPDATE';
  /** Null when the system assigns an internal code. */
  code: string | null;
  name: string | null;
  errors: ProductImportIssue[];
  warnings: ProductImportIssue[];
}

export interface ProductImportPreview {
  fileErrors: string[];
  fileWarnings: string[];
  summary: {
    totalRows: number;
    toCreate: number;
    toUpdate: number;
    withErrors: number;
    withWarnings: number;
  };
  rows: ProductImportRow[];
}

export interface ProductImportResult {
  created: number;
  updated: number;
  initialStockMovements: number;
}
