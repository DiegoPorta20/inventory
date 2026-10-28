import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { Router, RouterLink } from '@angular/router';
import { COUNT_STATUS_LABELS, COUNT_STATUS_TONES, entries } from '../../../shared/models/labels';
import type { StockCount } from '../../../shared/models/models';
import { FORMAT_PIPES } from '../../../shared/pipes/format.pipes';
import { BadgeComponent } from '../../../shared/ui/badge.components';
import { IconComponent } from '../../../shared/ui/icon.component';
import { PageHeaderComponent } from '../../../shared/ui/layout.components';
import { PaginationComponent } from '../../../shared/ui/pagination.component';
import {
  EmptyStateComponent,
  ErrorStateComponent,
  TableSkeletonComponent,
} from '../../../shared/ui/states.components';
import { useQueryFilters } from '../../../shared/util/query-filters';
import { CountsApi } from '../counts.api';
import { openNewCountDialog } from '../new-count.dialog';

const PAGE_SIZE = 25;
const FILTER_DEFAULTS = { status: '', page: 1 };

@Component({
  selector: 'app-counts-list-page',
  imports: [
    RouterLink,
    FORMAT_PIPES,
    BadgeComponent,
    IconComponent,
    PageHeaderComponent,
    PaginationComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-page-header
      title="Conteos físicos"
      subtitle="Toma de inventario y ajustes por diferencias."
    >
      <button type="button" class="btn btn-primary" (click)="create()">
        <ui-icon name="plus" [size]="4" /> Nuevo conteo
      </button>
    </ui-page-header>

    <div class="card mb-4 p-4">
      <div class="max-w-xs">
        <label class="label" for="counts-status">Estado</label>
        <select
          id="counts-status"
          class="input"
          [value]="f().status"
          (change)="filters.patch({ status: $any($event.target).value })"
        >
          <option value="">Todos</option>
          @for (s of statusOptions; track s.value) {
            <option [value]="s.value">{{ s.label }}</option>
          }
        </select>
      </div>
    </div>

    <div class="card">
      @if (counts.isLoading()) {
        <ui-table-skeleton [rows]="6" [cols]="6" />
      } @else if (counts.error()) {
        <ui-error-state>
          <button type="button" class="btn btn-secondary" (click)="counts.reload()">
            Reintentar
          </button>
        </ui-error-state>
      } @else if (data(); as page) {
        @if (page.items.length === 0) {
          <ui-empty-state
            icon="clipboard-check"
            title="Sin conteos"
            description="Inicia un conteo físico para verificar el stock contra el sistema."
          >
            <button type="button" class="btn btn-primary" (click)="create()">
              <ui-icon name="plus" [size]="4" /> Nuevo conteo
            </button>
          </ui-empty-state>
        } @else {
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th scope="col">Estado</th>
                  <th scope="col">Nombre</th>
                  <th scope="col">Categoría</th>
                  <th scope="col">Progreso</th>
                  <th scope="col" class="num">Diferencias</th>
                  <th scope="col">Creado</th>
                  <th scope="col">Completado</th>
                </tr>
              </thead>
              <tbody>
                @for (c of page.items; track c.id) {
                  <tr class="row-link" [routerLink]="['/counts', c.id]">
                    <td>
                      <ui-badge [tone]="statusTone[c.status]">{{ statusLabel[c.status] }}</ui-badge>
                    </td>
                    <td class="max-w-xs truncate font-medium text-slate-800">{{ c.name }}</td>
                    <td class="text-slate-600">{{ c.categoryName ?? 'Todas' }}</td>
                    <td class="min-w-[10rem]">
                      <div class="flex items-center gap-2">
                        <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                          <div
                            class="h-full rounded-full bg-brand-500"
                            [style.width.%]="progress(c)"
                          ></div>
                        </div>
                        <span class="text-xs text-slate-500 tabular-nums"
                          >{{ c.summary.itemsCounted }}/{{ c.summary.itemsTotal }}</span
                        >
                      </div>
                    </td>
                    <td class="num">{{ c.summary.itemsWithDifference | quantity }}</td>
                    <td class="whitespace-nowrap text-slate-500">{{ c.createdAt | dateOnly }}</td>
                    <td class="whitespace-nowrap text-slate-500">
                      {{ c.completedAt ? (c.completedAt | dateOnly) : '—' }}
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <ui-pagination
            [page]="f().page"
            [pageSize]="pageSize"
            [total]="page.total"
            (pageChange)="filters.patch({ page: $event })"
          />
        }
      }
    </div>
  `,
})
export class CountsListPage {
  private readonly api = inject(CountsApi);
  private readonly dialog = inject(Dialog);
  private readonly router = inject(Router);

  protected readonly pageSize = PAGE_SIZE;
  protected readonly statusLabel = COUNT_STATUS_LABELS;
  protected readonly statusTone = COUNT_STATUS_TONES;
  protected readonly statusOptions = entries(COUNT_STATUS_LABELS);

  protected readonly filters = useQueryFilters(FILTER_DEFAULTS);
  protected readonly f = this.filters.value;

  protected readonly counts = rxResource({
    params: () => ({ status: this.f().status, page: this.f().page }),
    stream: ({ params }) =>
      this.api.list({ status: params.status || undefined }, params.page, PAGE_SIZE),
  });
  protected readonly data = computed(() => (this.counts.hasValue() ? this.counts.value() : null));

  protected progress(count: StockCount): number {
    const total = count.summary.itemsTotal;
    return total > 0 ? (count.summary.itemsCounted / total) * 100 : 0;
  }

  protected async create(): Promise<void> {
    const ref = openNewCountDialog(this.dialog);
    const id = await firstValueFrom(ref.closed, { defaultValue: undefined });
    if (id) void this.router.navigate(['/counts', id]);
  }
}
