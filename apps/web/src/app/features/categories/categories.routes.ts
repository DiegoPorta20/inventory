import type { Routes } from '@angular/router';

export const CATEGORIES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/categories-list.page').then((m) => m.CategoriesListPage),
    title: 'Categorías · Inventario',
  },
];
