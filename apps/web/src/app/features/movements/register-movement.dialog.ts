import { Dialog, DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { map, startWith } from 'rxjs';
import { errorMessage } from '../../core/http/api-utils';
import {
  MANUAL_REASONS,
  MOVEMENT_REASON_LABELS,
  MOVEMENT_TYPE_LABELS,
  UNIT_LABELS,
} from '../../shared/models/labels';
import type { MovementType, ProductListItem, UnitOfMeasure } from '../../shared/models/models';
import { FORMAT_PIPES } from '../../shared/pipes/format.pipes';
import { DialogFrameComponent } from '../../shared/ui/dialog-frame.component';
import { FieldComponent } from '../../shared/ui/layout.components';
import { ProductPickerComponent } from '../../shared/ui/product-picker.component';
import { ToastService } from '../../shared/ui/toast.service';

export interface RegisterMovementData {
  product?: Pick<ProductListItem, 'id' | 'code' | 'name' | 'stock' | 'unit'>;
  type?: MovementType;
}

const TYPES: MovementType[] = ['IN', 'OUT', 'ADJUSTMENT'];

/** Opens the dialog; resolves to true when a movement was registered. */
export function openRegisterMovement(dialog: Dialog, data: RegisterMovementData = {}) {
  return dialog.open<boolean, RegisterMovementData>(RegisterMovementDialog, {
    data,
    ariaModal: true,
    autoFocus: 'first-tabbable',
  });
}

@Component({
  selector: 'app-register-movement-dialog',
  imports: [
    ReactiveFormsModule,
    DialogFrameComponent,
    FieldComponent,
    ProductPickerComponent,
    FORMAT_PIPES,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-dialog-frame
      title="Registrar movimiento"
      subtitle="Entradas, salidas y ajustes de stock."
      width="34rem"
    >
      <form
        id="movement-form"
        class="space-y-4"
        [formGroup]="form"
        (ngSubmit)="submit()"
        novalidate
      >
        @if (product(); as p) {
          <div
            class="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3"
          >
            <div class="min-w-0">
              <p class="truncate text-sm font-medium text-slate-800">{{ p.name }}</p>
              <p class="text-xs text-slate-500">
                {{ p.code }} · Stock actual: <strong>{{ p.stock | quantity }}</strong>
                {{ unitLabel(p.unit) }}
              </p>
            </div>
            @if (!data.product) {
              <button type="button" class="btn btn-ghost btn-sm" (click)="product.set(null)">
                Cambiar
              </button>
            }
          </div>
        } @else {
          <ui-field
            label="Producto"
            for="movement-product"
            [error]="showProductError() ? 'Selecciona un producto.' : null"
            [required]="true"
          >
            <app-product-picker inputId="movement-product" (selected)="product.set($event)" />
          </ui-field>
        }

        <fieldset>
          <legend class="label">Tipo de movimiento</legend>
          <div class="grid grid-cols-3 gap-2">
            @for (t of types; track t) {
              <label
                class="flex cursor-pointer items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand-500"
                [class]="
                  type() === t
                    ? 'border-brand-600 bg-brand-50 text-brand-700'
                    : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                "
              >
                <input type="radio" class="sr-only" formControlName="type" [value]="t" />
                {{ typeLabels[t] }}
              </label>
            }
          </div>
        </fieldset>

        <div class="grid gap-4 sm:grid-cols-2">
          <ui-field label="Motivo" for="movement-reason" [required]="true">
            <select id="movement-reason" class="input" formControlName="reason">
              @for (r of reasons(); track r) {
                <option [value]="r">{{ reasonLabels[r] }}</option>
              }
            </select>
          </ui-field>
          <ui-field
            [label]="type() === 'ADJUSTMENT' ? 'Cantidad (+ suma, − resta)' : 'Cantidad'"
            for="movement-qty"
            [required]="true"
            [error]="quantityError()"
          >
            <input
              id="movement-qty"
              class="input"
              type="number"
              step="1"
              formControlName="quantity"
              inputmode="numeric"
            />
          </ui-field>
        </div>

        @if (resultingStock() !== null) {
          <p
            class="rounded-lg px-3 py-2 text-sm"
            [class]="
              resultingStock()! < 0 ? 'bg-rose-50 text-rose-700' : 'bg-slate-50 text-slate-600'
            "
          >
            Stock resultante:
            <strong class="tabular-nums">{{ resultingStock() | quantity }}</strong>
            @if (resultingStock()! < 0) {
              · Stock insuficiente
            }
          </p>
        }

        @if (type() === 'OUT' && form.controls.reason.value === 'SALE') {
          <div class="grid gap-4 sm:grid-cols-2">
            <ui-field label="Cliente" for="movement-party"
              ><input
                id="movement-party"
                class="input"
                formControlName="counterparty"
                maxlength="160"
            /></ui-field>
            <ui-field label="Precio unitario (USD)" for="movement-price"
              ><input
                id="movement-price"
                class="input"
                type="number"
                min="0"
                step="0.01"
                formControlName="unitPriceUsd"
            /></ui-field>
          </div>
        } @else if (type() !== 'ADJUSTMENT') {
          <ui-field [label]="type() === 'IN' ? 'Origen' : 'Destino'" for="movement-party">
            <input
              id="movement-party"
              class="input"
              formControlName="counterparty"
              maxlength="160"
            />
          </ui-field>
        }

        <ui-field label="Nota" for="movement-note">
          <textarea
            id="movement-note"
            class="input"
            rows="2"
            formControlName="note"
            maxlength="500"
          ></textarea>
        </ui-field>

        @if (serverError()) {
          <p
            class="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
            role="alert"
          >
            {{ serverError() }}
          </p>
        }
      </form>

      <ng-container dialog-actions>
        <button type="button" class="btn btn-secondary" (click)="ref.close(false)">Cancelar</button>
        <button type="submit" form="movement-form" class="btn btn-primary" [disabled]="pending()">
          {{ pending() ? 'Guardando…' : 'Registrar' }}
        </button>
      </ng-container>
    </ui-dialog-frame>
  `,
})
export class RegisterMovementDialog {
  protected readonly data = inject<RegisterMovementData>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<boolean>>(DialogRef);
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly types = TYPES;
  protected readonly typeLabels = MOVEMENT_TYPE_LABELS;
  protected readonly reasonLabels = MOVEMENT_REASON_LABELS;

  protected readonly product = signal<RegisterMovementData['product'] | null>(
    this.data.product ?? null,
  );
  protected readonly pending = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly showProductError = signal(false);

  protected readonly form = this.fb.group({
    type: [this.data.type ?? ('OUT' as MovementType)],
    reason: [MANUAL_REASONS[this.data.type ?? 'OUT'][0] as string, Validators.required],
    quantity: [null as number | null, [Validators.required]],
    counterparty: [''],
    unitPriceUsd: [null as number | null],
    note: [''],
  });

  protected readonly type = toSignal(
    this.form.controls.type.valueChanges.pipe(startWith(this.form.controls.type.value)),
    { requireSync: true },
  );
  private readonly quantity = toSignal(
    this.form.controls.quantity.valueChanges.pipe(startWith(this.form.controls.quantity.value)),
    { requireSync: true },
  );

  protected readonly reasons = computed(() => MANUAL_REASONS[this.type()]);

  protected readonly resultingStock = computed(() => {
    const product = this.product();
    const quantity = Number(this.quantity());
    if (!product || !this.quantity() || !Number.isFinite(quantity)) return null;
    const delta = this.type() === 'IN' ? quantity : this.type() === 'OUT' ? -quantity : quantity;
    return product.stock + delta;
  });

  protected readonly quantityError = computed(() => {
    const control = this.form.controls.quantity;
    if (!control.touched) return null;
    const quantity = Number(control.value);
    if (!control.value || !Number.isInteger(quantity) || quantity === 0)
      return 'Ingresa una cantidad entera distinta de cero.';
    if (this.type() !== 'ADJUSTMENT' && quantity < 0) return 'La cantidad debe ser positiva.';
    return null;
  });

  constructor() {
    effect(() => {
      const allowed = this.reasons();
      if (!allowed.includes(this.form.controls.reason.value as never)) {
        this.form.controls.reason.setValue(allowed[0]);
      }
    });
  }

  protected unitLabel(unit: UnitOfMeasure): string {
    return UNIT_LABELS[unit];
  }

  protected submit(): void {
    this.form.markAllAsTouched();
    const product = this.product();
    this.showProductError.set(!product);
    if (!product || this.quantityError() || this.form.invalid || this.pending()) return;

    const value = this.form.getRawValue();
    this.pending.set(true);
    this.serverError.set(null);
    this.http
      .post('/api/stock-movements', {
        productId: product.id,
        type: value.type,
        reason: value.reason,
        quantity: Number(value.quantity),
        counterparty: value.counterparty.trim() || null,
        unitPriceUsd: value.unitPriceUsd ?? null,
        note: value.note.trim() || null,
      })
      .pipe(map(() => true))
      .subscribe({
        next: () => {
          this.toast.success('Movimiento registrado.');
          this.ref.close(true);
        },
        error: (error: unknown) => {
          this.pending.set(false);
          this.serverError.set(errorMessage(error));
        },
      });
  }
}
