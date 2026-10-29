import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { errorMessage } from '../../../core/http/api-utils';
import { entries, IMPORT_STATUS_LABELS, IMPORT_STATUS_TONES } from '../../../shared/models/labels';
import type { ImportStatus } from '../../../shared/models/models';
import { FORMAT_PIPES } from '../../../shared/pipes/format.pipes';
import { BadgeComponent } from '../../../shared/ui/badge.components';
import { IconComponent } from '../../../shared/ui/icon.component';
import { PageHeaderComponent } from '../../../shared/ui/layout.components';
import { PaginationComponent } from '../../../shared/ui/pagination.component';
import { SearchInputComponent } from '../../../shared/ui/search-input.component';
import {
  EmptyStateComponent,
  ErrorStateComponent,
  TableSkeletonComponent,
} from '../../../shared/ui/states.components';
import { useQueryFilters } from '../../../shared/util/query-filters';
import { SuppliersApi } from '../../suppliers/suppliers.api';
import { ImportsApi } from '../imports.api';
import { DateRangeFilterComponent } from '../../../shared/ui/date-range-filter.component';

@Component({
  selector: 'app-imports-list-page',
  imports: [
    DateRangeFilterComponent,
    RouterLink,
    FORMAT_PIPES,
    BadgeComponent,
    IconComponent,
    PageHeaderComponent,
    PaginationComponent,
    SearchInputComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-page-header title="Importaciones" subtitle="Órdenes de compra y envíos de los proveedores.">
      <a class="btn btn-primary magnetic" routerLink="/imports/new">
        <ui-icon name="plus" [size]="4" /> Nueva importación
      </a>
    </ui-page-header>

    <div class="card">
      <div class="flex flex-wrap items-end gap-3 border-b border-slate-100 p-3">
        <div class="min-w-56 flex-1">
          <ui-search-input
            [value]="filters.value().search"
            placeholder="Buscar por número, referencia o producto…"
            (search)="filters.patch({ search: $event })"
          />
        </div>
        <select
          class="input input-pill w-auto"
          aria-label="Estado"
          [value]="filters.value().status"
          (change)="filters.patch({ status: $any($event.target).value })"
        >
          <option value="">Todos los estados</option>
          @for (s of statusOptions; track s.value) {
            <option [value]="s.value">{{ s.label }}</option>
          }
        </select>
        <select
          class="input input-pill w-auto"
          aria-label="Proveedor"
          [value]="filters.value().supplierId"
          (change)="filters.patch({ supplierId: +$any($event.target).value })"
        >
          <option [value]="0">Todos los proveedores</option>
          @for (sup of suppliers(); track sup.id) {
            <option [value]="sup.id">{{ sup.name }}</option>
          }
        </select>
        <div class="flex w-64 flex-col text-xs text-slate-500">
          <span class="mb-1">Fechas</span>
          <ui-date-range
            ariaLabel="Fechas de la importación"
            [from]="filters.value().from"
            [to]="filters.value().to"
            (rangeChange)="filters.patch($event)"
          />
        </div>
        @if (filters.activeCount() > 0) {
          <button type="button" class="btn btn-ghost btn-sm" (click)="filters.reset()">
            Limpiar
          </button>
        }
      </div>

      @if (orders.isLoading()) {
        <ui-table-skeleton [rows]="8" [cols]="6" />
      } @else if (orders.error()) {
        <ui-error-state [message]="errorText()">
          <button type="button" class="btn btn-secondary" (click)="orders.reload()">
            Reintentar
          </button>
        </ui-error-state>
      } @else if (page(); as p) {
        @if (p.items.length === 0) {
          <ui-empty-state
            icon="truck"
            title="No hay importaciones"
            description="Registra una importación para controlar lo que compras y recibes."
          >
            <a class="btn btn-primary" routerLink="/imports/new">
              <ui-icon name="plus" [size]="4" /> Nueva importación
            </a>
          </ui-empty-state>
        } @else {
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>N.º</th>
                  <th>Proveedor</th>
                  <th>Estado</th>
                  <th>Pedido</th>
                  <th>Esperado</th>
                  <th>Recibido</th>
                  <th class="num">Líneas</th>
                  <th class="num">Ped. / Rec.</th>
                  <th class="num">Costo S/</th>
                </tr>
              </thead>
              <tbody>
                @for (o of p.items; track o.id) {
                  <tr class="row-link" [routerLink]="['/imports', o.id]">
                    <td class="font-medium text-slate-800">#{{ o.number }}</td>
                    <td class="text-slate-600">{{ o.supplierName ?? '—' }}</td>
                    <td>
                      <ui-badge [tone]="statusTone[o.status]">{{ statusLabel[o.status] }}</ui-badge>
                    </td>
                    <td class="whitespace-nowrap text-slate-500">{{ o.orderedAt | dateOnly }}</td>
                    <td class="whitespace-nowrap text-slate-500">{{ o.expectedAt | dateOnly }}</td>
                    <td class="whitespace-nowrap text-slate-500">{{ o.receivedAt | dateOnly }}</td>
                    <td class="num">{{ o.itemCount | quantity }}</td>
                    <td class="num">
                      {{ o.totalOrdered | quantity }} / {{ o.totalReceived | quantity }}
                    </td>
                    <td class="num font-medium">{{ o.totalCostPen | pen }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <ui-pagination
            [page]="p.page"
            [pageSize]="p.pageSize"
            [total]="p.total"
            (pageChange)="filters.patch({ page: $event })"
          />
        }
      }
    </div>
  `,
})
export class ImportsListPage {
  private readonly api = inject(ImportsApi);
  private readonly suppliersApi = inject(SuppliersApi);

  protected readonly statusOptions = entries(IMPORT_STATUS_LABELS);
  protected readonly statusLabel = IMPORT_STATUS_LABELS;
  protected readonly statusTone = IMPORT_STATUS_TONES;

  protected readonly filters = useQueryFilters({
    search: '',
    status: '',
    supplierId: 0,
    from: '',
    to: '',
    page: 1,
    pageSize: 25,
  });

  private readonly suppliersResource = rxResource({
    stream: () => this.suppliersApi.list({}),
  });
  protected readonly suppliers = computed(() =>
    this.suppliersResource.hasValue() ? this.suppliersResource.value() : [],
  );

  protected readonly orders = rxResource({
    params: () => this.filters.value(),
    stream: ({ params }) =>
      this.api.list({
        search: params.search || undefined,
        status: (params.status || undefined) as ImportStatus | undefined,
        supplierId: params.supplierId || undefined,
        from: params.from || undefined,
        to: params.to || undefined,
        page: params.page,
        pageSize: params.pageSize,
      }),
  });

  protected readonly page = computed(() => (this.orders.hasValue() ? this.orders.value() : null));
  protected readonly errorText = computed(() => errorMessage(this.orders.error()));
}
