import { Dialog, DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { errorMessage, fieldErrors } from '../../../core/http/api-utils';
import type { CostCenter } from '../../../shared/models/models';
import { DialogFrameComponent } from '../../../shared/ui/dialog-frame.component';
import { FieldComponent } from '../../../shared/ui/layout.components';
import { ToastService } from '../../../shared/ui/toast.service';
import { CostCentersApi } from '../cost-centers.api';

export interface CostCenterDialogData {
  costCenter?: CostCenter;
}

/** Opens the create/rename dialog; resolves to true when a cost center was saved. */
export function openCostCenterDialog(dialog: Dialog, data: CostCenterDialogData = {}) {
  return dialog.open<boolean, CostCenterDialogData>(CostCenterDialog, {
    data,
    ariaModal: true,
    autoFocus: 'first-tabbable',
  });
}

@Component({
  selector: 'app-cost-center-dialog',
  imports: [ReactiveFormsModule, DialogFrameComponent, FieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-dialog-frame
      [title]="isEdit ? 'Renombrar centro de costo' : 'Nuevo centro de costo'"
      width="30rem"
    >
      <form
        id="cost-center-form"
        class="space-y-4"
        [formGroup]="form"
        (ngSubmit)="submit()"
        novalidate
      >
        <ui-field
          label="Nombre"
          for="cost-center-name"
          hint="Línea de negocio (p. ej. Minidumper, Repuesto Jumbo)."
          [required]="true"
          [error]="errors()['name']"
        >
          <input
            id="cost-center-name"
            class="input"
            formControlName="name"
            maxlength="120"
            autocomplete="off"
          />
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
        <button
          type="submit"
          form="cost-center-form"
          class="btn btn-primary"
          [disabled]="pending()"
        >
          {{ pending() ? 'Guardando…' : 'Guardar' }}
        </button>
      </ng-container>
    </ui-dialog-frame>
  `,
})
export class CostCenterDialog {
  protected readonly data = inject<CostCenterDialogData>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<boolean>>(DialogRef);
  private readonly api = inject(CostCentersApi);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly isEdit = !!this.data.costCenter;
  protected readonly pending = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly errors = signal<Record<string, string>>({});

  protected readonly form = this.fb.group({
    name: [this.data.costCenter?.name ?? '', [Validators.required, Validators.maxLength(120)]],
  });

  protected submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.pending()) return;

    const payload = { name: this.form.getRawValue().name.trim() };

    this.pending.set(true);
    this.serverError.set(null);
    this.errors.set({});

    const request = this.data.costCenter
      ? this.api.update(this.data.costCenter.id, payload)
      : this.api.create(payload);

    request.subscribe({
      next: () => {
        this.toast.success(
          this.isEdit ? 'Centro de costo actualizado.' : 'Centro de costo creado.',
        );
        this.ref.close(true);
      },
      error: (error: unknown) => {
        this.pending.set(false);
        this.errors.set(fieldErrors(error));
        this.serverError.set(errorMessage(error));
      },
    });
  }
}
