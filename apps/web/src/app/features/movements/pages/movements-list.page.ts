import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { RouterLink } from '@angular/router';
import { errorMessage } from '../../../core/http/api-utils';
import {
  MOVEMENT_REASON_LABELS,
  MOVEMENT_TYPE_LABELS,
  MOVEMENT_TYPE_TONES,
  entries,
} from '../../../shared/models/labels';
import { FORMAT_PIPES } from '../../../shared/pipes/format.pipes';
import { BadgeComponent } from '../../../shared/ui/badge.components';
import { IconComponent } from '../../../shared/ui/icon.component';
import { PageHeaderComponent } from '../../../shared/ui/layout.components';
import { PaginationComponent } from '../../../shared/ui/pagination.component';
import { ProductPickerComponent } from '../../../shared/ui/product-picker.component';
import { SearchInputComponent } from '../../../shared/ui/search-input.component';
import {
  EmptyStateComponent,
  ErrorStateComponent,
  TableSkeletonComponent,
} from '../../../shared/ui/states.components';
import { ToastService } from '../../../shared/ui/toast.service';
import { useQueryFilters } from '../../../shared/util/query-filters';
import { MovementsApi, type MovementFilters } from '../movements.api';
import { openRegisterMovement } from '../register-movement.dialog';

const PAGE_SIZE = 25;

const FILTER_DEFAULTS = {
  search: '',
  productId: 0,
  type: '',
  reason: '',
  from: '',
  to: '',
  referenceType: '',
  referenceId: 0,
  page: 1,
};

@Component({
  selector: 'app-movements-list-page',
  imports: [
    RouterLink,
    FORMAT_PIPES,
    BadgeComponent,
    IconComponent,
    PageHeaderComponent,
    PaginationComponent,
    ProductPickerComponent,
    SearchInputComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-page-header
      title="Movimientos"
      subtitle="Libro mayor de entradas, salidas y ajustes de stock."
    >
      <button
        type="button"
        class="btn btn-secondary"
        [disabled]="exporting()"
        (click)="exportExcel()"
      >
        <ui-icon name="download" [size]="4" /> {{ exporting() ? 'Exportando…' : 'Exportar Excel' }}
      </button>
      <button type="button" class="btn btn-primary" (click)="register()">
        <ui-icon name="plus" [size]="4" /> Registrar movimiento
      </button>
    </ui-page-header>

    <div class="card mb-4 p-4">
      <div class="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <div class="lg:col-span-2">
          <label class="label" for="movements-search">Buscar</label>
          <ui-search-input
            [value]="f().search"
            placeholder="Código, descripción o contraparte…"
            label="Buscar movimientos"
            (search)="filters.patch({ search: $event })"
          />
        </div>

        <div>
          <label class="label" for="movements-type">Tipo</label>
          <select
            id="movements-type"
            class="input"
            [value]="f().type"
            (change)="onType($any($event.target).value)"
          >
            <option value="">Todos</option>
            @for (t of typeOptions; track t.value) {
              <option [value]="t.value">{{ t.label }}</option>
            }
          </select>
        </div>

        <div>
          <label class="label" for="movements-reason">Motivo</label>
          <select
            id="movements-reason"
            class="input"
            [value]="f().reason"
            (change)="onReason($any($event.target).value)"
          >
            <option value="">Todos</option>
            @for (r of reasonOptions; track r.value) {
              <option [value]="r.value">{{ r.label }}</option>
            }
          </select>
        </div>

        <div>
          <label class="label" for="movements-from">Desde</label>
          <input
            id="movements-from"
            class="input"
            type="date"
            [value]="f().from"
            (change)="filters.patch({ from: $any($event.target).value })"
          />
        </div>

        <div>
          <label class="label" for="movements-to">Hasta</label>
          <input
            id="movements-to"
            class="input"
            type="date"
            [value]="f().to"
            (change)="filters.patch({ to: $any($event.target).value })"
          />
        </div>

        <div class="lg:col-span-2">
          <label class="label" for="movements-product">Producto</label>
          @if (f().productId) {
            <div class="flex h-9 items-center">
              <span class="badge badge-brand">
                {{ productName() ?? 'Producto #' + f().productId }}
                <button
                  type="button"
                  class="ml-1 hover:text-brand-900"
                  aria-label="Quitar producto"
                  (click)="filters.patch({ productId: 0 })"
                >
                  <ui-icon name="x" [size]="3" />
                </button>
              </span>
            </div>
          } @else {
            <app-product-picker
              inputId="movements-product"
              (selected)="filters.patch({ productId: $event.id })"
            />
          }
        </div>
      </div>

      @if (referenceChip(); as chip) {
        <div class="mt-3 flex flex-wrap items-center gap-2">
          <span class="badge badge-info">
            {{ chip }}
            <button
              type="button"
              class="ml-1 hover:text-sky-900"
              aria-label="Quitar referencia"
              (click)="filters.patch({ referenceType: '', referenceId: 0 })"
            >
              <ui-icon name="x" [size]="3" />
            </button>
          </span>
        </div>
      }

      @if (filters.activeCount() > 0) {
        <div class="mt-3">
          <button type="button" class="btn btn-ghost btn-sm" (click)="filters.reset()">
            <ui-icon name="x" [size]="4" /> Limpiar filtros
          </button>
        </div>
      }
    </div>

    <div class="card">
      @if (movements.isLoading()) {
        <ui-table-skeleton [rows]="10" [cols]="7" />
      } @else if (movements.error()) {
        <ui-error-state>
          <button type="button" class="btn btn-secondary" (click)="movements.reload()">
            Reintentar
          </button>
        </ui-error-state>
      } @else if (data(); as page) {
        @if (page.items.length === 0) {
          <ui-empty-state
            icon="swap"
            title="Sin movimientos"
            description="No hay movimientos que coincidan con los filtros. Registra uno nuevo para comenzar."
          >
            <button type="button" class="btn btn-primary" (click)="register()">
              <ui-icon name="plus" [size]="4" /> Registrar movimiento
            </button>
          </ui-empty-state>
        } @else {
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th scope="col">Fecha</th>
                  <th scope="col">Producto</th>
                  <th scope="col">Tipo</th>
                  <th scope="col">Motivo</th>
                  <th scope="col" class="num">Cantidad</th>
                  <th scope="col" class="num">Stock resultante</th>
                  <th scope="col">Contraparte</th>
                  <th scope="col">Usuario</th>
                  <th scope="col">Nota</th>
                  <th scope="col">Ref.</th>
                </tr>
              </thead>
              <tbody>
                @for (m of page.items; track m.id) {
                  <tr>
                    <td class="whitespace-nowrap text-slate-500">{{ m.occurredAt | dateTime }}</td>
                    <td>
                      <a
                        [routerLink]="['/products', m.productId]"
                        class="block max-w-xs truncate font-medium text-slate-800 hover:text-brand-700"
                        >{{ m.productName }}</a
                      >
                      <span class="text-xs text-slate-500">{{ m.productCode }}</span>
                    </td>
                    <td>
                      <ui-badge [tone]="typeTone[m.type]">{{ typeLabel[m.type] }}</ui-badge>
                    </td>
                    <td class="whitespace-nowrap">{{ reasonLabel[m.reason] }}</td>
                    <td
                      class="num font-medium"
                      [class]="m.quantity < 0 ? 'text-rose-600' : 'text-emerald-700'"
                    >
                      {{ m.quantity | signedQuantity }}
                    </td>
                    <td class="num">{{ m.stockAfter | quantity }}</td>
                    <td
                      class="max-w-[12rem] truncate text-slate-600"
                      [title]="m.counterparty ?? ''"
                    >
                      {{ m.counterparty ?? '—' }}
                    </td>
                    <td class="whitespace-nowrap text-slate-500">{{ m.userName ?? '—' }}</td>
                    <td class="max-w-[14rem] truncate text-slate-500" [title]="m.note ?? ''">
                      {{ m.note ?? '—' }}
                    </td>
                    <td>
                      @if (m.referenceType && m.referenceId) {
                        <a
                          [routerLink]="referenceLink(m.referenceType, m.referenceId)"
                          class="text-brand-700 hover:underline"
                        >
                          {{ referenceLabel(m.referenceType, m.referenceId) }}
                        </a>
                      } @else {
                        —
                      }
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
export class MovementsListPage {
  private readonly api = inject(MovementsApi);
  private readonly dialog = inject(Dialog);
  private readonly toast = inject(ToastService);

  protected readonly pageSize = PAGE_SIZE;
  protected readonly typeLabel = MOVEMENT_TYPE_LABELS;
  protected readonly typeTone = MOVEMENT_TYPE_TONES;
  protected readonly reasonLabel = MOVEMENT_REASON_LABELS;
  protected readonly typeOptions = entries(MOVEMENT_TYPE_LABELS);
  protected readonly reasonOptions = entries(MOVEMENT_REASON_LABELS);

  protected readonly filters = useQueryFilters(FILTER_DEFAULTS);
  protected readonly f = this.filters.value;
  protected readonly exporting = signal(false);

  private readonly query = computed<MovementFilters & { page: number }>(() => {
    const v = this.f();
    return {
      search: v.search || undefined,
      productId: v.productId || undefined,
      type: v.type || undefined,
      reason: v.reason || undefined,
      from: v.from || undefined,
      to: v.to || undefined,
      referenceType: v.referenceType || undefined,
      referenceId: v.referenceId || undefined,
      page: v.page,
    };
  });

  protected readonly movements = rxResource({
    params: () => this.query(),
    stream: ({ params }) => {
      const { page, ...filters } = params;
      return this.api.list(filters, page, PAGE_SIZE);
    },
  });
  protected readonly data = computed(() =>
    this.movements.hasValue() ? this.movements.value() : null,
  );

  private readonly productResource = rxResource({
    params: () => (this.f().productId ? { id: this.f().productId } : undefined),
    stream: ({ params }) => this.api.getProduct(params.id),
  });
  protected readonly productName = computed<string | null>(() =>
    this.f().productId && this.productResource.hasValue()
      ? this.productResource.value().name
      : null,
  );

  protected readonly referenceChip = computed<string | null>(() => {
    const v = this.f();
    if (!v.referenceType || !v.referenceId) return null;
    return this.referenceLabel(v.referenceType, v.referenceId);
  });

  protected onType(value: string): void {
    this.filters.patch({ type: value });
  }

  protected onReason(value: string): void {
    this.filters.patch({ reason: value });
  }

  protected referenceLabel(referenceType: string, referenceId: number): string {
    return referenceType === 'IMPORT_ORDER'
      ? `Importación #${referenceId}`
      : `Conteo #${referenceId}`;
  }

  protected referenceLink(referenceType: string, referenceId: number): unknown[] {
    return referenceType === 'IMPORT_ORDER' ? ['/imports', referenceId] : ['/counts', referenceId];
  }

  protected async register(): Promise<void> {
    const ref = openRegisterMovement(this.dialog);
    const registered = await firstValueFrom(ref.closed, { defaultValue: false });
    if (registered) this.movements.reload();
  }

  protected async exportExcel(): Promise<void> {
    this.exporting.set(true);
    const { page: _page, ...filters } = this.query();
    try {
      const blob = await firstValueFrom(this.api.export(filters));
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'movimientos.xlsx';
      link.click();
      URL.revokeObjectURL(url);
    } catch (error: unknown) {
      this.toast.error(errorMessage(error));
    } finally {
      this.exporting.set(false);
    }
  }
}
