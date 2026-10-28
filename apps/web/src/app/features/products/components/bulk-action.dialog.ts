import { Dialog, DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { errorMessage } from '../../../core/http/api-utils';
import type { Category, CostCenter } from '../../../shared/models/models';
import { DialogFrameComponent } from '../../../shared/ui/dialog-frame.component';
import { FieldComponent } from '../../../shared/ui/layout.components';
import { ToastService } from '../../../shared/ui/toast.service';
import { buildCategoryOptions, type CategoryOption } from '../category-options';
import { ProductsApi, type BulkChanges } from '../products.api';

export type BulkAction = 'category' | 'costCenter' | 'stockLevels' | 'activation';

export interface BulkDialogData {
  action: BulkAction;
  ids: number[];
  categories: Category[];
  costCenters: CostCenter[];
}

const TITLES: Record<BulkAction, string> = {
  category: 'Asignar categoría',
  costCenter: 'Asignar centro de costo',
  stockLevels: 'Definir stock mínimo / reposición',
  activation: 'Activar / desactivar',
};

/** Opens a bulk-edit dialog for the selected products; resolves to true when applied. */
export function openBulkDialog(dialog: Dialog, data: BulkDialogData) {
  return dialog.open<boolean, BulkDialogData>(BulkActionDialog, {
    data,
    ariaModal: true,
    autoFocus: 'first-tabbable',
  });
}

@Component({
  selector: 'app-bulk-action-dialog',
  imports: [ReactiveFormsModule, DialogFrameComponent, FieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-dialog-frame [title]="title" [subtitle]="subtitle" width="30rem">
      <form id="bulk-form" class="space-y-4" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        @switch (data.action) {
          @case ('category') {
            <ui-field label="Categoría" for="bulk-category" [required]="true">
              <select id="bulk-category" class="input" formControlName="categoryId">
                <option [ngValue]="null">— Sin categoría —</option>
                @for (option of categoryOptions; track option.id) {
                  <option [ngValue]="option.id">{{ indent(option) }}{{ option.label }}</option>
                }
              </select>
            </ui-field>
          }
          @case ('costCenter') {
            <ui-field label="Centro de costo" for="bulk-cost-center" [required]="true">
              <select id="bulk-cost-center" class="input" formControlName="costCenterId">
                <option [ngValue]="null">— Sin centro de costo —</option>
                @for (center of data.costCenters; track center.id) {
                  <option [ngValue]="center.id">{{ center.name }}</option>
                }
              </select>
            </ui-field>
          }
          @case ('stockLevels') {
            <div class="grid gap-4 sm:grid-cols-2">
              <ui-field label="Stock mínimo" for="bulk-min">
                <input
                  id="bulk-min"
                  class="input"
                  type="number"
                  min="0"
                  step="1"
                  formControlName="minStock"
                />
              </ui-field>
              <ui-field label="Cantidad de reposición" for="bulk-reorder">
                <input
                  id="bulk-reorder"
                  class="input"
                  type="number"
                  min="0"
                  step="1"
                  formControlName="reorderQuantity"
                />
              </ui-field>
            </div>
            <p class="text-xs text-slate-500">Deja un campo vacío para no modificarlo.</p>
          }
          @case ('activation') {
            <ui-field label="Estado" for="bulk-active" [required]="true">
              <select id="bulk-active" class="input" formControlName="isActive">
                <option [ngValue]="true">Activar</option>
                <option [ngValue]="false">Desactivar</option>
              </select>
            </ui-field>
          }
        }

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
        <button type="submit" form="bulk-form" class="btn btn-primary" [disabled]="pending()">
          {{ pending() ? 'Aplicando…' : 'Aplicar' }}
        </button>
      </ng-container>
    </ui-dialog-frame>
  `,
})
export class BulkActionDialog {
  protected readonly data = inject<BulkDialogData>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<boolean>>(DialogRef);
  private readonly api = inject(ProductsApi);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly title = TITLES[this.data.action];
  protected readonly subtitle = `${this.data.ids.length} producto(s) seleccionado(s)`;
  protected readonly categoryOptions = buildCategoryOptions(this.data.categories);

  protected readonly pending = signal(false);
  protected readonly serverError = signal<string | null>(null);

  protected readonly form = this.fb.group({
    categoryId: [null as number | null],
    costCenterId: [null as number | null],
    minStock: [null as number | null, [Validators.min(0)]],
    reorderQuantity: [null as number | null, [Validators.min(0)]],
    isActive: [true],
  });

  protected indent(option: CategoryOption): string {
    return option.depth > 0 ? '\u00A0\u00A0\u00A0\u00A0' : '';
  }

  private buildChanges(): BulkChanges | null {
    const value = this.form.getRawValue();
    switch (this.data.action) {
      case 'category':
        return { categoryId: value.categoryId ?? null };
      case 'costCenter':
        return { costCenterId: value.costCenterId ?? null };
      case 'stockLevels': {
        const changes: BulkChanges = {};
        if (value.minStock !== null && value.minStock !== undefined)
          changes.minStock = Number(value.minStock);
        if (value.reorderQuantity !== null && value.reorderQuantity !== undefined)
          changes.reorderQuantity = Number(value.reorderQuantity);
        return Object.keys(changes).length > 0 ? changes : null;
      }
      case 'activation':
        return { isActive: value.isActive };
    }
  }

  protected submit(): void {
    if (this.pending()) return;
    const changes = this.buildChanges();
    if (!changes) {
      this.serverError.set('Indica al menos un valor para aplicar.');
      return;
    }

    this.pending.set(true);
    this.serverError.set(null);
    this.api.bulkUpdate(this.data.ids, changes).subscribe({
      next: () => {
        this.toast.success('Productos actualizados.');
        this.ref.close(true);
      },
      error: (error: unknown) => {
        this.pending.set(false);
        this.serverError.set(errorMessage(error));
      },
    });
  }
}
