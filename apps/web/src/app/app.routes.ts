import type { Routes, UrlMatcher } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guards';
import { homeGuard, moduleGuard } from './core/auth/module.guards';
import { ShellComponent } from './core/layout/shell.component';

/** Top-level paths of the app itself; a company address can never use one of these. */
const APP_PATHS = new Set([
  'login',
  'dashboard',
  'products',
  'categories',
  'cost-centers',
  'movements',
  'counts',
  'reorder',
  'imports',
  'suppliers',
  'equipment',
  'users',
  'settings',
  'account',
]);

/** Matches /:company and /:company/login. */
export const companyMatcher: UrlMatcher = (segments) => {
  const [first, second] = segments;
  if (!first || APP_PATHS.has(first.path)) return null;
  const isHome = segments.length === 1;
  const isLogin = segments.length === 2 && second?.path === 'login';
  return isHome || isLogin ? { consumed: segments, posParams: { company: first } } : null;
};

export const routes: Routes = [
  {
    path: 'login',
    title: 'Iniciar sesión · Inventario',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login.page').then((m) => m.LoginPage),
  },
  {
    matcher: companyMatcher,
    title: 'Iniciar sesión · Inventario',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login.page').then((m) => m.LoginPage),
  },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', canActivate: [homeGuard], children: [] },
      {
        path: 'dashboard',
        canActivate: [moduleGuard('dashboard')],
        title: 'Panel · Inventario',
        loadComponent: () =>
          import('./features/dashboard/dashboard.page').then((m) => m.DashboardPage),
      },
      {
        path: 'products',
        canActivate: [moduleGuard('products')],
        loadChildren: () =>
          import('./features/products/products.routes').then((m) => m.PRODUCTS_ROUTES),
      },
      {
        path: 'categories',
        canActivate: [moduleGuard('categories')],
        loadChildren: () =>
          import('./features/categories/categories.routes').then((m) => m.CATEGORIES_ROUTES),
      },
      {
        path: 'cost-centers',
        canActivate: [moduleGuard('cost-centers')],
        loadChildren: () =>
          import('./features/cost-centers/cost-centers.routes').then((m) => m.COST_CENTERS_ROUTES),
      },
      {
        path: 'movements',
        canActivate: [moduleGuard('movements')],
        loadChildren: () =>
          import('./features/movements/movements.routes').then((m) => m.MOVEMENTS_ROUTES),
      },
      {
        path: 'counts',
        canActivate: [moduleGuard('counts')],
        loadChildren: () => import('./features/counts/counts.routes').then((m) => m.COUNTS_ROUTES),
      },
      {
        path: 'reorder',
        canActivate: [moduleGuard('reorder')],
        loadChildren: () =>
          import('./features/reorder/reorder.routes').then((m) => m.REORDER_ROUTES),
      },
      {
        path: 'imports',
        canActivate: [moduleGuard('imports')],
        loadChildren: () =>
          import('./features/imports/imports.routes').then((m) => m.IMPORTS_ROUTES),
      },
      {
        path: 'suppliers',
        canActivate: [moduleGuard('suppliers')],
        loadChildren: () =>
          import('./features/suppliers/suppliers.routes').then((m) => m.SUPPLIERS_ROUTES),
      },
      {
        path: 'equipment',
        canActivate: [moduleGuard('equipment')],
        loadChildren: () =>
          import('./features/equipment/equipment.routes').then((m) => m.EQUIPMENT_ROUTES),
      },
      {
        path: 'users',
        canActivate: [moduleGuard('users')],
        loadChildren: () => import('./features/users/users.routes').then((m) => m.USERS_ROUTES),
      },
      {
        path: 'settings',
        canActivate: [moduleGuard('settings')],
        loadChildren: () =>
          import('./features/settings/settings.routes').then((m) => m.SETTINGS_ROUTES),
      },
      {
        path: 'account',
        title: 'Mi cuenta · Inventario',
        loadComponent: () => import('./features/account/account.page').then((m) => m.AccountPage),
      },
      {
        path: '**',
        title: 'No encontrado · Inventario',
        loadComponent: () => import('./features/not-found.page').then((m) => m.NotFoundPage),
      },
    ],
  },
];
