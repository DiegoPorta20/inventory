import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { startWith } from 'rxjs';
import { errorMessage, fieldErrors } from '../../../core/http/api-utils';
import { PricingService } from '../../../core/pricing/pricing.service';
import type { PricingSettings } from '../../../shared/models/models';
import { formatPen, formatUsd, FORMAT_PIPES } from '../../../shared/pipes/format.pipes';
import { FieldComponent, PageHeaderComponent } from '../../../shared/ui/layout.components';
import { ErrorStateComponent } from '../../../shared/ui/states.components';
import { ToastService } from '../../../shared/ui/toast.service';
import { SettingsApi } from '../settings.api';

const EXAMPLE_PRICE_USD = 100;

@Component({
  selector: 'app-settings-page',
  imports: [
    ReactiveFormsModule,
    FORMAT_PIPES,
    FieldComponent,
    PageHeaderComponent,
    ErrorStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-page-header title="Configuración" subtitle="Parámetros generales del sistema." />

    @if (pricing.isLoading()) {
      <div class="card max-w-2xl p-4">
        <div class="skeleton h-4 w-32"></div>
        <div class="skeleton mt-4 h-9 w-full"></div>
        <div class="skeleton mt-3 h-9 w-full"></div>
      </div>
    } @else if (pricing.error()) {
      <div class="card max-w-2xl">
        <ui-error-state>
          <button type="button" class="btn btn-secondary" (click)="pricing.reload()">
            Reintentar
          </button>
        </ui-error-state>
      </div>
    } @else {
      <section class="card max-w-2xl">
        <div class="card-header"><h2 class="card-title">Precios</h2></div>
        <div class="p-4">
          <p class="mb-4 text-sm text-slate-600">
            Los precios de venta se guardan en <strong>USD sin IGV</strong>. El sistema calcula el
            IGV y el equivalente en soles con el tipo de cambio configurado aquí.
          </p>

          <form class="space-y-4" [formGroup]="form" (ngSubmit)="save()" novalidate>
            <div class="grid gap-4 sm:grid-cols-2">
              <ui-field
                label="Tipo de cambio (USD → S/)"
                for="settings-exchange-rate"
                hint="Soles por cada dólar."
                [required]="true"
                [error]="errors()['exchangeRate']"
              >
                <input
                  id="settings-exchange-rate"
                  class="input"
                  type="number"
                  min="0"
                  step="0.0001"
                  formControlName="exchangeRate"
                  inputmode="decimal"
                />
              </ui-field>
              <ui-field
                label="IGV (%)"
                for="settings-igv"
                hint="Porcentaje de impuesto aplicado sobre el precio."
                [required]="true"
                [error]="errors()['igvRate']"
              >
                <input
                  id="settings-igv"
                  class="input"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  formControlName="igvPercent"
                  inputmode="decimal"
                />
              </ui-field>
            </div>

            <div class="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              <p class="font-medium text-slate-700">Ejemplo</p>
              <p class="mt-1 text-slate-600">
                Un producto de <strong>{{ exampleUsd }}</strong> sin IGV equivale a
                <strong class="tabular-nums">{{ exampleWithIgvUsd() }}</strong> con IGV, es decir
                <strong class="tabular-nums">{{ examplePen() }}</strong> a un tipo de cambio de
                <strong class="tabular-nums">{{ exchangeRateValue() }}</strong
                >.
              </p>
            </div>

            @if (serverError()) {
              <p
                class="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
                role="alert"
              >
                {{ serverError() }}
              </p>
            }

            <div class="flex justify-end">
              <button type="submit" class="btn btn-primary" [disabled]="pending()">
                {{ pending() ? 'Guardando…' : 'Guardar' }}
              </button>
            </div>
          </form>
        </div>
      </section>
    }
  `,
})
export class SettingsPage {
  private readonly api = inject(SettingsApi);
  private readonly pricingService = inject(PricingService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly exampleUsd = formatUsd(EXAMPLE_PRICE_USD);
  protected readonly pending = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly errors = signal<Record<string, string>>({});

  protected readonly form = this.fb.group({
    exchangeRate: [3.6, [Validators.required, Validators.min(0.0001)]],
    igvPercent: [18, [Validators.required, Validators.min(0), Validators.max(100)]],
  });

  protected readonly pricing = rxResource<PricingSettings, void>({
    stream: () => this.api.getPricing(),
  });

  private readonly exchangeRate = toSignal(
    this.form.controls.exchangeRate.valueChanges.pipe(
      startWith(this.form.controls.exchangeRate.value),
    ),
    { requireSync: true },
  );
  private readonly igvPercent = toSignal(
    this.form.controls.igvPercent.valueChanges.pipe(startWith(this.form.controls.igvPercent.value)),
    { requireSync: true },
  );

  protected readonly exchangeRateValue = computed(() =>
    formatPen(Number(this.exchangeRate()) || 0),
  );

  protected readonly exampleWithIgvUsd = computed(() => {
    const igvRate = (Number(this.igvPercent()) || 0) / 100;
    return formatUsd(EXAMPLE_PRICE_USD * (1 + igvRate));
  });

  protected readonly examplePen = computed(() => {
    const igvRate = (Number(this.igvPercent()) || 0) / 100;
    const rate = Number(this.exchangeRate()) || 0;
    return formatPen(EXAMPLE_PRICE_USD * (1 + igvRate) * rate);
  });

  constructor() {
    let applied = false;
    effect(() => {
      if (applied || !this.pricing.hasValue()) return;
      const value = this.pricing.value();
      applied = true;
      this.form.setValue({
        exchangeRate: value.exchangeRate,
        igvPercent: Math.round(value.igvRate * 100 * 100) / 100,
      });
    });
  }

  protected save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.pending()) return;

    const value = this.form.getRawValue();
    const payload = {
      exchangeRate: Number(value.exchangeRate),
      igvRate: Number(value.igvPercent) / 100,
    };

    this.pending.set(true);
    this.serverError.set(null);
    this.errors.set({});

    this.api.updatePricing(payload).subscribe({
      next: () => {
        this.pending.set(false);
        this.toast.success('Configuración de precios guardada.');
        this.pricingService.reload();
      },
      error: (error: unknown) => {
        this.pending.set(false);
        this.errors.set(fieldErrors(error));
        this.serverError.set(errorMessage(error));
      },
    });
  }
}
