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
import { rxResource } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { apiError, errorMessage, fieldErrors } from '../../../core/http/api-utils';
import { UNIT_LABELS } from '../../../shared/models/labels';
import type {
  Category,
  EquipmentModel,
  ProductDetail,
  UnitOfMeasure,
} from '../../../shared/models/models';
import { FieldComponent, PageHeaderComponent } from '../../../shared/ui/layout.components';
import { ErrorStateComponent } from '../../../shared/ui/states.components';
import { ToastService } from '../../../shared/ui/toast.service';
import { buildCategoryOptions, type CategoryOption } from '../category-options';
import { ProductsApi, type ProductInput } from '../products.api';

const UNITS: UnitOfMeasure[] = ['UNIT', 'PCS', 'SET'];

@Component({
  selector: 'app-product-form-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
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
                  <option [ngValue]="option.id">{{ indent(option) }}{{ option.label }}</option>
                }
              </select>
            </ui-field>
            <ui-field label="Ubicación" for="location" [error]="errors()['location']">
              <input id="location" class="input" formControlName="location" maxlength="60" />
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
            <ui-field label="Costo (USD)" for="costUsd" [error]="errors()['costUsd']">
              <input
                id="costUsd"
                class="input"
                type="number"
                min="0"
                step="0.0001"
                formControlName="costUsd"
              />
            </ui-field>
            <ui-field label="Precio (USD)" for="priceUsd" [error]="errors()['priceUsd']">
              <input
                id="priceUsd"
                class="input"
                type="number"
                min="0"
                step="0.01"
                formControlName="priceUsd"
              />
            </ui-field>
          </div>
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
  private readonly fb = inject(FormBuilder).nonNullable;

  readonly id = input(undefined, { transform: numberAttribute });

  protected readonly units = UNITS;
  protected readonly unitLabels = UNIT_LABELS;

  protected readonly isEdit = computed(() => this.id() !== undefined);
  protected readonly pending = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly errors = signal<Record<string, string>>({});
  protected readonly loadError = signal(false);
  protected readonly selectedEquipment = signal<Set<number>>(new Set());

  private readonly references = rxResource<
    { categories: Category[]; equipment: EquipmentModel[]; product: ProductDetail | null },
    { id: number | undefined }
  >({
    params: () => ({ id: this.id() }),
    stream: ({ params }) =>
      forkJoin({
        categories: this.api.listCategories(),
        equipment: this.api.listEquipment(),
        product: params.id === undefined ? of(null) : this.api.get(params.id),
      }),
  });

  protected readonly categoryOptions = computed(() =>
    buildCategoryOptions(this.references.hasValue() ? this.references.value().categories : []),
  );
  protected readonly equipmentList = computed(() =>
    this.references.hasValue() ? this.references.value().equipment : [],
  );

  protected readonly form = this.fb.group({
    code: [''],
    name: ['', [Validators.required, Validators.maxLength(255)]],
    description: [''],
    categoryId: [null as number | null],
    unit: ['PCS' as UnitOfMeasure, Validators.required],
    minStock: [0, [Validators.min(0)]],
    reorderQuantity: [0, [Validators.min(0)]],
    location: [''],
    costUsd: [null as number | null],
    priceUsd: [null as number | null],
    notes: [''],
    isActive: [true],
  });

  constructor() {
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
      categoryId: product.categoryId,
      unit: product.unit,
      minStock: product.minStock,
      reorderQuantity: product.reorderQuantity,
      location: product.location ?? '',
      costUsd: product.costUsd,
      priceUsd: product.priceUsd,
      notes: product.notes ?? '',
      isActive: product.isActive,
    });
    this.selectedEquipment.set(new Set(product.equipment.map((model) => model.id)));
  }

  protected indent(option: CategoryOption): string {
    return option.depth > 0 ? '\u00A0\u00A0\u00A0\u00A0' : '';
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
    const code = value.code.trim();
    const payload: ProductInput = {
      name: value.name.trim(),
      description: value.description.trim() || null,
      categoryId: value.categoryId ?? null,
      unit: value.unit,
      minStock: Number(value.minStock) || 0,
      reorderQuantity: Number(value.reorderQuantity) || 0,
      location: value.location.trim() || null,
      costUsd: value.costUsd ?? null,
      priceUsd: value.priceUsd ?? null,
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
