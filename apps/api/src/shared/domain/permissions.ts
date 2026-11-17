/**
 * Every action a company can allow its PERSONAL users, grouped by module. config_inventory keeps the
 * same catalog (apps/api/src/modules/catalog); a code that is not listed here is never granted.
 */
export const MODULE_PERMISSIONS = {
  dashboard: ['dashboard.view'],
  products: [
    'products.view',
    'products.create',
    'products.update',
    'products.delete',
    'products.export',
    'products.import',
    'products.costs.view',
    'products.prices.view',
  ],
  categories: ['categories.view', 'categories.manage'],
  'cost-centers': ['cost-centers.view', 'cost-centers.manage'],
  movements: ['movements.view', 'movements.create'],
  counts: ['counts.view', 'counts.create', 'counts.record', 'counts.complete'],
  reorder: ['reorder.view'],
  imports: [
    'imports.view',
    'imports.create',
    'imports.update',
    'imports.receive',
    'imports.delete',
  ],
  suppliers: ['suppliers.view', 'suppliers.manage'],
  equipment: ['equipment.view', 'equipment.manage'],
} as const;

/** Modules only administrators can use; they carry no grantable permissions. */
export const ADMIN_ONLY_MODULES = ['users', 'settings'] as const;

type Grouped = typeof MODULE_PERMISSIONS;
export type PermissionCode = Grouped[keyof Grouped][number];
export type ModuleKey = keyof Grouped | (typeof ADMIN_ONLY_MODULES)[number];

export const GRANTABLE_MODULES = Object.keys(MODULE_PERMISSIONS) as (keyof Grouped)[];
export const ALL_MODULES: readonly ModuleKey[] = [...GRANTABLE_MODULES, ...ADMIN_ONLY_MODULES];
export const ALL_PERMISSIONS: readonly PermissionCode[] = Object.values(MODULE_PERMISSIONS).flat();

export const moduleOf = (code: string): string => code.split('.')[0] ?? '';
