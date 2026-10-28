import type { Routes } from '@angular/router';

export const SUPPLIERS_ROUTES: Routes = [
  {
    path: '',
    title: 'Proveedores · Inventario',
    loadComponent: () => import('./pages/suppliers-list.page').then((m) => m.SuppliersListPage),
  },
];
