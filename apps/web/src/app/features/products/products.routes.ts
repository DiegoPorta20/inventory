import type { Routes } from '@angular/router';

export const PRODUCTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/products-list.page').then((m) => m.ProductsListPage),
    title: 'Productos · Inventario',
  },
  {
    path: 'new',
    loadComponent: () => import('./pages/product-form.page').then((m) => m.ProductFormPage),
    title: 'Nuevo producto · Inventario',
  },
  {
    path: 'import',
    loadComponent: () => import('./pages/product-import.page').then((m) => m.ProductImportPage),
    title: 'Importar productos · Inventario',
  },
  {
    path: ':id',
    loadComponent: () => import('./pages/product-detail.page').then((m) => m.ProductDetailPage),
    title: 'Producto · Inventario',
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./pages/product-form.page').then((m) => m.ProductFormPage),
    title: 'Editar producto · Inventario',
  },
];
