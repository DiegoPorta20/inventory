import type { Routes } from '@angular/router';

export const COST_CENTERS_ROUTES: Routes = [
  {
    path: '',
    title: 'Centros de costo · Inventario',
    loadComponent: () =>
      import('./pages/cost-centers-list.page').then((m) => m.CostCentersListPage),
  },
];
