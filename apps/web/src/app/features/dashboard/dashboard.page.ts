import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import {
  MOVEMENT_REASON_LABELS,
  MOVEMENT_TYPE_LABELS,
  MOVEMENT_TYPE_TONES,
} from '../../shared/models/labels';
import type { DashboardSummary } from '../../shared/models/models';
import { FORMAT_PIPES, formatQuantity, formatPen } from '../../shared/pipes/format.pipes';
import { BadgeComponent, StockBadgeComponent } from '../../shared/ui/badge.components';
import { IconComponent } from '../../shared/ui/icon.component';
import { PageHeaderComponent, StatCardComponent } from '../../shared/ui/layout.components';
import { ErrorStateComponent } from '../../shared/ui/states.components';

const TREND_DAYS = 30;

@Component({
  selector: 'app-dashboard-page',
  imports: [
    RouterLink,
    FORMAT_PIPES,
    BadgeComponent,
    StockBadgeComponent,
    IconComponent,
    PageHeaderComponent,
    StatCardComponent,
    ErrorStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-page-header title="Panel" subtitle="Estado actual del inventario." />

    @if (summary.isLoading()) {
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true">
        @for (i of [1, 2, 3, 4]; track i) {
          <div class="card p-4">
            <div class="skeleton h-3 w-24"></div>
            <div class="skeleton mt-3 h-7 w-32"></div>
          </div>
        }
      </div>
    } @else if (summary.error()) {
      <div class="card">
        <ui-error-state>
          <button type="button" class="btn btn-secondary" (click)="summary.reload()">
            Reintentar
          </button>
        </ui-error-state>
      </div>
    } @else if (data(); as d) {
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <ui-stat-card label="Productos activos" [value]="d.totals.activeProducts | quantity" />
        <ui-stat-card
          label="Unidades en stock"
          [value]="d.totals.totalUnits | quantity"
          [hint]="
            d.totals.consignmentUnits > 0
              ? (d.totals.consignmentUnits | quantity) + ' u. en consignación'
              : undefined
          "
        />
        <ui-stat-card
          label="Valor del inventario"
          [value]="d.totals.inventoryValuePen | pen"
          [hint]="
            d.totals.inventoryValuePen === 0
              ? 'Registra costos para calcularlo'
              : 'A costo, en soles'
          "
        />
        <ui-stat-card
          label="Valor a precio de venta"
          [value]="d.totals.inventoryValueAtPricePen | pen"
          hint="En soles, sin IGV"
        />
        <ui-stat-card
          label="En camino"
          [value]="(d.totals.incomingUnits | quantity) + ' u.'"
          [hint]="d.totals.openImports + ' importaciones abiertas'"
        />
      </div>

      <div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <a
          routerLink="/products"
          [queryParams]="{ stockStatus: 'OUT' }"
          class="card card-lift flex items-center gap-4 p-4"
        >
          <span
            class="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50 text-rose-600"
            ><ui-icon name="alert" [size]="5"
          /></span>
          <span>
            <span class="block text-2xl font-semibold tabular-nums">{{
              d.totals.outOfStock | quantity
            }}</span>
            <span class="text-xs text-slate-500">Productos sin stock</span>
          </span>
        </a>
        <a
          routerLink="/products"
          [queryParams]="{ stockStatus: 'LOW' }"
          class="card card-lift flex items-center gap-4 p-4"
        >
          <span
            class="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600"
            ><ui-icon name="arrow-down" [size]="5"
          /></span>
          <span>
            <span class="block text-2xl font-semibold tabular-nums">{{
              d.totals.lowStock | quantity
            }}</span>
            <span class="text-xs text-slate-500">Con stock bajo</span>
          </span>
        </a>
        <a
          routerLink="/products"
          [queryParams]="{ stockStatus: 'UNCONFIGURED' }"
          class="card card-lift flex items-center gap-4 p-4"
        >
          <span class="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 text-sky-600"
            ><ui-icon name="info" [size]="5"
          /></span>
          <span>
            <span class="block text-2xl font-semibold tabular-nums">{{
              d.totals.unconfiguredMinStock | quantity
            }}</span>
            <span class="text-xs text-slate-500">Sin stock mínimo configurado</span>
          </span>
        </a>
        <a
          routerLink="/products"
          [queryParams]="{ hasPrice: false }"
          class="card card-lift flex items-center gap-4 p-4"
        >
          <span
            class="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600"
            ><ui-icon name="tag" [size]="5"
          /></span>
          <span>
            <span class="block text-2xl font-semibold tabular-nums">{{
              d.totals.withoutPrice | quantity
            }}</span>
            <span class="text-xs text-slate-500">Productos sin precio</span>
          </span>
        </a>
      </div>

      @if (d.totals.unconfiguredMinStock > 0 && d.attention.length === 0) {
        <div
          class="mt-4 flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900"
        >
          <ui-icon name="info" [size]="5" />
          <p>
            Para recibir alertas de reposición define el <strong>stock mínimo</strong> de tus
            productos. Puedes hacerlo en lote desde
            <a
              routerLink="/products"
              [queryParams]="{ stockStatus: 'UNCONFIGURED' }"
              class="font-medium underline"
              >Productos</a
            >.
          </p>
        </div>
      }

      <div class="mt-6 grid gap-4 lg:grid-cols-5">
        <section class="card lg:col-span-3">
          <div class="card-header">
            <h2 class="card-title">Requieren reposición</h2>
            <a routerLink="/reorder" class="btn btn-ghost btn-sm"
              >Ver todo <ui-icon name="chevron-right" [size]="4"
            /></a>
          </div>
          @if (d.attention.length === 0) {
            <p class="px-4 py-10 text-center text-sm text-slate-500">
              No hay productos por debajo de su stock mínimo.
            </p>
          } @else {
            <div class="table-wrap">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th class="num">Stock</th>
                    <th class="num">Sugerido</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of d.attention; track item.id) {
                    <tr class="row-link" [routerLink]="['/products', item.id]">
                      <td>
                        <span class="block max-w-xs truncate font-medium text-slate-800">{{
                          item.name
                        }}</span>
                        <span class="text-xs text-slate-500">{{ item.code }}</span>
                      </td>
                      <td class="num">
                        {{ item.stock | quantity }} / {{ item.minStock | quantity }}
                      </td>
                      <td class="num font-medium">{{ item.suggestedQty | quantity }}</td>
                      <td><ui-stock-badge [status]="item.stockStatus" /></td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </section>

        <section class="card lg:col-span-2">
          <div class="card-header"><h2 class="card-title">Stock por categoría</h2></div>
          <ul class="space-y-3 p-4">
            @for (row of categoryBars(); track row.name) {
              <li>
                <div class="mb-1 flex justify-between text-xs">
                  <span class="truncate font-medium text-slate-700">{{ row.name }}</span>
                  <span class="text-slate-500 tabular-nums"
                    >{{ row.units | quantity }} u. · {{ row.products | quantity }} prod.</span
                  >
                </div>
                <div class="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    class="meter-fill h-full rounded-full bg-brand-500"
                    [style.width.%]="row.percent"
                  ></div>
                </div>
              </li>
            }
          </ul>
        </section>
      </div>

      <div class="mt-4 grid gap-4 lg:grid-cols-5">
        <section class="card lg:col-span-3">
          <div class="card-header">
            <h2 class="card-title">Movimientos de los últimos 30 días</h2>
            <span class="flex items-center gap-3 text-xs text-slate-500">
              <span class="flex items-center gap-1"
                ><span class="h-2 w-2 rounded-sm bg-emerald-500"></span>Entradas</span
              >
              <span class="flex items-center gap-1"
                ><span class="h-2 w-2 rounded-sm bg-rose-500"></span>Salidas</span
              >
            </span>
          </div>
          <div class="p-4">
            <div
              class="flex h-40 items-end gap-0.5"
              role="img"
              aria-label="Entradas y salidas por día"
            >
              @for (day of trend(); track day.date) {
                <div
                  class="flex h-full flex-1 flex-col justify-end gap-px"
                  [title]="day.date + ': +' + day.inQty + ' / -' + day.outQty"
                >
                  <div class="rounded-t-sm bg-emerald-500" [style.height.%]="day.inPercent"></div>
                  <div class="rounded-b-sm bg-rose-500" [style.height.%]="day.outPercent"></div>
                </div>
              }
            </div>
            <div class="mt-1 flex justify-between text-xs text-slate-400">
              <span>{{ trend()[0]?.date }}</span
              ><span>{{ trend()[trend().length - 1]?.date }}</span>
            </div>
          </div>
        </section>

        <section class="card lg:col-span-2">
          <div class="card-header"><h2 class="card-title">Más vendidos (30 días)</h2></div>
          @if (d.topSold.length === 0) {
            <p class="px-4 py-10 text-center text-sm text-slate-500">
              Aún no hay ventas registradas en este periodo.
            </p>
          } @else {
            <ol class="divide-y divide-slate-100">
              @for (item of d.topSold; track item.productId; let i = $index) {
                <li class="flex items-center gap-3 px-4 py-2.5">
                  <span
                    class="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600"
                    >{{ i + 1 }}</span
                  >
                  <a [routerLink]="['/products', item.productId]" class="min-w-0 flex-1">
                    <span class="block truncate text-sm font-medium text-slate-800">{{
                      item.name
                    }}</span>
                    <span class="text-xs text-slate-500">{{ item.code }}</span>
                  </a>
                  <span class="text-sm font-semibold tabular-nums">{{
                    item.quantity | quantity
                  }}</span>
                </li>
              }
            </ol>
          }
        </section>
      </div>

      <section class="card mt-4">
        <div class="card-header">
          <h2 class="card-title">Últimos movimientos</h2>
          <a routerLink="/movements" class="btn btn-ghost btn-sm"
            >Ver todos <ui-icon name="chevron-right" [size]="4"
          /></a>
        </div>
        @if (d.recentMovements.length === 0) {
          <p class="px-4 py-10 text-center text-sm text-slate-500">Todavía no hay movimientos.</p>
        } @else {
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Producto</th>
                  <th>Tipo</th>
                  <th>Motivo</th>
                  <th class="num">Cantidad</th>
                  <th>Usuario</th>
                </tr>
              </thead>
              <tbody>
                @for (m of d.recentMovements; track m.id) {
                  <tr>
                    <td class="whitespace-nowrap text-slate-500">{{ m.occurredAt | dateTime }}</td>
                    <td>
                      <a
                        [routerLink]="['/products', m.productId]"
                        class="block max-w-sm truncate font-medium text-slate-800 hover:text-brand-700"
                        >{{ m.productName }}</a
                      >
                      <span class="text-xs text-slate-500">{{ m.productCode }}</span>
                    </td>
                    <td>
                      <ui-badge [tone]="typeTone[m.type]">{{ typeLabel[m.type] }}</ui-badge>
                    </td>
                    <td>{{ reasonLabel[m.reason] }}</td>
                    <td
                      class="num font-medium"
                      [class]="m.quantity < 0 ? 'text-rose-600' : 'text-emerald-700'"
                    >
                      {{ m.quantity | signedQuantity }}
                    </td>
                    <td class="text-slate-500">{{ m.userName ?? '—' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </section>
    }
  `,
})
export class DashboardPage {
  private readonly http = inject(HttpClient);

  protected readonly summary = rxResource<DashboardSummary, void>({
    stream: () => this.http.get<DashboardSummary>('/api/dashboard/summary'),
  });
  protected readonly data = computed(() => (this.summary.hasValue() ? this.summary.value() : null));

  protected readonly typeLabel = MOVEMENT_TYPE_LABELS;
  protected readonly typeTone = MOVEMENT_TYPE_TONES;
  protected readonly reasonLabel = MOVEMENT_REASON_LABELS;

  protected readonly categoryBars = computed(() => {
    const rows = this.data()?.stockByCategory ?? [];
    const max = Math.max(1, ...rows.map((row) => row.units));
    return rows.slice(0, 8).map((row) => ({ ...row, percent: (row.units / max) * 100 }));
  });

  protected readonly trend = computed(() => {
    const byDate = new Map((this.data()?.dailyMovements ?? []).map((day) => [day.date, day]));
    const days = Array.from({ length: TREND_DAYS }, (_, index) => {
      const date = new Date(Date.now() - 5 * 3_600_000 - (TREND_DAYS - 1 - index) * 86_400_000);
      const key = date.toISOString().slice(0, 10);
      const entry = byDate.get(key);
      return { date: key, inQty: entry?.inQty ?? 0, outQty: entry?.outQty ?? 0 };
    });
    const max = Math.max(1, ...days.map((day) => day.inQty + day.outQty));
    return days.map((day) => ({
      ...day,
      inPercent: (day.inQty / max) * 100,
      outPercent: (day.outQty / max) * 100,
    }));
  });

  protected readonly formatQuantity = formatQuantity;
  protected readonly formatPen = formatPen;
}
