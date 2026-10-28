import type { Routes } from '@angular/router';

export const COUNTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/counts-list.page').then((m) => m.CountsListPage),
    title: 'Conteos · Inventario',
  },
  {
    path: ':id',
    loadComponent: () => import('./pages/count-detail.page').then((m) => m.CountDetailPage),
    title: 'Conteo · Inventario',
  },
];
