import type { ResolveFn, Routes } from '@angular/router';

const resolveId: ResolveFn<number | undefined> = (route) => {
  const n = Number(route.paramMap.get('id'));
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

export const IMPORTS_ROUTES: Routes = [
  {
    path: '',
    title: 'Importaciones · Inventario',
    loadComponent: () => import('./pages/imports-list.page').then((m) => m.ImportsListPage),
  },
  {
    path: 'new',
    title: 'Nueva importación · Inventario',
    loadComponent: () => import('./pages/import-form.page').then((m) => m.ImportFormPage),
  },
  {
    path: ':id/edit',
    title: 'Editar importación · Inventario',
    loadComponent: () => import('./pages/import-form.page').then((m) => m.ImportFormPage),
    resolve: { id: resolveId },
  },
  {
    path: ':id',
    title: 'Importación · Inventario',
    loadComponent: () => import('./pages/import-detail.page').then((m) => m.ImportDetailPage),
    resolve: { id: resolveId },
  },
];
