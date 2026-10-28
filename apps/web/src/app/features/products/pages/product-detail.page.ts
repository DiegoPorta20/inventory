import { Dialog } from '@angular/cdk/dialog';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  numberAttribute,
  signal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { errorMessage } from '../../../core/http/api-utils';
import {
  MOVEMENT_REASON_LABELS,
  MOVEMENT_TYPE_LABELS,
  MOVEMENT_TYPE_TONES,
  IMPORT_STATUS_LABELS,
  IMPORT_STATUS_TONES,
  UNIT_LABELS,
} from '../../../shared/models/labels';
import type { ProductDetail } from '../../../shared/models/models';
import { FORMAT_PIPES } from '../../../shared/pipes/format.pipes';
import { BadgeComponent, StockBadgeComponent } from '../../../shared/ui/badge.components';
import { ConfirmService } from '../../../shared/ui/confirm.service';
import { IconComponent } from '../../../shared/ui/icon.component';
import { PageHeaderComponent } from '../../../shared/ui/layout.components';
import { ErrorStateComponent } from '../../../shared/ui/states.components';
import { ToastService } from '../../../shared/ui/toast.service';
import { openRegisterMovement } from '../../movements/register-movement.dialog';
import { ProductsApi } from '../products.api';

type Tab = 'movements' | 'imports';

@Component({
  selector: 'app-product-detail-page',
  imports: [
    RouterLink,
    FORMAT_PIPES,
    BadgeComponent,
    StockBadgeComponent,
    IconComponent,
    PageHeaderComponent,
    ErrorStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (product.isLoading()) {
      <div class="space-y-4">
        <div class="skeleton h-8 w-64"></div>
        <div class="grid gap-4 md:grid-cols-3">
          @for (i of [1, 2, 3]; track i) {
            <div class="card p-4">
              <div class="skeleton h-5 w-32"></div>
              <div class="skeleton mt-3 h-10 w-full"></div>
            </div>
          }
        </div>
      </div>
    } @else if (product.error()) {
      <div class="card">
        <ui-error-state>
          <button type="button" class="btn btn-secondary" (click)="product.reload()">
            Reintentar
          </button>
        </ui-error-state>
      </div>
    } @else if (data(); as p) {
      <ui-page-header [title]="p.name">
        <a class="btn btn-secondary" [routerLink]="['/products', p.id, 'edit']">
          <ui-icon name="edit" [size]="4" /> Editar
        </a>
        <button type="button" class="btn btn-secondary" (click)="registerMovement(p)">
          <ui-icon name="swap" [size]="4" /> Registrar movimiento
        </button>
        <button type="button" class="btn btn-secondary" (click)="toggleActive(p)">
          {{ p.isActive ? 'Desactivar' : 'Activar' }}
        </button>
        <button type="button" class="btn btn-danger" (click)="remove(p)">
          <ui-icon name="trash" [size]="4" /> Eliminar
        </button>
      </ui-page-header>

      <div class="mb-5 flex flex-wrap items-center gap-3">
        <span class="font-mono text-sm text-slate-600">{{ p.code }}</span>
        @if (p.isInternalCode) {
          <ui-badge tone="neutral">Código interno</ui-badge>
        }
        <ui-stock-badge [status]="p.stockStatus" />
        @if (!p.isActive) {
          <ui-badge tone="neutral">Inactivo</ui-badge>
        }
        @if (p.categoryPath) {
          <span class="text-sm text-slate-500">{{ p.categoryPath }}</span>
        }
      </div>

      <div class="grid gap-4 lg:grid-cols-3">
        <section class="card p-4">
          <h2 class="section-title mb-3">Stock</h2>
          <dl class="grid grid-cols-2 gap-x-4 gap-y-3">
            <div>
              <dt class="text-xs text-slate-500">En stock</dt>
              <dd class="text-lg font-semibold tabular-nums">
                {{ p.stock | quantity }} {{ unitLabels[p.unit] }}
              </dd>
            </div>
            <div>
              <dt class="text-xs text-slate-500">Stock mínimo</dt>
              <dd class="text-lg font-semibold tabular-nums">
                {{ p.minStock ? (p.minStock | quantity) : '—' }}
              </dd>
            </div>
            <div>
              <dt class="text-xs text-slate-500">Reposición</dt>
              <dd class="text-lg font-semibold tabular-nums">
                {{ p.reorderQuantity ? (p.reorderQuantity | quantity) : '—' }}
              </dd>
            </div>
            <div>
              <dt class="text-xs text-slate-500">En camino</dt>
              <dd class="text-lg font-semibold tabular-nums">
                {{ p.incomingQty ? (p.incomingQty | quantity) : '—' }}
              </dd>
            </div>
          </dl>
        </section>

        <section class="card p-4">
          <h2 class="section-title mb-3">Precios</h2>
          <dl class="grid grid-cols-2 gap-x-4 gap-y-3">
            <div>
              <dt class="text-xs text-slate-500">Costo</dt>
              <dd class="text-lg font-semibold tabular-nums">{{ p.costUsd | usd: true }}</dd>
            </div>
            <div>
              <dt class="text-xs text-slate-500">Precio</dt>
              <dd class="text-lg font-semibold tabular-nums">{{ p.priceUsd | usd }}</dd>
            </div>
          </dl>
        </section>

        <section class="card p-4">
          <h2 class="section-title mb-3">Detalles</h2>
          <dl class="space-y-2 text-sm">
            <div class="flex justify-between gap-3">
              <dt class="text-slate-500">Unidad</dt>
              <dd class="font-medium">{{ unitLabels[p.unit] }}</dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="text-slate-500">Ubicación</dt>
              <dd class="font-medium">{{ p.location ?? '—' }}</dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="text-slate-500">Categoría</dt>
              <dd class="font-medium text-right">{{ p.categoryName ?? 'Sin categoría' }}</dd>
            </div>
          </dl>
          @if (p.equipment.length > 0) {
            <div class="mt-3">
              <p class="text-xs text-slate-500">Equipos compatibles</p>
              <div class="mt-1 flex flex-wrap gap-1.5">
                @for (model of p.equipment; track model.id) {
                  <ui-badge tone="brand">{{ model.name }}</ui-badge>
                }
              </div>
            </div>
          }
          @if (p.notes) {
            <div class="mt-3">
              <p class="text-xs text-slate-500">Notas</p>
              <p class="mt-1 text-sm whitespace-pre-line text-slate-700">{{ p.notes }}</p>
            </div>
          }
        </section>
      </div>

      <div class="card mt-4">
        <div
          class="border-b border-slate-100 px-4"
          role="tablist"
          aria-label="Historial del producto"
        >
          <button
            type="button"
            role="tab"
            class="border-b-2 px-3 py-3 text-sm font-medium"
            [class]="
              tab() === 'movements'
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            "
            [attr.aria-selected]="tab() === 'movements'"
            (click)="tab.set('movements')"
          >
            Movimientos
          </button>
          <button
            type="button"
            role="tab"
            class="border-b-2 px-3 py-3 text-sm font-medium"
            [class]="
              tab() === 'imports'
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            "
            [attr.aria-selected]="tab() === 'imports'"
            (click)="tab.set('imports')"
          >
            Importaciones
          </button>
        </div>

        @if (tab() === 'movements') {
          @if (movements.isLoading()) {
            <p class="px-4 py-10 text-center text-sm text-slate-500">Cargando…</p>
          } @else if (movementItems().length === 0) {
            <p class="px-4 py-10 text-center text-sm text-slate-500">
              Sin movimientos registrados.
            </p>
          } @else {
            <div class="table-wrap">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Motivo</th>
                    <th class="num">Cantidad</th>
                    <th class="num">Stock</th>
                    <th>Usuario</th>
                  </tr>
                </thead>
                <tbody>
                  @for (m of movementItems(); track m.id) {
                    <tr>
                      <td class="whitespace-nowrap text-slate-500">
                        {{ m.occurredAt | dateTime }}
                      </td>
                      <td>
                        <ui-badge [tone]="typeTone[m.type]">{{ typeLabel[m.type] }}</ui-badge>
                      </td>
                      <td>{{ reasonLabel[m.reason] }}</td>
                      <td
                        class="num font-medium"
                        [class]="m.quantity < 0 ? 'text-rose-600' : 'text-emerald-700'"
                      >
                        {{ m.quantity | signedQuantity }}
                      </td>
                      <td class="num">{{ m.stockAfter | quantity }}</td>
                      <td class="text-slate-500">{{ m.userName ?? '—' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <div class="border-t border-slate-100 px-4 py-3 text-right">
              <a
                class="btn btn-ghost btn-sm"
                [routerLink]="['/movements']"
                [queryParams]="{ productId: p.id }"
              >
                Ver todos los movimientos <ui-icon name="chevron-right" [size]="4" />
              </a>
            </div>
          }
        } @else {
          @if (imports.isLoading()) {
            <p class="px-4 py-10 text-center text-sm text-slate-500">Cargando…</p>
          } @else if (importItems().length === 0) {
            <p class="px-4 py-10 text-center text-sm text-slate-500">
              Este producto no está en ninguna importación.
            </p>
          } @else {
            <div class="table-wrap">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Importación</th>
                    <th>Proveedor</th>
                    <th>Estado</th>
                    <th class="num">Recibido</th>
                  </tr>
                </thead>
                <tbody>
                  @for (order of importItems(); track order.id) {
                    <tr class="row-link" [routerLink]="['/imports', order.id]">
                      <td class="font-medium text-slate-800">#{{ order.number }}</td>
                      <td>{{ order.supplierName ?? '—' }}</td>
                      <td>
                        <ui-badge [tone]="importTone[order.status]">{{
                          importLabel[order.status]
                        }}</ui-badge>
                      </td>
                      <td class="num">
                        {{ order.totalReceived | quantity }} / {{ order.totalOrdered | quantity }}
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        }
      </div>
    }
  `,
})
export class ProductDetailPage {
  private readonly api = inject(ProductsApi);
  private readonly dialog = inject(Dialog);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  readonly id = input.required({ transform: numberAttribute });

  protected readonly unitLabels = UNIT_LABELS;
  protected readonly typeLabel = MOVEMENT_TYPE_LABELS;
  protected readonly typeTone = MOVEMENT_TYPE_TONES;
  protected readonly reasonLabel = MOVEMENT_REASON_LABELS;
  protected readonly importLabel = IMPORT_STATUS_LABELS;
  protected readonly importTone = IMPORT_STATUS_TONES;

  protected readonly tab = signal<Tab>('movements');

  protected readonly product = rxResource({
    params: () => this.id(),
    stream: ({ params }) => this.api.get(params),
  });

  protected readonly movements = rxResource({
    params: () => this.id(),
    stream: ({ params }) => this.api.listProductMovements(params),
  });

  protected readonly imports = rxResource({
    params: () => this.id(),
    stream: ({ params }) => this.api.listProductImports(params),
  });

  protected readonly data = computed(() => (this.product.hasValue() ? this.product.value() : null));
  protected readonly movementItems = computed(() =>
    this.movements.hasValue() ? this.movements.value().items : [],
  );
  protected readonly importItems = computed(() =>
    this.imports.hasValue() ? this.imports.value().items : [],
  );

  private refresh(): void {
    this.product.reload();
    this.movements.reload();
    this.imports.reload();
  }

  protected async registerMovement(p: ProductDetail): Promise<void> {
    const registered = await firstValueFrom(
      openRegisterMovement(this.dialog, {
        product: { id: p.id, code: p.code, name: p.name, stock: p.stock, unit: p.unit },
      }).closed,
    );
    if (registered) this.refresh();
  }

  protected toggleActive(p: ProductDetail): void {
    this.api.update(p.id, { isActive: !p.isActive }).subscribe({
      next: () => {
        this.toast.success(p.isActive ? 'Producto desactivado.' : 'Producto activado.');
        this.product.reload();
      },
      error: (error: unknown) => this.toast.error(errorMessage(error)),
    });
  }

  protected async remove(p: ProductDetail): Promise<void> {
    const confirmed = await this.confirm.confirm({
      title: 'Eliminar producto',
      message: `¿Eliminar "${p.name}" (${p.code})? Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!confirmed) return;

    this.api.remove(p.id).subscribe({
      next: () => {
        this.toast.success('Producto eliminado.');
        void this.router.navigate(['/products']);
      },
      error: (error: unknown) => this.toast.error(errorMessage(error)),
    });
  }
}
