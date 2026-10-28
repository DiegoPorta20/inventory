import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { errorMessage } from '../../../core/http/api-utils';
import { IMPORT_STATUS_LABELS, IMPORT_STATUS_TONES } from '../../../shared/models/labels';
import type { ImportStatus } from '../../../shared/models/models';
import { FORMAT_PIPES } from '../../../shared/pipes/format.pipes';
import { BadgeComponent } from '../../../shared/ui/badge.components';
import { ConfirmService } from '../../../shared/ui/confirm.service';
import { IconComponent } from '../../../shared/ui/icon.component';
import { PageHeaderComponent } from '../../../shared/ui/layout.components';
import { ErrorStateComponent } from '../../../shared/ui/states.components';
import { ToastService } from '../../../shared/ui/toast.service';
import { openReceiveDialog } from '../components/receive-import.dialog';
import { ImportsApi } from '../imports.api';

@Component({
  selector: 'app-import-detail-page',
  imports: [
    RouterLink,
    FORMAT_PIPES,
    BadgeComponent,
    IconComponent,
    PageHeaderComponent,
    ErrorStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (order.isLoading()) {
      <div class="space-y-4" aria-busy="true">
        <div class="skeleton h-8 w-48"></div>
        <div class="card p-6"><div class="skeleton h-40 w-full"></div></div>
      </div>
    } @else if (order.error()) {
      <div class="card">
        <ui-error-state [message]="errorText()">
          <button type="button" class="btn btn-secondary" (click)="order.reload()">
            Reintentar
          </button>
        </ui-error-state>
      </div>
    } @else if (data(); as o) {
      <ui-page-header [title]="'Importación #' + o.number">
        <a class="btn btn-ghost" routerLink="/imports"
          ><ui-icon name="chevron-left" [size]="4" /> Volver</a
        >
        @if (o.status === 'DRAFT') {
          <button
            type="button"
            class="btn btn-secondary"
            [disabled]="busy()"
            (click)="setStatus('ORDERED')"
          >
            Marcar como pedido
          </button>
        }
        @if (o.status === 'ORDERED') {
          <button
            type="button"
            class="btn btn-secondary"
            [disabled]="busy()"
            (click)="setStatus('IN_TRANSIT')"
          >
            Marcar en tránsito
          </button>
        }
        @if (canReceive(o.status)) {
          <button type="button" class="btn btn-primary" [disabled]="busy()" (click)="receive()">
            <ui-icon name="download" [size]="4" /> Recibir mercadería
          </button>
        }
        @if (editable(o.status)) {
          <a class="btn btn-secondary" [routerLink]="['/imports', o.id, 'edit']">
            <ui-icon name="edit" [size]="4" /> Editar
          </a>
        }
        @if (isOpen(o.status)) {
          <button
            type="button"
            class="btn btn-ghost text-rose-600"
            [disabled]="busy()"
            (click)="cancel()"
          >
            Cancelar
          </button>
        }
        @if (o.status === 'DRAFT') {
          <button
            type="button"
            class="btn btn-ghost text-rose-600"
            [disabled]="busy()"
            (click)="remove()"
          >
            <ui-icon name="trash" [size]="4" /> Eliminar
          </button>
        }
      </ui-page-header>

      <div class="grid gap-4 lg:grid-cols-4">
        <section class="card p-4 lg:col-span-3">
          <div class="mb-3 flex items-center gap-3">
            <ui-badge [tone]="statusTone[o.status]">{{ statusLabel[o.status] }}</ui-badge>
            <a
              class="btn btn-ghost btn-sm"
              [routerLink]="['/movements']"
              [queryParams]="{ referenceType: 'IMPORT_ORDER', referenceId: o.id }"
            >
              <ui-icon name="swap" [size]="4" /> Ver movimientos de stock
            </a>
          </div>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th class="num">Pedido</th>
                  <th class="num">Recibido</th>
                  <th class="num">Costo unit.</th>
                  <th class="num">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                @for (item of o.items; track item.id) {
                  <tr>
                    <td>
                      <a
                        class="block max-w-xs truncate font-medium text-slate-800 hover:text-brand-700"
                        [routerLink]="['/products', item.productId]"
                      >
                        {{ item.productName }}
                      </a>
                      <span class="text-xs text-slate-500">{{ item.productCode }}</span>
                    </td>
                    <td class="num">{{ item.quantityOrdered | quantity }}</td>
                    <td class="num">{{ item.quantityReceived | quantity }}</td>
                    <td class="num">{{ item.unitCostUsd | usd: true }}</td>
                    <td class="num font-medium">
                      {{ subtotal(item.quantityOrdered, item.unitCostUsd) | usd }}
                    </td>
                  </tr>
                }
              </tbody>
              <tfoot>
                <tr class="border-t border-slate-200 font-semibold">
                  <td>Total</td>
                  <td class="num">{{ o.totalOrdered | quantity }}</td>
                  <td class="num">{{ o.totalReceived | quantity }}</td>
                  <td></td>
                  <td class="num">{{ o.totalCostUsd | usd }}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        <aside class="card h-fit p-4">
          <h2 class="section-title mb-3">Datos</h2>
          <dl class="space-y-3 text-sm">
            <div>
              <dt class="text-slate-500">Proveedor</dt>
              <dd class="font-medium text-slate-800">{{ o.supplierName ?? '—' }}</dd>
            </div>
            <div>
              <dt class="text-slate-500">Referencia</dt>
              <dd class="text-slate-800">{{ o.reference ?? '—' }}</dd>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <dt class="text-slate-500">Pedido</dt>
                <dd class="text-slate-800">{{ o.orderedAt | dateOnly }}</dd>
              </div>
              <div>
                <dt class="text-slate-500">Esperado</dt>
                <dd class="text-slate-800">{{ o.expectedAt | dateOnly }}</dd>
              </div>
              <div>
                <dt class="text-slate-500">Recibido</dt>
                <dd class="text-slate-800">{{ o.receivedAt | dateOnly }}</dd>
              </div>
              <div>
                <dt class="text-slate-500">T.C.</dt>
                <dd class="text-slate-800 tabular-nums">{{ o.exchangeRate ?? '—' }}</dd>
              </div>
            </div>
            @if (o.notes) {
              <div>
                <dt class="text-slate-500">Notas</dt>
                <dd class="whitespace-pre-line text-slate-700">{{ o.notes }}</dd>
              </div>
            }
          </dl>
        </aside>
      </div>
    }
  `,
})
export class ImportDetailPage {
  readonly id = input.required<number>();

  private readonly api = inject(ImportsApi);
  private readonly dialog = inject(Dialog);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly statusLabel = IMPORT_STATUS_LABELS;
  protected readonly statusTone = IMPORT_STATUS_TONES;

  protected readonly order = rxResource({
    params: () => ({ id: this.id() }),
    stream: ({ params }) => this.api.get(params.id),
  });
  protected readonly data = computed(() => (this.order.hasValue() ? this.order.value() : null));
  protected readonly errorText = computed(() => errorMessage(this.order.error()));
  protected readonly busy = computed(() => this.order.isLoading());

  protected subtotal(qty: number, unitCost: number | null): number | null {
    return unitCost == null ? null : qty * unitCost;
  }

  protected editable(status: ImportStatus): boolean {
    return status === 'DRAFT' || status === 'ORDERED' || status === 'IN_TRANSIT';
  }

  protected isOpen(status: ImportStatus): boolean {
    return status !== 'RECEIVED' && status !== 'CANCELLED';
  }

  protected canReceive(status: ImportStatus): boolean {
    return status === 'ORDERED' || status === 'IN_TRANSIT';
  }

  protected setStatus(status: ImportStatus): void {
    this.api.changeStatus(this.id(), status).subscribe({
      next: () => {
        this.toast.success('Estado actualizado.');
        this.order.reload();
      },
      error: (error: unknown) => this.toast.error(errorMessage(error)),
    });
  }

  protected receive(): void {
    const order = this.data();
    if (!order) return;
    openReceiveDialog(this.dialog, { order }).closed.subscribe((received) => {
      if (received) this.order.reload();
    });
  }

  protected async cancel(): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Cancelar importación',
      message: '¿Seguro que deseas cancelar esta importación?',
      confirmLabel: 'Cancelar importación',
      cancelLabel: 'Volver',
      danger: true,
    });
    if (!ok) return;
    this.setStatus('CANCELLED');
  }

  protected async remove(): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Eliminar importación',
      message: 'Esta acción no se puede deshacer. ¿Eliminar el borrador?',
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!ok) return;
    this.api.remove(this.id()).subscribe({
      next: () => {
        this.toast.success('Importación eliminada.');
        void this.router.navigate(['/imports']);
      },
      error: (error: unknown) => this.toast.error(errorMessage(error)),
    });
  }
}
