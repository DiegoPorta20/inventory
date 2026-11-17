import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { errorMessage, fieldErrors } from '../../../core/http/api-utils';
import type { ProductListItem, UnitOfMeasure } from '../../../shared/models/models';
import { FORMAT_PIPES } from '../../../shared/pipes/format.pipes';
import { IconComponent } from '../../../shared/ui/icon.component';
import { FieldComponent, PageHeaderComponent } from '../../../shared/ui/layout.components';
import { ProductPickerComponent } from '../../../shared/ui/product-picker.component';
import { ErrorStateComponent } from '../../../shared/ui/states.components';
import { ToastService } from '../../../shared/ui/toast.service';
import { SuppliersApi } from '../../suppliers/suppliers.api';
import type { ImportNavigationState, ImportPrefillLine } from '../import-prefill';
import { ImportsApi, type ImportOrderInput } from '../imports.api';
import { DateInputComponent } from '../../../shared/ui/date-input.component';

interface LineRow {
  productId: number;
  code: string;
  name: string;
  unit: UnitOfMeasure;
  quantityOrdered: number;
  unitCostPen: number | null;
}

interface FormState {
  number: number | null;
  supplierId: number | null;
  reference: string;
  orderedAt: string;
  expectedAt: string;
  notes: string;
  status: 'DRAFT' | 'ORDERED';
}

@Component({
  selector: 'app-import-form-page',
  imports: [
    DateInputComponent,
    RouterLink,
    FORMAT_PIPES,
    IconComponent,
    PageHeaderComponent,
    FieldComponent,
    ProductPickerComponent,
    ErrorStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <div class="space-y-4" aria-busy="true">
        <div class="skeleton h-8 w-48"></div>
        <div class="card p-6"><div class="skeleton h-40 w-full"></div></div>
      </div>
    } @else if (loadError()) {
      <div class="card">
        <ui-error-state [message]="loadError()!">
          <a class="btn btn-secondary" routerLink="/imports">Volver</a>
        </ui-error-state>
      </div>
    } @else {
      <ui-page-header [title]="isEdit() ? 'Editar importación' : 'Nueva importación'">
        <a class="btn btn-ghost" [routerLink]="cancelLink()"
          ><ui-icon name="chevron-left" [size]="4" /> Volver</a
        >
      </ui-page-header>

      <form class="space-y-4" (submit)="$event.preventDefault(); submit()">
        <section class="card p-4">
          <h2 class="section-title mb-3">Datos de la importación</h2>
          <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <ui-field
              label="Número"
              for="imp-number"
              hint="Opcional. Si se deja vacío se asigna automáticamente."
              [error]="errors()['number']"
            >
              <input
                id="imp-number"
                class="input"
                type="number"
                min="1"
                step="1"
                [value]="form().number ?? ''"
                (input)="patch('number', toInt($any($event.target).value))"
              />
            </ui-field>
            <ui-field label="Proveedor" for="imp-supplier" [error]="errors()['supplierId']">
              <select
                id="imp-supplier"
                class="input"
                [value]="form().supplierId ?? 0"
                (change)="patch('supplierId', toSupplier($any($event.target).value))"
              >
                <option [value]="0">Sin proveedor</option>
                @for (sup of suppliers(); track sup.id) {
                  <option [value]="sup.id">{{ sup.name }}</option>
                }
              </select>
            </ui-field>
            <ui-field label="Referencia" for="imp-reference" [error]="errors()['reference']">
              <input
                id="imp-reference"
                class="input"
                [value]="form().reference"
                (input)="patch('reference', $any($event.target).value)"
                maxlength="120"
              />
            </ui-field>
            <ui-field label="Fecha de pedido" for="imp-ordered" [error]="errors()['orderedAt']">
              <ui-date-input
                inputId="imp-ordered"
                [value]="form().orderedAt"
                (valueChange)="patch('orderedAt', $event)"
              />
            </ui-field>
            <ui-field label="Fecha esperada" for="imp-expected" [error]="errors()['expectedAt']">
              <ui-date-input
                inputId="imp-expected"
                [value]="form().expectedAt"
                (valueChange)="patch('expectedAt', $event)"
              />
            </ui-field>
            @if (!isEdit()) {
              <ui-field label="Estado inicial" for="imp-status">
                <select
                  id="imp-status"
                  class="input"
                  [value]="form().status"
                  (change)="patch('status', $any($event.target).value)"
                >
                  <option value="DRAFT">Borrador</option>
                  <option value="ORDERED">Pedido</option>
                </select>
              </ui-field>
            }
            <div class="md:col-span-2 lg:col-span-3">
              <ui-field label="Notas" for="imp-notes" [error]="errors()['notes']">
                <textarea
                  id="imp-notes"
                  class="input"
                  rows="2"
                  [value]="form().notes"
                  (input)="patch('notes', $any($event.target).value)"
                  maxlength="4000"
                ></textarea>
              </ui-field>
            </div>
          </div>
        </section>

        <section class="card p-4">
          <h2 class="section-title mb-3">Líneas</h2>
          <ui-field
            label="Agregar producto"
            for="imp-picker"
            hint="Busca por código o descripción."
          >
            <app-product-picker
              inputId="imp-picker"
              [excludeIds]="selectedIds()"
              (selected)="addLine($event)"
            />
          </ui-field>

          @if (lines().length === 0) {
            <p
              class="mt-3 rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500"
            >
              Agrega al menos un producto a la importación.
            </p>
          } @else {
            <div class="table-wrap mt-3">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th class="num">Cantidad</th>
                    <th class="num">Costo unit. S/</th>
                    <th class="num">Subtotal</th>
                    <th><span class="sr-only">Quitar</span></th>
                  </tr>
                </thead>
                <tbody>
                  @for (line of lines(); track line.productId; let i = $index) {
                    <tr>
                      <td>
                        <span class="block max-w-xs truncate font-medium text-slate-800">{{
                          line.name
                        }}</span>
                        <span class="text-xs text-slate-500">{{ line.code }}</span>
                      </td>
                      <td class="num">
                        <input
                          class="input w-24 text-right"
                          type="number"
                          min="1"
                          step="1"
                          [attr.aria-label]="'Cantidad de ' + line.name"
                          [value]="line.quantityOrdered"
                          (input)="setQuantity(i, $any($event.target).value)"
                        />
                      </td>
                      <td class="num">
                        <input
                          class="input w-28 text-right"
                          type="number"
                          min="0"
                          step="0.01"
                          [attr.aria-label]="'Costo unitario de ' + line.name"
                          [value]="line.unitCostPen ?? ''"
                          (input)="setCost(i, $any($event.target).value)"
                        />
                      </td>
                      <td class="num font-medium">{{ lineSubtotal(line) | pen }}</td>
                      <td>
                        <button
                          type="button"
                          class="btn btn-ghost btn-icon text-rose-600"
                          [attr.aria-label]="'Quitar ' + line.name"
                          (click)="removeLine(i)"
                        >
                          <ui-icon name="trash" [size]="4" />
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
                <tfoot>
                  <tr class="border-t border-slate-200 font-semibold">
                    <td>Total</td>
                    <td class="num">{{ totalUnits() | quantity }}</td>
                    <td></td>
                    <td class="num">{{ totalCost() | pen }}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          }
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
          <a class="btn btn-secondary" [routerLink]="cancelLink()">Cancelar</a>
          <button
            type="submit"
            class="btn btn-primary"
            [disabled]="pending() || lines().length === 0"
          >
            {{ pending() ? 'Guardando…' : 'Guardar importación' }}
          </button>
        </div>
      </form>
    }
  `,
})
export class ImportFormPage {
  readonly id = input<number>();

  private readonly api = inject(ImportsApi);
  private readonly suppliersApi = inject(SuppliersApi);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly isEdit = computed(() => this.id() != null);
  protected readonly pending = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly errors = signal<Record<string, string>>({});
  protected readonly loadError = signal<string | null>(null);

  protected readonly form = signal<FormState>({
    number: null,
    supplierId: null,
    reference: '',
    orderedAt: '',
    expectedAt: '',
    notes: '',
    status: 'DRAFT',
  });

  protected readonly lines = signal<LineRow[]>([]);
  protected readonly selectedIds = computed(() => this.lines().map((line) => line.productId));
  protected readonly totalUnits = computed(() =>
    this.lines().reduce((sum, line) => sum + line.quantityOrdered, 0),
  );
  protected readonly totalCost = computed(() =>
    this.lines().reduce((sum, line) => sum + (line.unitCostPen ?? 0) * line.quantityOrdered, 0),
  );

  private readonly suppliersResource = rxResource({ stream: () => this.suppliersApi.list({}) });
  protected readonly suppliers = computed(() =>
    this.suppliersResource.hasValue() ? this.suppliersResource.value() : [],
  );

  private readonly detail = rxResource({
    params: () => (this.id() != null ? { id: this.id()! } : undefined),
    stream: ({ params }) => this.api.get(params.id),
  });

  protected readonly loading = computed(() => this.id() != null && this.detail.isLoading());

  private hydrated = false;

  constructor() {
    this.applyPrefill();
    effect(() => {
      if (this.hydrated || this.id() == null) return;
      if (this.detail.error()) {
        this.loadError.set(errorMessage(this.detail.error()));
        return;
      }
      if (!this.detail.hasValue()) return;
      const order = this.detail.value();
      this.hydrated = true;
      this.form.set({
        number: order.number,
        supplierId: order.supplierId,
        reference: order.reference ?? '',
        orderedAt: order.orderedAt ?? '',
        expectedAt: order.expectedAt ?? '',
        notes: order.notes ?? '',
        status: 'DRAFT',
      });
      this.lines.set(
        order.items.map((item) => ({
          productId: item.productId,
          code: item.productCode,
          name: item.productName,
          unit: item.unit,
          quantityOrdered: item.quantityOrdered,
          unitCostPen: item.unitCostPen,
        })),
      );
    });
  }

  private applyPrefill(): void {
    if (this.id() != null) return;
    const nav = this.router.getCurrentNavigation();
    const state = (nav?.extras.state ?? history.state) as ImportNavigationState | undefined;
    const prefill = state?.prefill;
    if (!prefill?.items?.length) return;
    this.lines.set(prefill.items.map((item: ImportPrefillLine) => ({ ...item })));
  }

  protected patch<K extends keyof FormState>(key: K, value: FormState[K]): void {
    this.form.update((current) => ({ ...current, [key]: value }));
  }

  protected toInt(value: string): number | null {
    const n = Number(value);
    return value === '' || !Number.isFinite(n) ? null : Math.floor(n);
  }

  protected toSupplier(value: string): number | null {
    const n = Number(value);
    return n > 0 ? n : null;
  }

  protected addLine(product: ProductListItem): void {
    if (this.lines().some((line) => line.productId === product.id)) {
      this.toast.info('Ese producto ya está en la lista.');
      return;
    }
    this.lines.update((lines) => [
      ...lines,
      {
        productId: product.id,
        code: product.code,
        name: product.name,
        unit: product.unit,
        quantityOrdered: 1,
        unitCostPen: product.costPen,
      },
    ]);
  }

  protected removeLine(index: number): void {
    this.lines.update((lines) => lines.filter((_, i) => i !== index));
  }

  protected setQuantity(index: number, value: string): void {
    const next = Math.max(1, Math.floor(Number(value) || 1));
    this.lines.update((lines) =>
      lines.map((line, i) => (i === index ? { ...line, quantityOrdered: next } : line)),
    );
  }

  protected setCost(index: number, value: string): void {
    const next = value === '' ? null : Math.max(0, Number(value) || 0);
    this.lines.update((lines) =>
      lines.map((line, i) => (i === index ? { ...line, unitCostPen: next } : line)),
    );
  }

  protected lineSubtotal(line: LineRow): number | null {
    return line.unitCostPen == null ? null : line.unitCostPen * line.quantityOrdered;
  }

  protected cancelLink(): unknown[] {
    return this.id() != null ? ['/imports', this.id()] : ['/imports'];
  }

  protected submit(): void {
    if (this.pending() || this.lines().length === 0) return;
    const value = this.form();
    const payload: ImportOrderInput = {
      supplierId: value.supplierId,
      reference: value.reference.trim() || null,
      orderedAt: value.orderedAt || null,
      expectedAt: value.expectedAt || null,
      notes: value.notes.trim() || null,
      items: this.lines().map((line) => ({
        productId: line.productId,
        quantityOrdered: line.quantityOrdered,
        unitCostPen: line.unitCostPen,
      })),
    };
    if (value.number != null) payload.number = value.number;

    this.pending.set(true);
    this.serverError.set(null);
    this.errors.set({});

    const editId = this.id();
    const request =
      editId != null
        ? this.api.update(editId, payload)
        : this.api.create({ ...payload, status: value.status });

    request.subscribe({
      next: (order) => {
        this.toast.success(editId != null ? 'Importación actualizada.' : 'Importación creada.');
        void this.router.navigate(['/imports', order.id]);
      },
      error: (error: unknown) => {
        this.pending.set(false);
        this.errors.set(fieldErrors(error));
        this.serverError.set(errorMessage(error));
      },
    });
  }
}
