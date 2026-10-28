import type { Routes } from '@angular/router';

export const EQUIPMENT_ROUTES: Routes = [
  {
    path: '',
    title: 'Equipos · Inventario',
    loadComponent: () => import('./pages/equipment-list.page').then((m) => m.EquipmentListPage),
  },
];
