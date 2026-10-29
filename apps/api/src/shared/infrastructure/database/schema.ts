import { sql } from 'drizzle-orm';
import {
  boolean,
  date,
  datetime,
  decimal,
  index,
  int,
  mysqlTable,
  primaryKey,
  text,
  uniqueIndex,
  varchar,
  type AnyMySqlColumn,
} from 'drizzle-orm/mysql-core';

const createdAt = () =>
  datetime('created_at', { mode: 'date', fsp: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3)`);

const updatedAt = () =>
  datetime('updated_at', { mode: 'date', fsp: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3)`)
    .$onUpdate(() => new Date());

const money = (name: string) => decimal(name, { precision: 12, scale: 4, mode: 'number' });

export const users = mysqlTable(
  'users',
  {
    id: int('id').autoincrement().primaryKey(),
    email: varchar('email', { length: 190 }).notNull(),
    name: varchar('name', { length: 120 }).notNull(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    role: varchar('role', { length: 30 }).notNull().default('ADMIN'),
    isActive: boolean('is_active').notNull().default(true),
    lastLoginAt: datetime('last_login_at', { mode: 'date', fsp: 3 }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('users_email_uq').on(t.email)],
);

export const categories = mysqlTable(
  'categories',
  {
    id: int('id').autoincrement().primaryKey(),
    name: varchar('name', { length: 120 }).notNull(),
    slug: varchar('slug', { length: 140 }).notNull(),
    parentId: int('parent_id').references((): AnyMySqlColumn => categories.id, {
      onDelete: 'restrict',
    }),
    sortOrder: int('sort_order').notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('categories_slug_uq').on(t.slug),
    index('categories_parent_idx').on(t.parentId),
  ],
);

export const suppliers = mysqlTable(
  'suppliers',
  {
    id: int('id').autoincrement().primaryKey(),
    name: varchar('name', { length: 160 }).notNull(),
    country: varchar('country', { length: 80 }),
    contactName: varchar('contact_name', { length: 120 }),
    email: varchar('email', { length: 190 }),
    phone: varchar('phone', { length: 40 }),
    notes: text('notes'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('suppliers_name_uq').on(t.name)],
);

export const equipmentModels = mysqlTable(
  'equipment_models',
  {
    id: int('id').autoincrement().primaryKey(),
    name: varchar('name', { length: 160 }).notNull(),
    brand: varchar('brand', { length: 80 }),
    description: text('description'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('equipment_models_name_uq').on(t.name)],
);

export const costCenters = mysqlTable(
  'cost_centers',
  {
    id: int('id').autoincrement().primaryKey(),
    name: varchar('name', { length: 120 }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('cost_centers_name_uq').on(t.name)],
);

export const settings = mysqlTable('settings', {
  key: varchar('key', { length: 60 }).primaryKey(),
  value: varchar('value', { length: 255 }).notNull(),
  updatedAt: updatedAt(),
});

export const products = mysqlTable(
  'products',
  {
    id: int('id').autoincrement().primaryKey(),
    code: varchar('code', { length: 60 }).notNull(),
    isInternalCode: boolean('is_internal_code').notNull().default(false),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    specification: varchar('specification', { length: 500 }),
    categoryId: int('category_id').references(() => categories.id, { onDelete: 'restrict' }),
    costCenterId: int('cost_center_id').references(() => costCenters.id, { onDelete: 'set null' }),
    unit: varchar('unit', { length: 10 }).notNull().default('PCS'),
    stock: int('stock').notNull().default(0),
    minStock: int('min_stock').notNull().default(0),
    reorderQuantity: int('reorder_quantity').notNull().default(0),
    location: varchar('location', { length: 60 }),
    costPen: money('cost_pen'),
    pricePen: money('price_pen'),
    wholesalePricePen: money('wholesale_price_pen'),
    wholesaleMinQty: int('wholesale_min_qty'),
    isConsignment: boolean('is_consignment').notNull().default(false),
    notes: text('notes'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('products_code_uq').on(t.code),
    index('products_name_idx').on(t.name),
    index('products_category_idx').on(t.categoryId),
    index('products_cost_center_idx').on(t.costCenterId),
    index('products_stock_idx').on(t.stock),
  ],
);

export const productEquipment = mysqlTable(
  'product_equipment',
  {
    productId: int('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    equipmentId: int('equipment_id')
      .notNull()
      .references(() => equipmentModels.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.productId, t.equipmentId] })],
);

export const importOrders = mysqlTable(
  'import_orders',
  {
    id: int('id').autoincrement().primaryKey(),
    number: int('number').notNull(),
    supplierId: int('supplier_id').references(() => suppliers.id, { onDelete: 'restrict' }),
    status: varchar('status', { length: 20 }).notNull().default('DRAFT'),
    reference: varchar('reference', { length: 120 }),
    orderedAt: date('ordered_at', { mode: 'string' }),
    expectedAt: date('expected_at', { mode: 'string' }),
    receivedAt: date('received_at', { mode: 'string' }),
    notes: text('notes'),
    createdBy: int('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('import_orders_number_uq').on(t.number),
    index('import_orders_status_idx').on(t.status),
    index('import_orders_supplier_idx').on(t.supplierId),
  ],
);

export const importOrderItems = mysqlTable(
  'import_order_items',
  {
    id: int('id').autoincrement().primaryKey(),
    importOrderId: int('import_order_id')
      .notNull()
      .references(() => importOrders.id, { onDelete: 'cascade' }),
    productId: int('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    quantityOrdered: int('quantity_ordered').notNull(),
    quantityReceived: int('quantity_received').notNull().default(0),
    unitCostPen: money('unit_cost_pen'),
    notes: varchar('notes', { length: 255 }),
  },
  (t) => [
    uniqueIndex('import_order_items_uq').on(t.importOrderId, t.productId),
    index('import_order_items_product_idx').on(t.productId),
  ],
);

export const stockMovements = mysqlTable(
  'stock_movements',
  {
    id: int('id').autoincrement().primaryKey(),
    productId: int('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    type: varchar('type', { length: 12 }).notNull(),
    reason: varchar('reason', { length: 30 }).notNull(),
    quantity: int('quantity').notNull(),
    stockAfter: int('stock_after').notNull(),
    unitPricePen: money('unit_price_pen'),
    counterparty: varchar('counterparty', { length: 160 }),
    referenceType: varchar('reference_type', { length: 20 }),
    referenceId: int('reference_id'),
    note: varchar('note', { length: 500 }),
    userId: int('user_id').references(() => users.id, { onDelete: 'set null' }),
    occurredAt: datetime('occurred_at', { mode: 'date', fsp: 3 })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP(3)`),
    createdAt: createdAt(),
  },
  (t) => [
    index('stock_movements_product_idx').on(t.productId, t.occurredAt),
    index('stock_movements_occurred_idx').on(t.occurredAt),
    index('stock_movements_reference_idx').on(t.referenceType, t.referenceId),
  ],
);

export const stockCounts = mysqlTable(
  'stock_counts',
  {
    id: int('id').autoincrement().primaryKey(),
    name: varchar('name', { length: 120 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('OPEN'),
    categoryId: int('category_id').references(() => categories.id, { onDelete: 'set null' }),
    note: varchar('note', { length: 500 }),
    createdBy: int('created_by').references(() => users.id, { onDelete: 'set null' }),
    completedAt: datetime('completed_at', { mode: 'date', fsp: 3 }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('stock_counts_status_idx').on(t.status)],
);

export const stockCountItems = mysqlTable(
  'stock_count_items',
  {
    id: int('id').autoincrement().primaryKey(),
    stockCountId: int('stock_count_id')
      .notNull()
      .references(() => stockCounts.id, { onDelete: 'cascade' }),
    productId: int('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    systemQty: int('system_qty').notNull(),
    countedQty: int('counted_qty'),
    note: varchar('note', { length: 255 }),
  },
  (t) => [
    uniqueIndex('stock_count_items_uq').on(t.stockCountId, t.productId),
    index('stock_count_items_product_idx').on(t.productId),
  ],
);
