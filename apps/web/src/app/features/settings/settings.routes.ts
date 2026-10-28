import type { Routes } from '@angular/router';

export const SETTINGS_ROUTES: Routes = [
  {
    path: '',
    title: 'Configuración · Inventario',
    loadComponent: () => import('./pages/settings.page').then((m) => m.SettingsPage),
  },
];
