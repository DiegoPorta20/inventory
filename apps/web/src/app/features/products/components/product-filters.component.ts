import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { STOCK_STATUS_LABELS, UNIT_LABELS } from '../../../shared/models/labels';
import type {
  Category,
  CostCenter,
  EquipmentModel,
  ImportOrderSummary,
  StockStatusFilter,
  UnitOfMeasure,
} from '../../../shared/models/models';
import { IconComponent } from '../../../shared/ui/icon.component';
import { SearchInputComponent } from '../../../shared/ui/search-input.component';
import { buildCategoryOptions, type CategoryOption } from '../category-options';

export interface ProductFilterValues {
  search: string;
  categoryId: number;
  costCenterId: number;
  unit: string;
  stockStatus: string;
  equipmentId: number;
  importOrderId: number;
  active: string;
  internalCode: string;
  hasPrice: string;
  consignment: string;
}

interface Chip {
  key: keyof ProductFilterValues;
  label: string;
}

const UNITS: UnitOfMeasure[] = ['UNIT', 'PCS', 'SET'];
const STOCK_STATUSES: StockStatusFilter[] = ['OUT', 'LOW', 'OK', 'UNCONFIGURED'];

@Component({
  selector: 'app-product-filters',
  imports: [SearchInputComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card p-4">
      <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div class="md:col-span-2 xl:col-span-2">
          <ui-search-input
            placeholder="Buscar por código o descripción…"
            label="Buscar productos"
            [value]="values().search"
            (search)="patch({ search: $event })"
          />
        </div>

        <select
          class="input"
          aria-label="Categoría"
          [value]="asString(values().categoryId)"
          (change)="patchNum('categoryId', $any($event.target).value)"
        >
          <option value="">Todas las categorías</option>
          @for (option of categoryOptions(); track option.id) {
            <option [value]="option.id">{{ indent(option) }}{{ option.label }}</option>
          }
        </select>

        <select
          class="input"
          aria-label="Centro de costo"
          [value]="asString(values().costCenterId)"
          (change)="patchNum('costCenterId', $any($event.target).value)"
        >
          <option value="">Todos los centros de costo</option>
          @for (center of costCenters(); track center.id) {
            <option [value]="center.id">{{ center.name }}</option>
          }
        </select>

        <select
          class="input"
          aria-label="Unidad"
          [value]="values().unit"
          (change)="patch({ unit: $any($event.target).value })"
        >
          <option value="">Todas las unidades</option>
          @for (unit of units; track unit) {
            <option [value]="unit">{{ unitLabels[unit] }}</option>
          }
        </select>

        <select
          class="input"
          aria-label="Estado de stock"
          [value]="values().stockStatus"
          (change)="patch({ stockStatus: $any($event.target).value })"
        >
          <option value="">Todos los estados</option>
          @for (status of stockStatuses; track status) {
            <option [value]="status">{{ stockStatusLabels[status] }}</option>
          }
        </select>

        <select
          class="input"
          aria-label="Equipo compatible"
          [value]="asString(values().equipmentId)"
          (change)="patchNum('equipmentId', $any($event.target).value)"
        >
          <option value="">Todos los equipos</option>
          @for (model of equipment(); track model.id) {
            <option [value]="model.id">{{ model.name }}</option>
          }
        </select>

        <select
          class="input"
          aria-label="Importación"
          [value]="asString(values().importOrderId)"
          (change)="patchNum('importOrderId', $any($event.target).value)"
        >
          <option value="">Todas las importaciones</option>
          @for (order of imports(); track order.id) {
            <option [value]="order.id">#{{ order.number }}</option>
          }
        </select>

        <select
          class="input"
          aria-label="Estado activo"
          [value]="values().active"
          (change)="patch({ active: $any($event.target).value })"
        >
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
          <option value="all">Todos</option>
        </select>

        <select
          class="input"
          aria-label="Tipo de código"
          [value]="values().internalCode"
          (change)="patch({ internalCode: $any($event.target).value })"
        >
          <option value="">Todos los códigos</option>
          <option value="true">Código interno</option>
          <option value="false">Código de proveedor</option>
        </select>

        <select
          class="input"
          aria-label="Precio"
          [value]="values().hasPrice"
          (change)="patch({ hasPrice: $any($event.target).value })"
        >
          <option value="">Precio: todos</option>
          <option value="true">Con precio</option>
          <option value="false">Sin precio</option>
        </select>

        <select
          class="input"
          aria-label="Consignación"
          [value]="values().consignment"
          (change)="patch({ consignment: $any($event.target).value })"
        >
          <option value="">Consignación: todos</option>
          <option value="true">Solo consignación</option>
        </select>
      </div>

      @if (chips().length > 0) {
        <div class="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          @for (chip of chips(); track chip.key) {
            <span class="badge badge-brand">
              {{ chip.label }}
              <button
                type="button"
                class="ml-0.5 text-brand-600 hover:text-brand-800"
                [attr.aria-label]="'Quitar filtro ' + chip.label"
                (click)="clearOne(chip.key)"
              >
                <ui-icon name="x" [size]="3" />
              </button>
            </span>
          }
          <button type="button" class="btn btn-ghost btn-sm" (click)="clear.emit()">
            Limpiar filtros
          </button>
        </div>
      }
    </div>
  `,
})
export class ProductFiltersComponent {
  readonly values = input.required<ProductFilterValues>();
  readonly categories = input<Category[]>([]);
  readonly costCenters = input<CostCenter[]>([]);
  readonly equipment = input<EquipmentModel[]>([]);
  readonly imports = input<ImportOrderSummary[]>([]);

  readonly filterChange = output<Partial<ProductFilterValues>>();
  readonly clear = output<void>();

  protected readonly units = UNITS;
  protected readonly stockStatuses = STOCK_STATUSES;
  protected readonly unitLabels = UNIT_LABELS;
  protected readonly stockStatusLabels = STOCK_STATUS_LABELS;

  protected readonly categoryOptions = computed(() => buildCategoryOptions(this.categories()));

  protected readonly chips = computed<Chip[]>(() => {
    const v = this.values();
    const chips: Chip[] = [];
    if (v.categoryId) {
      const name = this.categories().find((c) => c.id === v.categoryId)?.name;
      if (name) chips.push({ key: 'categoryId', label: name });
    }
    if (v.costCenterId) {
      const name = this.costCenters().find((c) => c.id === v.costCenterId)?.name;
      if (name) chips.push({ key: 'costCenterId', label: name });
    }
    if (v.unit) chips.push({ key: 'unit', label: this.unitLabels[v.unit as UnitOfMeasure] });
    if (v.stockStatus)
      chips.push({
        key: 'stockStatus',
        label: this.stockStatusLabels[v.stockStatus as StockStatusFilter],
      });
    if (v.equipmentId) {
      const name = this.equipment().find((e) => e.id === v.equipmentId)?.name;
      if (name) chips.push({ key: 'equipmentId', label: name });
    }
    if (v.importOrderId) {
      const order = this.imports().find((o) => o.id === v.importOrderId);
      if (order) chips.push({ key: 'importOrderId', label: `Importación #${order.number}` });
    }
    if (v.active === 'inactive') chips.push({ key: 'active', label: 'Inactivos' });
    else if (v.active === 'all') chips.push({ key: 'active', label: 'Todos los estados' });
    if (v.internalCode === 'true') chips.push({ key: 'internalCode', label: 'Código interno' });
    else if (v.internalCode === 'false')
      chips.push({ key: 'internalCode', label: 'Código de proveedor' });
    if (v.hasPrice === 'true') chips.push({ key: 'hasPrice', label: 'Con precio' });
    else if (v.hasPrice === 'false') chips.push({ key: 'hasPrice', label: 'Sin precio' });
    if (v.consignment === 'true') chips.push({ key: 'consignment', label: 'Solo consignación' });
    return chips;
  });

  protected asString(value: number): string {
    return value ? String(value) : '';
  }

  protected indent(option: CategoryOption): string {
    return option.depth > 0 ? '\u00A0\u00A0\u00A0\u00A0' : '';
  }

  protected patch(change: Partial<ProductFilterValues>): void {
    this.filterChange.emit(change);
  }

  protected patchNum(
    key: 'categoryId' | 'costCenterId' | 'equipmentId' | 'importOrderId',
    raw: string,
  ): void {
    this.filterChange.emit({ [key]: raw ? Number(raw) : 0 } as Partial<ProductFilterValues>);
  }

  protected clearOne(key: keyof ProductFilterValues): void {
    const reset: Partial<ProductFilterValues> =
      key === 'active'
        ? { active: 'active' }
        : key === 'categoryId' ||
            key === 'costCenterId' ||
            key === 'equipmentId' ||
            key === 'importOrderId'
          ? ({ [key]: 0 } as Partial<ProductFilterValues>)
          : ({ [key]: '' } as Partial<ProductFilterValues>);
    this.filterChange.emit(reset);
  }
}
