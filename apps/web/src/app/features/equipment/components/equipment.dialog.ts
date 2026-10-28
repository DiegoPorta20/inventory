import { Dialog, DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { errorMessage, fieldErrors } from '../../../core/http/api-utils';
import type { EquipmentModel } from '../../../shared/models/models';
import { DialogFrameComponent } from '../../../shared/ui/dialog-frame.component';
import { FieldComponent } from '../../../shared/ui/layout.components';
import { ToastService } from '../../../shared/ui/toast.service';
import { EquipmentApi } from '../equipment.api';

export interface EquipmentDialogData {
  model?: EquipmentModel;
}

/** Opens the create/edit dialog; resolves to true when a model was saved. */
export function openEquipmentDialog(dialog: Dialog, data: EquipmentDialogData = {}) {
  return dialog.open<boolean, EquipmentDialogData>(EquipmentDialog, {
    data,
    ariaModal: true,
    autoFocus: 'first-tabbable',
  });
}

@Component({
  selector: 'app-equipment-dialog',
  imports: [ReactiveFormsModule, DialogFrameComponent, FieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-dialog-frame [title]="isEdit ? 'Editar equipo' : 'Nuevo equipo'" width="34rem">
      <form
        id="equipment-form"
        class="space-y-4"
        [formGroup]="form"
        (ngSubmit)="submit()"
        novalidate
      >
        <ui-field label="Nombre" for="equipment-name" [required]="true" [error]="errors()['name']">
          <input
            id="equipment-name"
            class="input"
            formControlName="name"
            maxlength="160"
            autocomplete="off"
          />
        </ui-field>
        <ui-field label="Marca" for="equipment-brand" [error]="errors()['brand']">
          <input
            id="equipment-brand"
            class="input"
            formControlName="brand"
            maxlength="80"
            autocomplete="off"
          />
        </ui-field>
        <ui-field label="Descripción" for="equipment-description" [error]="errors()['description']">
          <textarea
            id="equipment-description"
            class="input"
            rows="3"
            formControlName="description"
            maxlength="2000"
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
        <button type="submit" form="equipment-form" class="btn btn-primary" [disabled]="pending()">
          {{ pending() ? 'Guardando…' : 'Guardar' }}
        </button>
      </ng-container>
    </ui-dialog-frame>
  `,
})
export class EquipmentDialog {
  protected readonly data = inject<EquipmentDialogData>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<boolean>>(DialogRef);
  private readonly api = inject(EquipmentApi);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly isEdit = !!this.data.model;
  protected readonly pending = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly errors = signal<Record<string, string>>({});

  protected readonly form = this.fb.group({
    name: [this.data.model?.name ?? '', [Validators.required, Validators.maxLength(160)]],
    brand: [this.data.model?.brand ?? ''],
    description: [this.data.model?.description ?? ''],
  });

  protected submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.pending()) return;

    const value = this.form.getRawValue();
    const payload = {
      name: value.name.trim(),
      brand: value.brand.trim() || null,
      description: value.description.trim() || null,
    };

    this.pending.set(true);
    this.serverError.set(null);
    this.errors.set({});

    const request = this.data.model
      ? this.api.update(this.data.model.id, payload)
      : this.api.create(payload);

    request.subscribe({
      next: () => {
        this.toast.success(this.isEdit ? 'Equipo actualizado.' : 'Equipo creado.');
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
