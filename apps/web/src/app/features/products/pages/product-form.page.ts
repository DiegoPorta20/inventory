import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  numberAttribute,
  signal,
} from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { apiError, errorMessage, fieldErrors } from '../../../core/http/api-utils';
import { PricingService } from '../../../core/pricing/pricing.service';
import { UNIT_LABELS } from '../../../shared/models/labels';
import type {
  Category,
  CostCenter,
  EquipmentModel,
  ProductDetail,
  UnitOfMeasure,
} from '../../../shared/models/models';
import { FORMAT_PIPES, formatPen } from '../../../shared/pipes/format.pipes';
import { FieldComponent, PageHeaderComponent } from '../../../shared/ui/layout.components';
import { ErrorStateComponent } from '../../../shared/ui/states.components';
import { ToastService } from '../../../shared/ui/toast.service';
import { buildCategoryOptions } from '../category-options';
import { ProductsApi, type ProductInput } from '../products.api';

const UNITS: UnitOfMeasure[] = ['UNIT', 'PCS', 'SET'];

@Component({
  selector: 'app-product-form-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    FORMAT_PIPES,
    PageHeaderComponent,
    FieldComponent,
    ErrorStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-page-header [title]="isEdit() ? 'Editar producto' : 'Nuevo producto'" />

    @if (loadError()) {
      <div class="card">
        <ui-error-state>
          <a class="btn btn-secondary" routerLink="/products">Volver a productos</a>
        </ui-error-state>
      </div>
    } @else {
      <form class="space-y-4" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <section class="card p-4">
          <h2 class="section-title mb-4">Información general</h2>
          <div class="grid gap-4 md:grid-cols-2">
            <ui-field
              label="Código"
              for="code"
              [hint]="isEdit() ? '' : 'Déjalo vacío para generar un código interno (INT-####).'"
              [error]="errors()['code']"
            >
              <input
                id="code"
                class="input"
                formControlName="code"
                maxlength="60"
                autocomplete="off"
              />
            </ui-field>
            <ui-field label="Unidad" for="unit" [required]="true" [error]="errors()['unit']">
              <select id="unit" class="input" formControlName="unit">
                @for (unit of units; track unit) {
                  <option [value]="unit">{{ unitLabels[unit] }}</option>
                }
              </select>
            </ui-field>
            <ui-field
              class="md:col-span-2"
              label="Nombre / descripción corta"
              for="name"
              [required]="true"
              [error]="errors()['name']"
            >
              <input id="name" class="input" formControlName="name" maxlength="255" />
            </ui-field>
            <ui-field
              class="md:col-span-2"
              label="Descripción detallada"
              for="description"
              [error]="errors()['description']"
            >
              <textarea
                id="description"
                class="input"
                rows="2"
                formControlName="description"
                maxlength="4000"
              ></textarea>
            </ui-field>
            <ui-field label="Categoría" for="categoryId" [error]="errors()['categoryId']">
              <select id="categoryId" class="input" formControlName="categoryId">
                <option [ngValue]="null">— Sin categoría —</option>
                @for (option of categoryOptions(); track option.id) {
                  <option
                    [ngValue]="option.id"
                    [class.opt-root]="option.depth === 0"
                    [class.opt-child]="option.depth > 0"
                  >
                    {{ option.label }}
                  </option>
                }
              </select>
            </ui-field>
            <ui-field label="Centro de costo" for="costCenterId" [error]="errors()['costCenterId']">
              <select id="costCenterId" class="input" formControlName="costCenterId">
                <option [ngValue]="null">— Sin centro de costo —</option>
                @for (center of costCenters(); track center.id) {
                  <option [ngValue]="center.id">{{ center.name }}</option>
                }
              </select>
            </ui-field>
            <ui-field label="Ubicación" for="location" [error]="errors()['location']">
              <input id="location" class="input" formControlName="location" maxlength="60" />
            </ui-field>
            <ui-field
              class="md:col-span-2"
              label="Especificación"
              for="specification"
              [error]="errors()['specification']"
            >
              <input
                id="specification"
                class="input"
                formControlName="specification"
                maxlength="500"
              />
            </ui-field>
          </div>
        </section>

        <section class="card p-4">
          <h2 class="section-title mb-4">Stock y precios</h2>
          <div class="grid gap-4 md:grid-cols-2">
            <ui-field label="Stock mínimo" for="minStock" [error]="errors()['minStock']">
              <input
                id="minStock"
                class="input"
                type="number"
                min="0"
                step="1"
                formControlName="minStock"
              />
            </ui-field>
            <ui-field
              label="Cantidad de reposición"
              for="reorderQuantity"
              [error]="errors()['reorderQuantity']"
            >
              <input
                id="reorderQuantity"
                class="input"
                type="number"
                min="0"
                step="1"
                formControlName="reorderQuantity"
              />
            </ui-field>
            <ui-field label="Costo (S/)" for="costPen" [error]="errors()['costPen']">
              <input
                id="costPen"
                class="input"
                type="number"
                min="0"
                step="0.0001"
                formControlName="costPen"
              />
            </ui-field>
            <div></div>
            <ui-field
              label="Precio de venta (S/ sin IGV)"
              for="pricePen"
              [error]="errors()['pricePen']"
            >
              <input
                id="pricePen"
                class="input"
                type="number"
                min="0"
                step="0.0001"
                formControlName="pricePen"
                (input)="onPriceInput($any($event.target).value)"
              />
            </ui-field>
            <ui-field label="Precio de venta (S/ con IGV)" for="priceWithIgv" [hint]="igvHint()">
              <input
                id="priceWithIgv"
                class="input"
                type="number"
                min="0"
                step="0.01"
                [value]="priceWithIgv()"
                (input)="onPriceWithIgvInput($any($event.target).value)"
              />
            </ui-field>
          </div>

          <dl
            class="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg bg-slate-50 p-3 text-sm sm:grid-cols-4"
            aria-live="polite"
          >
            <div>
              <dt class="text-xs text-slate-500">Precio sin IGV</dt>
              <dd class="font-medium tabular-nums">{{ retailBreakdown()?.pricePen | pen }}</dd>
            </div>
            <div>
              <dt class="text-xs text-slate-500">IGV</dt>
              <dd class="font-medium tabular-nums">{{ retailBreakdown()?.igvPen | pen }}</dd>
            </div>
            <div>
              <dt class="text-xs text-slate-500">Precio con IGV</dt>
              <dd class="font-medium tabular-nums">
                {{ retailBreakdown()?.priceWithIgvPen | pen }}
              </dd>
            </div>
            <div>
              <dt class="text-xs text-slate-500">Margen estimado</dt>
              <dd
                class="font-medium tabular-nums"
                [class]="
                  marginPercent() === null
                    ? 'text-slate-400'
                    : marginPercent()! >= 0
                      ? 'text-emerald-700'
                      : 'text-rose-600'
                "
              >
                @if (marginPercent() !== null) {
                  {{ marginPercent()! >= 0 ? '+' : '' }}{{ marginPercent() }}%
                } @else {
                  —
                }
              </dd>
            </div>
          </dl>

          <div class="mt-4 grid gap-4 md:grid-cols-2">
            <ui-field
              label="Precio por mayor (S/ con IGV)"
              for="wholesaleWithIgv"
              [hint]="wholesaleHint()"
              [error]="errors()['wholesalePricePen']"
            >
              <input
                id="wholesaleWithIgv"
                class="input"
                type="number"
                min="0"
                step="0.01"
                [value]="wholesaleWithIgv()"
                (input)="onWholesaleWithIgvInput($any($event.target).value)"
              />
            </ui-field>
            <ui-field
              label="Cantidad mínima por mayor"
              for="wholesaleMinQty"
              [error]="errors()['wholesaleMinQty']"
            >
              <input
                id="wholesaleMinQty"
                class="input"
                type="number"
                min="1"
                step="1"
                formControlName="wholesaleMinQty"
              />
            </ui-field>
          </div>
          @if (wholesaleMinQtyMissing()) {
            <p class="mt-2 text-sm text-rose-600" role="alert">
              Indica la cantidad mínima para el precio por mayor.
            </p>
          }
        </section>

        <section class="card p-4">
          <h2 class="section-title mb-4">Equipos compatibles</h2>
          @if (equipmentList().length === 0) {
            <p class="text-sm text-slate-500">No hay equipos registrados.</p>
          } @else {
            <div class="flex flex-wrap gap-2">
              @for (model of equipmentList(); track model.id) {
                <label
                  class="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand-500"
                  [class]="
                    isEquipmentSelected(model.id)
                      ? 'border-brand-600 bg-brand-50 text-brand-700'
                      : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                  "
                >
                  <input
                    type="checkbox"
                    class="sr-only"
                    [checked]="isEquipmentSelected(model.id)"
                    (change)="toggleEquipment(model.id, $any($event.target).checked)"
                  />
                  {{ model.name }}
                </label>
              }
            </div>
          }
        </section>

        <section class="card p-4">
          <h2 class="section-title mb-4">Otros</h2>
          <ui-field label="Notas" for="notes" [error]="errors()['notes']">
            <textarea
              id="notes"
              class="input"
              rows="3"
              formControlName="notes"
              maxlength="4000"
            ></textarea>
          </ui-field>
          <label class="mt-3 flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" formControlName="isActive" />
            Producto activo
          </label>
          <label class="mt-3 flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" formControlName="isConsignment" />
            En consignación
          </label>
        </section>

        @if (serverError()) {
          <p
            class="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
            role="alert"
          >
            {{ serverError() }}
          </p>
        }

        <div class="flex justify-end gap-2">
          <a class="btn btn-secondary" routerLink="/products">Cancelar</a>
          <button type="submit" class="btn btn-primary" [disabled]="pending()">
            {{ pending() ? 'Guardando…' : 'Guardar' }}
          </button>
        </div>
      </form>
    }
  `,
})
export class ProductFormPage {
  private readonly api = inject(ProductsApi);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly pricing = inject(PricingService);
  private readonly fb = inject(FormBuilder).nonNullable;

  // The router passes `undefined` on /products/new; numberAttribute would turn that into NaN.
  readonly id = input<number | undefined, unknown>(undefined, {
    transform: (value) => (value === undefined ? undefined : numberAttribute(value)),
  });

  protected readonly units = UNITS;
  protected readonly unitLabels = UNIT_LABELS;

  protected readonly isEdit = computed(() => this.id() !== undefined);
  protected readonly pending = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly errors = signal<Record<string, string>>({});
  protected readonly loadError = signal(false);
  protected readonly selectedEquipment = signal<Set<number>>(new Set());

  /** Display values for the "con IGV" inputs; the price without IGV is the stored source of truth. */
  protected readonly priceWithIgv = signal<number | null>(null);
  protected readonly wholesaleWithIgv = signal<number | null>(null);

  private readonly references = rxResource<
    {
      categories: Category[];
      costCenters: CostCenter[];
      equipment: EquipmentModel[];
      product: ProductDetail | null;
    },
    { id: number | undefined }
  >({
    params: () => ({ id: this.id() }),
    stream: ({ params }) =>
      forkJoin({
        categories: this.api.listCategories(),
        costCenters: this.api.listCostCenters(),
        equipment: this.api.listEquipment(),
        product: params.id === undefined ? of(null) : this.api.get(params.id),
      }),
  });

  protected readonly categoryOptions = computed(() =>
    buildCategoryOptions(this.references.hasValue() ? this.references.value().categories : []),
  );
  protected readonly costCenters = computed(() =>
    this.references.hasValue() ? this.references.value().costCenters : [],
  );
  protected readonly equipmentList = computed(() =>
    this.references.hasValue() ? this.references.value().equipment : [],
  );

  protected readonly form = this.fb.group({
    code: [''],
    name: ['', [Validators.required, Validators.maxLength(255)]],
    description: [''],
    specification: [''],
    categoryId: [null as number | null],
    costCenterId: [null as number | null],
    unit: ['PCS' as UnitOfMeasure, Validators.required],
    minStock: [0, [Validators.min(0)]],
    reorderQuantity: [0, [Validators.min(0)]],
    location: [''],
    costPen: [null as number | null, [Validators.min(0)]],
    pricePen: [null as number | null, [Validators.min(0)]],
    wholesalePricePen: [null as number | null, [Validators.min(0)]],
    wholesaleMinQty: [null as number | null, [Validators.min(1)]],
    notes: [''],
    isActive: [true],
    isConsignment: [false],
  });

  /** Mirror of the money controls so the live summary recomputes on each keystroke. */
  private readonly priceSignal = signal<number | null>(null);
  private readonly costSignal = signal<number | null>(null);
  private readonly wholesaleSignal = signal<number | null>(null);

  protected readonly igvHint = computed(
    () => `Incluye IGV ${Math.round(this.pricing.settings().igvRate * 100)}%`,
  );

  protected readonly wholesaleHint = computed(() => {
    const base = this.wholesaleSignal();
    return base === null ? 'Incluye IGV.' : `Sin IGV: ${formatPen(base)}`;
  });

  protected readonly retailBreakdown = computed(() => {
    const price = this.priceSignal();
    return price !== null && price >= 0 ? this.pricing.breakdown(price) : null;
  });

  protected readonly marginPercent = computed(() => {
    const price = this.priceSignal();
    const cost = this.costSignal();
    if (price === null || cost === null || cost <= 0) return null;
    return Math.round(((price - cost) / cost) * 1000) / 10;
  });

  protected readonly wholesaleMinQtyMissing = computed(
    () => this.wholesaleSignal() !== null && this.form.controls.wholesaleMinQty.value === null,
  );

  constructor() {
    this.form.controls.costPen.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((value) => this.costSignal.set(value ?? null));

    effect(() => {
      if (this.references.error()) {
        this.loadError.set(true);
        return;
      }
      if (!this.references.hasValue()) return;
      const product = this.references.value().product;
      if (product) this.patchForm(product);
    });
  }

  private patchForm(product: ProductDetail): void {
    this.form.patchValue({
      code: product.code,
      name: product.name,
      description: product.description ?? '',
      specification: product.specification ?? '',
      categoryId: product.categoryId,
      costCenterId: product.costCenterId,
      unit: product.unit,
      minStock: product.minStock,
      reorderQuantity: product.reorderQuantity,
      location: product.location ?? '',
      costPen: product.costPen,
      pricePen: product.pricePen,
      wholesalePricePen: product.wholesalePricePen,
      wholesaleMinQty: product.wholesaleMinQty,
      notes: product.notes ?? '',
      isActive: product.isActive,
      isConsignment: product.isConsignment,
    });
    this.priceSignal.set(product.pricePen);
    this.costSignal.set(product.costPen);
    this.wholesaleSignal.set(product.wholesalePricePen);
    this.priceWithIgv.set(product.pricePen === null ? null : this.withIgv(product.pricePen));
    this.wholesaleWithIgv.set(
      product.wholesalePricePen === null ? null : this.withIgv(product.wholesalePricePen),
    );
    this.selectedEquipment.set(new Set(product.equipment.map((model) => model.id)));
  }

  private withIgv(pricePen: number): number {
    return this.pricing.breakdown(pricePen).priceWithIgvPen;
  }

  private parseMoney(raw: string): number | null {
    const trimmed = raw.trim();
    if (trimmed === '') return null;
    const value = Number(trimmed);
    return Number.isFinite(value) && value >= 0 ? value : null;
  }

  protected onPriceInput(raw: string): void {
    const base = this.parseMoney(raw);
    this.priceSignal.set(base);
    this.priceWithIgv.set(base === null ? null : this.withIgv(base));
  }

  protected onPriceWithIgvInput(raw: string): void {
    const gross = this.parseMoney(raw);
    this.priceWithIgv.set(gross);
    const base = gross === null ? null : this.pricing.priceFromWithIgv(gross);
    this.priceSignal.set(base);
    this.form.controls.pricePen.setValue(base);
  }

  protected onWholesaleWithIgvInput(raw: string): void {
    const gross = this.parseMoney(raw);
    this.wholesaleWithIgv.set(gross);
    const base = gross === null ? null : this.pricing.priceFromWithIgv(gross);
    this.wholesaleSignal.set(base);
    this.form.controls.wholesalePricePen.setValue(base);
  }

  protected isEquipmentSelected(id: number): boolean {
    return this.selectedEquipment().has(id);
  }

  protected toggleEquipment(id: number, checked: boolean): void {
    this.selectedEquipment.update((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  protected submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.pending()) return;

    const value = this.form.getRawValue();
    const wholesalePricePen = value.wholesalePricePen ?? null;
    const wholesaleMinQty = value.wholesaleMinQty ?? null;
    if (wholesalePricePen !== null && wholesaleMinQty === null) {
      this.errors.set({ wholesaleMinQty: 'Indica la cantidad mínima para el precio por mayor.' });
      return;
    }

    const code = value.code.trim();
    const payload: ProductInput = {
      name: value.name.trim(),
      description: value.description.trim() || null,
      specification: value.specification.trim() || null,
      categoryId: value.categoryId ?? null,
      costCenterId: value.costCenterId ?? null,
      unit: value.unit,
      minStock: Number(value.minStock) || 0,
      reorderQuantity: Number(value.reorderQuantity) || 0,
      location: value.location.trim() || null,
      costPen: value.costPen ?? null,
      pricePen: value.pricePen ?? null,
      wholesalePricePen,
      wholesaleMinQty: wholesalePricePen === null ? null : wholesaleMinQty,
      isConsignment: value.isConsignment,
      notes: value.notes.trim() || null,
      isActive: value.isActive,
      equipmentIds: [...this.selectedEquipment()],
    };
    if (code) payload.code = code;

    this.pending.set(true);
    this.serverError.set(null);
    this.errors.set({});

    const id = this.id();
    const request = id === undefined ? this.api.create(payload) : this.api.update(id, payload);

    request.subscribe({
      next: (product) => {
        this.toast.success(id === undefined ? 'Producto creado.' : 'Producto actualizado.');
        void this.router.navigate(['/products', product.id]);
      },
      error: (error: unknown) => {
        this.pending.set(false);
        this.errors.set(fieldErrors(error));
        const body = apiError(error);
        if (body?.code === 'CONFLICT') {
          this.errors.update((current) => ({
            ...current,
            code: 'Ya existe un producto con este código.',
          }));
        }
        this.serverError.set(errorMessage(error));
      },
    });
  }
}
