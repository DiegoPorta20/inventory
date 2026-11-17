import { Dialog, DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { errorMessage } from '../../../core/http/api-utils';
import type { ImportOrderDetail } from '../../../shared/models/models';
import { FORMAT_PIPES } from '../../../shared/pipes/format.pipes';
import { DialogFrameComponent } from '../../../shared/ui/dialog-frame.component';
import { FieldComponent } from '../../../shared/ui/layout.components';
import { ToastService } from '../../../shared/ui/toast.service';
import { ImportsApi, type ReceiveLine } from '../imports.api';
import { DateInputComponent } from '../../../shared/ui/date-input.component';

export interface ReceiveDialogData {
  order: ImportOrderDetail;
}

interface ReceiveRow {
  itemId: number;
  code: string;
  name: string;
  ordered: number;
  quantity: number;
}

/** Opens the receive dialog; resolves to true when the goods were received. */
export function openReceiveDialog(dialog: Dialog, data: ReceiveDialogData) {
  return dialog.open<boolean, ReceiveDialogData>(ReceiveImportDialog, {
    data,
    ariaModal: true,
    autoFocus: 'first-tabbable',
  });
}

@Component({
  selector: 'app-receive-import-dialog',
  imports: [DateInputComponent, FormsModule, FORMAT_PIPES, DialogFrameComponent, FieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-dialog-frame
      title="Recibir mercadería"
      subtitle="Confirma las cantidades recibidas por línea."
      width="42rem"
    >
      <div class="space-y-4">
        <ui-field
          label="Fecha de recepción"
          for="receive-date"
          hint="Si se deja vacío, se usa la fecha actual."
        >
          <ui-date-input class="w-52" inputId="receive-date" [(value)]="receivedAt" />
        </ui-field>

        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th class="num">Pedido</th>
                <th class="num">Recibido</th>
              </tr>
            </thead>
            <tbody>
              @for (row of rows(); track row.itemId; let i = $index) {
                <tr>
                  <td>
                    <span class="block max-w-xs truncate font-medium text-slate-800">{{
                      row.name
                    }}</span>
                    <span class="text-xs text-slate-500">{{ row.code }}</span>
                  </td>
                  <td class="num text-slate-600">{{ row.ordered | quantity }}</td>
                  <td class="num">
                    <input
                      class="input w-28 text-right"
                      type="number"
                      min="0"
                      step="1"
                      [attr.aria-label]="'Cantidad recibida de ' + row.name"
                      [ngModel]="row.quantity"
                      (ngModelChange)="setQuantity(i, $event)"
                    />
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        @if (serverError()) {
          <p
            class="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
            role="alert"
          >
            {{ serverError() }}
          </p>
        }
      </div>

      <ng-container dialog-actions>
        <button type="button" class="btn btn-secondary" (click)="ref.close(false)">Cancelar</button>
        <button type="button" class="btn btn-primary" [disabled]="pending()" (click)="submit()">
          {{ pending() ? 'Recibiendo…' : 'Confirmar recepción' }}
        </button>
      </ng-container>
    </ui-dialog-frame>
  `,
})
export class ReceiveImportDialog {
  protected readonly data = inject<ReceiveDialogData>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<boolean>>(DialogRef);
  private readonly api = inject(ImportsApi);
  private readonly toast = inject(ToastService);

  protected receivedAt = '';
  protected readonly pending = signal(false);
  protected readonly serverError = signal<string | null>(null);

  protected readonly rows = signal<ReceiveRow[]>(
    this.data.order.items.map((item) => ({
      itemId: item.id,
      code: item.productCode,
      name: item.productName,
      ordered: item.quantityOrdered,
      quantity: item.quantityOrdered,
    })),
  );

  protected readonly total = computed(() =>
    this.rows().reduce((sum, row) => sum + row.quantity, 0),
  );

  protected setQuantity(index: number, value: number): void {
    const next = Math.max(0, Math.floor(Number(value) || 0));
    this.rows.update((rows) =>
      rows.map((row, i) => (i === index ? { ...row, quantity: next } : row)),
    );
  }

  protected submit(): void {
    if (this.pending()) return;
    const lines: ReceiveLine[] = this.rows().map((row) => ({
      itemId: row.itemId,
      quantityReceived: row.quantity,
    }));

    this.pending.set(true);
    this.serverError.set(null);
    this.api
      .receive(this.data.order.id, {
        receivedAt: this.receivedAt || undefined,
        lines,
      })
      .subscribe({
        next: () => {
          this.toast.success('Mercadería recibida.');
          this.ref.close(true);
        },
        error: (error: unknown) => {
          this.pending.set(false);
          this.serverError.set(errorMessage(error));
        },
      });
  }
}
