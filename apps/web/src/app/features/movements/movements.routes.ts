import type { Routes } from '@angular/router';

export const MOVEMENTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/movements-list.page').then((m) => m.MovementsListPage),
    title: 'Movimientos · Inventario',
  },
];
