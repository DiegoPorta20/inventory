import type { Routes } from '@angular/router';

export const REORDER_ROUTES: Routes = [
  {
    path: '',
    title: 'Reposición · Inventario',
    loadComponent: () => import('./pages/reorder.page').then((m) => m.ReorderPage),
  },
];
