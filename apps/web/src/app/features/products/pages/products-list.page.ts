import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { errorMessage } from '../../../core/http/api-utils';
import { UNIT_LABELS } from '../../../shared/models/labels';
import type {
  ProductListItem,
  StockStatusFilter,
  UnitOfMeasure,
} from '../../../shared/models/models';
import { FORMAT_PIPES } from '../../../shared/pipes/format.pipes';
import { useQueryFilters } from '../../../shared/util/query-filters';
import { StockBadgeComponent } from '../../../shared/ui/badge.components';
import { IconComponent } from '../../../shared/ui/icon.component';
import { PageHeaderComponent } from '../../../shared/ui/layout.components';
import { PaginationComponent } from '../../../shared/ui/pagination.component';
import {
  EmptyStateComponent,
  ErrorStateComponent,
  TableSkeletonComponent,
} from '../../../shared/ui/states.components';
import { ToastService } from '../../../shared/ui/toast.service';
import { openRegisterMovement } from '../../movements/register-movement.dialog';
import {
  ProductsApi,
  type ProductListFilters,
  type ProductSortBy,
  type SortDirection,
} from '../products.api';
import { openBulkDialog, type BulkAction } from '../components/bulk-action.dialog';
import {
  ProductFiltersComponent,
  type ProductFilterValues,
} from '../components/product-filters.component';

const SORT_COLUMNS: ProductSortBy[] = ['code', 'name', 'stock', 'updatedAt', 'cost'];

@Component({
  selector: 'app-products-list-page',
  imports: [
    RouterLink,
    FORMAT_PIPES,
    StockBadgeComponent,
    IconComponent,
    PageHeaderComponent,
    PaginationComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
    ProductFiltersComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-page-header title="Productos" subtitle="Inventario, stock y clasificación.">
      <button
        type="button"
        class="btn btn-secondary"
        [disabled]="exporting()"
        (click)="exportExcel()"
      >
        <ui-icon name="download" [size]="4" /> {{ exporting() ? 'Exportando…' : 'Exportar Excel' }}
      </button>
      <button type="button" class="btn btn-secondary" (click)="registerMovement()">
        <ui-icon name="swap" [size]="4" /> Registrar movimiento
      </button>
      <a class="btn btn-primary" routerLink="/products/new">
        <ui-icon name="plus" [size]="4" /> Nuevo producto
      </a>
    </ui-page-header>

    <app-product-filters
      class="block"
      [values]="filterValues()"
      [categories]="categories.value() ?? []"
      [equipment]="equipment.value() ?? []"
      [imports]="imports.value()?.items ?? []"
      (filterChange)="onFilterChange($event)"
      (clear)="filters.reset()"
    />

    <div class="card mt-4">
      @if (products.isLoading()) {
        <ui-table-skeleton [rows]="10" [cols]="7" />
      } @else if (products.error()) {
        <ui-error-state>
          <button type="button" class="btn btn-secondary" (click)="products.reload()">
            Reintentar
          </button>
        </ui-error-state>
      } @else if (items().length === 0) {
        <ui-empty-state
          icon="box"
          title="Sin productos"
          [description]="
            filters.activeCount() > 0
              ? 'Ningún producto coincide con los filtros aplicados.'
              : 'Aún no hay productos registrados.'
          "
        >
          @if (filters.activeCount() > 0) {
            <button type="button" class="btn btn-secondary" (click)="filters.reset()">
              Limpiar filtros
            </button>
          }
          <a class="btn btn-primary" routerLink="/products/new">Nuevo producto</a>
        </ui-empty-state>
      } @else {
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th class="w-10">
                  <input
                    type="checkbox"
                    aria-label="Seleccionar todos"
                    [checked]="allSelected()"
                    [indeterminate]="someSelected()"
                    (change)="toggleAll($any($event.target).checked)"
                  />
                </th>
                <th [attr.aria-sort]="ariaSort('code')">
                  <button type="button" class="flex items-center gap-1" (click)="sortBy('code')">
                    Código {{ sortIcon('code') }}
                  </button>
                </th>
                <th [attr.aria-sort]="ariaSort('name')">
                  <button type="button" class="flex items-center gap-1" (click)="sortBy('name')">
                    Descripción {{ sortIcon('name') }}
                  </button>
                </th>
                <th class="num" [attr.aria-sort]="ariaSort('stock')">
                  <button
                    type="button"
                    class="ml-auto flex items-center gap-1"
                    (click)="sortBy('stock')"
                  >
                    Stock {{ sortIcon('stock') }}
                  </button>
                </th>
                <th class="num">Mín.</th>
                <th class="num">En camino</th>
                <th>Estado</th>
                <th class="num" [attr.aria-sort]="ariaSort('cost')">
                  <button
                    type="button"
                    class="ml-auto flex items-center gap-1"
                    (click)="sortBy('cost')"
                  >
                    Costo USD {{ sortIcon('cost') }}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              @for (product of items(); track product.id) {
                <tr
                  class="row-link"
                  [class]="rowBorder(product.stockStatus)"
                  (click)="openDetail(product, $event)"
                >
                  <td (click)="$event.stopPropagation()">
                    <input
                      type="checkbox"
                      [attr.aria-label]="'Seleccionar ' + product.code"
                      [checked]="selection().has(product.id)"
                      (change)="toggleOne(product.id, $any($event.target).checked)"
                    />
                  </td>
                  <td>
                    <span class="font-medium text-slate-800">{{ product.code }}</span>
                    @if (!product.isActive) {
                      <span class="ml-1 badge badge-neutral">Inactivo</span>
                    }
                  </td>
                  <td>
                    <span class="block max-w-sm truncate font-medium text-slate-800">{{
                      product.name
                    }}</span>
                    <span class="text-xs text-slate-500">{{
                      product.categoryName ?? 'Sin categoría'
                    }}</span>
                  </td>
                  <td class="num">
                    {{ product.stock | quantity }}
                    <span class="text-xs text-slate-400">{{ unitLabels[product.unit] }}</span>
                  </td>
                  <td class="num">{{ product.minStock ? (product.minStock | quantity) : '—' }}</td>
                  <td class="num">
                    {{ product.incomingQty ? (product.incomingQty | quantity) : '—' }}
                  </td>
                  <td><ui-stock-badge [status]="product.stockStatus" /></td>
                  <td class="num">{{ product.costUsd | usd }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <ui-pagination
          [page]="page()"
          [pageSize]="pageSize()"
          [total]="total()"
          (pageChange)="filters.patch({ page: $event })"
        />
      }
    </div>

    @if (selection().size > 0) {
      <div
        class="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-2px_8px_rgba(15,23,42,0.08)] backdrop-blur"
      >
        <div class="mx-auto flex max-w-7xl flex-wrap items-center gap-3">
          <span class="text-sm font-medium text-slate-700">
            {{ selection().size }} seleccionado(s)
          </span>
          <div class="flex flex-wrap gap-2">
            <button type="button" class="btn btn-secondary btn-sm" (click)="bulk('category')">
              <ui-icon name="tag" [size]="4" /> Asignar categoría
            </button>
            <button type="button" class="btn btn-secondary btn-sm" (click)="bulk('stockLevels')">
              <ui-icon name="box" [size]="4" /> Definir stock mínimo / reposición
            </button>
            <button type="button" class="btn btn-secondary btn-sm" (click)="bulk('activation')">
              <ui-icon name="refresh" [size]="4" /> Activar / desactivar
            </button>
          </div>
          <button type="button" class="btn btn-ghost btn-sm ml-auto" (click)="clearSelection()">
            Cancelar
          </button>
        </div>
      </div>
      <div class="h-16"></div>
    }
  `,
})
export class ProductsListPage {
  private readonly api = inject(ProductsApi);
  private readonly dialog = inject(Dialog);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly unitLabels = UNIT_LABELS;

  protected readonly filters = useQueryFilters({
    search: '',
    categoryId: 0,
    unit: '',
    stockStatus: '',
    equipmentId: 0,
    importOrderId: 0,
    active: 'active',
    internalCode: '',
    page: 1,
    pageSize: 25,
    sortBy: 'code',
    sortDirection: 'asc',
  });

  protected readonly selection = signal<Set<number>>(new Set());
  protected readonly exporting = signal(false);

  protected readonly filterValues = computed<ProductFilterValues>(() => {
    const v = this.filters.value();
    return {
      search: v.search,
      categoryId: v.categoryId,
      unit: v.unit,
      stockStatus: v.stockStatus,
      equipmentId: v.equipmentId,
      importOrderId: v.importOrderId,
      active: v.active,
      internalCode: v.internalCode,
    };
  });

  private readonly requestFilters = computed<ProductListFilters>(() =>
    this.toRequest(this.filters.value()),
  );

  protected readonly products = rxResource({
    params: () => this.requestFilters(),
    stream: ({ params }) => this.api.list(params),
  });

  protected readonly categories = rxResource({ stream: () => this.api.listCategories() });
  protected readonly equipment = rxResource({ stream: () => this.api.listEquipment() });
  protected readonly imports = rxResource({ stream: () => this.api.listImports() });

  protected readonly items = computed(() =>
    this.products.hasValue() ? this.products.value().items : [],
  );
  protected readonly total = computed(() =>
    this.products.hasValue() ? this.products.value().total : 0,
  );
  protected readonly page = computed(() => this.filters.value().page);
  protected readonly pageSize = computed(() => this.filters.value().pageSize);

  protected readonly allSelected = computed(() => {
    const items = this.items();
    return items.length > 0 && items.every((product) => this.selection().has(product.id));
  });
  protected readonly someSelected = computed(() => {
    const selected = this.selection();
    return this.items().some((product) => selected.has(product.id)) && !this.allSelected();
  });

  private toRequest(v: ReturnType<typeof this.filters.value>): ProductListFilters {
    return {
      search: v.search || undefined,
      categoryId: v.categoryId || undefined,
      unit: (v.unit as UnitOfMeasure) || undefined,
      stockStatus: (v.stockStatus as StockStatusFilter) || undefined,
      equipmentId: v.equipmentId || undefined,
      importOrderId: v.importOrderId || undefined,
      isActive: v.active === 'all' ? undefined : v.active === 'active',
      isInternalCode: v.internalCode === '' ? undefined : v.internalCode === 'true',
      sortBy: v.sortBy as ProductSortBy,
      sortDirection: v.sortDirection as SortDirection,
      page: v.page,
      pageSize: v.pageSize,
    };
  }

  protected onFilterChange(change: Partial<ProductFilterValues>): void {
    this.clearSelection();
    this.filters.patch(change);
  }

  protected sortBy(column: ProductSortBy): void {
    if (!SORT_COLUMNS.includes(column)) return;
    const current = this.filters.value();
    const direction: SortDirection =
      current.sortBy === column && current.sortDirection === 'asc' ? 'desc' : 'asc';
    this.filters.patch({ sortBy: column, sortDirection: direction });
  }

  protected ariaSort(column: ProductSortBy): 'ascending' | 'descending' | 'none' {
    const current = this.filters.value();
    if (current.sortBy !== column) return 'none';
    return current.sortDirection === 'asc' ? 'ascending' : 'descending';
  }

  protected sortIcon(column: ProductSortBy): string {
    const current = this.filters.value();
    if (current.sortBy !== column) return '';
    return current.sortDirection === 'asc' ? '▲' : '▼';
  }

  protected rowBorder(status: StockStatusFilter): string {
    if (status === 'OUT') return 'border-l-2 border-l-rose-400';
    if (status === 'LOW') return 'border-l-2 border-l-amber-400';
    return '';
  }

  protected toggleAll(checked: boolean): void {
    this.selection.update((current) => {
      const next = new Set(current);
      for (const product of this.items()) {
        if (checked) next.add(product.id);
        else next.delete(product.id);
      }
      return next;
    });
  }

  protected toggleOne(id: number, checked: boolean): void {
    this.selection.update((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  protected clearSelection(): void {
    this.selection.set(new Set());
  }

  protected openDetail(product: ProductListItem, event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.closest('input, a, button')) return;
    void this.router.navigate(['/products', product.id]);
  }

  protected async registerMovement(): Promise<void> {
    const registered = await firstValueFrom(openRegisterMovement(this.dialog).closed);
    if (registered) this.products.reload();
  }

  protected async bulk(action: BulkAction): Promise<void> {
    const ids = [...this.selection()];
    if (ids.length === 0) return;
    const applied = await firstValueFrom(
      openBulkDialog(this.dialog, { action, ids, categories: this.categories.value() ?? [] })
        .closed,
    );
    if (applied) {
      this.clearSelection();
      this.products.reload();
    }
  }

  protected exportExcel(): void {
    if (this.exporting()) return;
    this.exporting.set(true);
    const { page, pageSize, ...rest } = this.requestFilters();
    this.api.export(rest).subscribe({
      next: (blob) => {
        this.exporting.set(false);
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'inventario.xlsx';
        anchor.click();
        URL.revokeObjectURL(url);
      },
      error: (error: unknown) => {
        this.exporting.set(false);
        this.toast.error(errorMessage(error));
      },
    });
  }
}
