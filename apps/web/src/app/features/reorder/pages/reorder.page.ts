import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { errorMessage } from '../../../core/http/api-utils';
import type { Category, ReorderSuggestion } from '../../../shared/models/models';
import { FORMAT_PIPES } from '../../../shared/pipes/format.pipes';
import { StockBadgeComponent } from '../../../shared/ui/badge.components';
import { IconComponent } from '../../../shared/ui/icon.component';
import { PageHeaderComponent, StatCardComponent } from '../../../shared/ui/layout.components';
import { SearchInputComponent } from '../../../shared/ui/search-input.component';
import {
  EmptyStateComponent,
  ErrorStateComponent,
  TableSkeletonComponent,
} from '../../../shared/ui/states.components';
import { ToastService } from '../../../shared/ui/toast.service';
import { useQueryFilters } from '../../../shared/util/query-filters';
import { EquipmentApi } from '../../equipment/equipment.api';
import type { ImportNavigationState } from '../../imports/import-prefill';
import { ReorderApi } from '../reorder.api';

interface CategoryOption {
  id: number;
  label: string;
}

@Component({
  selector: 'app-reorder-page',
  imports: [
    RouterLink,
    FORMAT_PIPES,
    StockBadgeComponent,
    IconComponent,
    PageHeaderComponent,
    StatCardComponent,
    SearchInputComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-page-header
      title="Reposición"
      subtitle="Qué comprar según el stock mínimo y lo que viene en camino."
    >
      <button
        type="button"
        class="btn btn-secondary"
        [disabled]="exporting() || rows().length === 0"
        (click)="exportExcel()"
      >
        <ui-icon name="download" [size]="4" /> {{ exporting() ? 'Exportando…' : 'Exportar Excel' }}
      </button>
      <button
        type="button"
        class="btn btn-primary"
        [disabled]="selectedCount() === 0"
        (click)="createImport()"
      >
        <ui-icon name="cart" [size]="4" /> Crear importación con la selección
      </button>
    </ui-page-header>

    <div class="mb-4 grid gap-4 sm:grid-cols-3">
      <ui-stat-card label="Productos a reponer" [value]="summary().total | quantity" />
      <ui-stat-card
        label="Sin stock"
        [value]="summary().outOfStock | quantity"
        [tone]="summary().outOfStock > 0 ? 'danger' : 'neutral'"
      />
      <ui-stat-card
        label="Costo estimado"
        [value]="summary().estimatedCostUsd | usd"
        hint="Según costos registrados"
      />
    </div>

    <div class="card">
      <div class="flex flex-wrap items-center gap-3 border-b border-slate-100 p-3">
        <div class="min-w-56 flex-1">
          <ui-search-input
            [value]="filters.value().search"
            placeholder="Buscar por código o descripción…"
            (search)="filters.patch({ search: $event })"
          />
        </div>
        <select
          class="input w-auto"
          aria-label="Categoría"
          [value]="filters.value().categoryId"
          (change)="filters.patch({ categoryId: +$any($event.target).value })"
        >
          <option [value]="0">Todas las categorías</option>
          @for (c of categoryOptions(); track c.id) {
            <option [value]="c.id">{{ c.label }}</option>
          }
        </select>
        <select
          class="input w-auto"
          aria-label="Equipo"
          [value]="filters.value().equipmentId"
          (change)="filters.patch({ equipmentId: +$any($event.target).value })"
        >
          <option [value]="0">Todos los equipos</option>
          @for (e of equipment(); track e.id) {
            <option [value]="e.id">{{ e.name }}</option>
          }
        </select>
        <label class="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            class="h-4 w-4 rounded border-slate-300"
            [checked]="filters.value().onlyOutOfStock"
            (change)="filters.patch({ onlyOutOfStock: $any($event.target).checked })"
          />
          Solo sin stock
        </label>
        @if (filters.activeCount() > 0) {
          <button type="button" class="btn btn-ghost btn-sm" (click)="filters.reset()">
            Limpiar
          </button>
        }
      </div>

      @if (report.isLoading()) {
        <ui-table-skeleton [rows]="8" [cols]="7" />
      } @else if (report.error()) {
        <ui-error-state [message]="errorText()">
          <button type="button" class="btn btn-secondary" (click)="report.reload()">
            Reintentar
          </button>
        </ui-error-state>
      } @else if (rows().length === 0) {
        <ui-empty-state
          icon="check"
          title="Nada por reponer"
          description="Ningún producto está por debajo de su stock mínimo con los filtros actuales. Si aún no configuras stock mínimo, hazlo para recibir sugerencias."
        >
          <a
            class="btn btn-secondary"
            routerLink="/products"
            [queryParams]="{ stockStatus: 'UNCONFIGURED' }"
          >
            Configurar stock mínimo
          </a>
        </ui-empty-state>
      } @else {
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th class="w-10">
                  <input
                    type="checkbox"
                    class="h-4 w-4 rounded border-slate-300"
                    aria-label="Seleccionar todo"
                    [checked]="allSelected()"
                    [indeterminate]="someSelected()"
                    (change)="toggleAll($any($event.target).checked)"
                  />
                </th>
                <th>Código</th>
                <th>Producto</th>
                <th>Categoría</th>
                <th class="num">Stock / mín</th>
                <th class="num">En camino</th>
                <th class="num">Sugerido</th>
                <th class="num">Costo unit.</th>
                <th class="num">Costo estimado</th>
              </tr>
            </thead>
            <tbody>
              @for (row of rows(); track row.product.id) {
                <tr [class.bg-brand-50]="isSelected(row.product.id)">
                  <td>
                    <input
                      type="checkbox"
                      class="h-4 w-4 rounded border-slate-300"
                      [attr.aria-label]="'Seleccionar ' + row.product.name"
                      [checked]="isSelected(row.product.id)"
                      (change)="toggle(row.product.id, $any($event.target).checked)"
                    />
                  </td>
                  <td>
                    <a
                      class="row-link font-medium text-slate-800 hover:text-brand-700"
                      [routerLink]="['/products', row.product.id]"
                    >
                      {{ row.product.code }}
                    </a>
                  </td>
                  <td>
                    <span class="block max-w-xs truncate text-slate-800">{{
                      row.product.name
                    }}</span>
                    <ui-stock-badge [status]="row.product.stockStatus" />
                  </td>
                  <td class="text-slate-600">{{ row.product.categoryName ?? '—' }}</td>
                  <td class="num">
                    {{ row.product.stock | quantity }} / {{ row.product.minStock | quantity }}
                  </td>
                  <td class="num">{{ row.product.incomingQty | quantity }}</td>
                  <td class="num">
                    <input
                      class="input w-24 text-right"
                      type="number"
                      min="0"
                      step="1"
                      [attr.aria-label]="'Cantidad sugerida de ' + row.product.name"
                      [value]="qtyOf(row)"
                      (input)="setQty(row.product.id, $any($event.target).value)"
                    />
                  </td>
                  <td class="num text-slate-600">{{ row.product.costUsd | usd: true }}</td>
                  <td class="num font-medium">{{ estimated(row) | usd }}</td>
                </tr>
              }
            </tbody>
            <tfoot>
              <tr class="border-t border-slate-200 font-semibold">
                <td colspan="6"></td>
                <td class="num">Total selección</td>
                <td></td>
                <td class="num">{{ selectedCost() | usd }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      }
    </div>
  `,
})
export class ReorderPage {
  private readonly api = inject(ReorderApi);
  private readonly equipmentApi = inject(EquipmentApi);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly filters = useQueryFilters({
    search: '',
    categoryId: 0,
    equipmentId: 0,
    onlyOutOfStock: false,
  });

  protected readonly report = rxResource({
    params: () => this.filters.value(),
    stream: ({ params }) =>
      this.api.suggestions({
        search: params.search || undefined,
        categoryId: params.categoryId || undefined,
        equipmentId: params.equipmentId || undefined,
        onlyOutOfStock: params.onlyOutOfStock || undefined,
      }),
  });

  protected readonly rows = computed(() =>
    this.report.hasValue() ? this.report.value().items : [],
  );
  protected readonly summary = computed(
    () => this.report.value()?.summary ?? { total: 0, outOfStock: 0, estimatedCostUsd: 0 },
  );
  protected readonly errorText = computed(() => errorMessage(this.report.error()));

  private readonly categoriesResource = rxResource({ stream: () => this.api.categories() });
  protected readonly categoryOptions = computed(() =>
    this.buildCategoryOptions(
      this.categoriesResource.hasValue() ? this.categoriesResource.value() : [],
    ),
  );

  private readonly equipmentResource = rxResource({ stream: () => this.equipmentApi.list() });
  protected readonly equipment = computed(() =>
    this.equipmentResource.hasValue() ? this.equipmentResource.value() : [],
  );

  /** Per-product edited quantities, keyed by product id. */
  private readonly qtyOverride = signal<Record<number, number>>({});
  private readonly selection = signal<Set<number>>(new Set());
  protected readonly exporting = signal(false);

  protected readonly selectedCount = computed(() => this.selection().size);
  protected readonly allSelected = computed(
    () =>
      this.rows().length > 0 && this.rows().every((row) => this.selection().has(row.product.id)),
  );
  protected readonly someSelected = computed(
    () => this.selection().size > 0 && !this.allSelected(),
  );

  protected readonly selectedCost = computed(() =>
    this.rows()
      .filter((row) => this.selection().has(row.product.id))
      .reduce((sum, row) => sum + this.estimated(row), 0),
  );

  protected qtyOf(row: ReorderSuggestion): number {
    const override = this.qtyOverride()[row.product.id];
    return override ?? row.suggestedQty;
  }

  protected estimated(row: ReorderSuggestion): number {
    return (row.product.costUsd ?? 0) * this.qtyOf(row);
  }

  protected setQty(productId: number, value: string): void {
    const next = Math.max(0, Math.floor(Number(value) || 0));
    this.qtyOverride.update((map) => ({ ...map, [productId]: next }));
  }

  protected isSelected(productId: number): boolean {
    return this.selection().has(productId);
  }

  protected toggle(productId: number, checked: boolean): void {
    this.selection.update((set) => {
      const next = new Set(set);
      if (checked) next.add(productId);
      else next.delete(productId);
      return next;
    });
  }

  protected toggleAll(checked: boolean): void {
    this.selection.set(checked ? new Set(this.rows().map((row) => row.product.id)) : new Set());
  }

  protected exportExcel(): void {
    if (this.exporting()) return;
    this.exporting.set(true);
    const f = this.filters.value();
    this.api
      .export({
        search: f.search || undefined,
        categoryId: f.categoryId || undefined,
        equipmentId: f.equipmentId || undefined,
        onlyOutOfStock: f.onlyOutOfStock || undefined,
      })
      .subscribe({
        next: (blob) => {
          this.exporting.set(false);
          this.downloadBlob(blob, 'reposicion.xlsx');
        },
        error: (error: unknown) => {
          this.exporting.set(false);
          this.toast.error(errorMessage(error));
        },
      });
  }

  protected createImport(): void {
    const items = this.rows()
      .filter((row) => this.selection().has(row.product.id))
      .map((row) => ({
        productId: row.product.id,
        code: row.product.code,
        name: row.product.name,
        unit: row.product.unit,
        quantityOrdered: Math.max(1, this.qtyOf(row)),
        unitCostUsd: row.product.costUsd,
      }));
    if (items.length === 0) return;
    const state: ImportNavigationState = { prefill: { items } };
    void this.router.navigate(['/imports/new'], { state });
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private buildCategoryOptions(categories: Category[]): CategoryOption[] {
    const byParent = new Map<number | null, Category[]>();
    for (const category of categories) {
      const list = byParent.get(category.parentId) ?? [];
      list.push(category);
      byParent.set(category.parentId, list);
    }
    const sortFn = (a: Category, b: Category) =>
      a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);
    const options: CategoryOption[] = [];
    const walk = (parentId: number | null, depth: number): void => {
      for (const category of (byParent.get(parentId) ?? []).sort(sortFn)) {
        options.push({ id: category.id, label: `${'\u00A0\u00A0'.repeat(depth)}${category.name}` });
        walk(category.id, depth + 1);
      }
    };
    walk(null, 0);
    return options;
  }
}
