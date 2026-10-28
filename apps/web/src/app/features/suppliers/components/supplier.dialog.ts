import { Dialog, DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { errorMessage, fieldErrors } from '../../../core/http/api-utils';
import type { Supplier } from '../../../shared/models/models';
import { DialogFrameComponent } from '../../../shared/ui/dialog-frame.component';
import { FieldComponent } from '../../../shared/ui/layout.components';
import { ToastService } from '../../../shared/ui/toast.service';
import { SuppliersApi } from '../suppliers.api';

export interface SupplierDialogData {
  supplier?: Supplier;
}

/** Opens the create/edit dialog; resolves to true when a supplier was saved. */
export function openSupplierDialog(dialog: Dialog, data: SupplierDialogData = {}) {
  return dialog.open<boolean, SupplierDialogData>(SupplierDialog, {
    data,
    ariaModal: true,
    autoFocus: 'first-tabbable',
  });
}

@Component({
  selector: 'app-supplier-dialog',
  imports: [ReactiveFormsModule, DialogFrameComponent, FieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-dialog-frame [title]="isEdit ? 'Editar proveedor' : 'Nuevo proveedor'" width="36rem">
      <form
        id="supplier-form"
        class="grid gap-4 sm:grid-cols-2"
        [formGroup]="form"
        (ngSubmit)="submit()"
        novalidate
      >
        <div class="sm:col-span-2">
          <ui-field label="Nombre" for="supplier-name" [required]="true" [error]="errors()['name']">
            <input
              id="supplier-name"
              class="input"
              formControlName="name"
              maxlength="160"
              autocomplete="off"
            />
          </ui-field>
        </div>
        <ui-field label="País" for="supplier-country" [error]="errors()['country']">
          <input
            id="supplier-country"
            class="input"
            formControlName="country"
            maxlength="80"
            autocomplete="off"
          />
        </ui-field>
        <ui-field label="Contacto" for="supplier-contact" [error]="errors()['contactName']">
          <input
            id="supplier-contact"
            class="input"
            formControlName="contactName"
            maxlength="120"
            autocomplete="off"
          />
        </ui-field>
        <ui-field label="Correo" for="supplier-email" [error]="errors()['email']">
          <input
            id="supplier-email"
            class="input"
            type="email"
            formControlName="email"
            maxlength="190"
            autocomplete="off"
          />
        </ui-field>
        <ui-field label="Teléfono" for="supplier-phone" [error]="errors()['phone']">
          <input
            id="supplier-phone"
            class="input"
            formControlName="phone"
            maxlength="40"
            autocomplete="off"
          />
        </ui-field>
        <div class="sm:col-span-2">
          <ui-field label="Notas" for="supplier-notes" [error]="errors()['notes']">
            <textarea
              id="supplier-notes"
              class="input"
              rows="2"
              formControlName="notes"
              maxlength="2000"
            ></textarea>
          </ui-field>
        </div>
        <label class="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
          <input
            type="checkbox"
            class="h-4 w-4 rounded border-slate-300"
            formControlName="isActive"
          />
          Proveedor activo
        </label>

        @if (serverError()) {
          <p
            class="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 sm:col-span-2"
            role="alert"
          >
            {{ serverError() }}
          </p>
        }
      </form>

      <ng-container dialog-actions>
        <button type="button" class="btn btn-secondary" (click)="ref.close(false)">Cancelar</button>
        <button type="submit" form="supplier-form" class="btn btn-primary" [disabled]="pending()">
          {{ pending() ? 'Guardando…' : 'Guardar' }}
        </button>
      </ng-container>
    </ui-dialog-frame>
  `,
})
export class SupplierDialog {
  protected readonly data = inject<SupplierDialogData>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<boolean>>(DialogRef);
  private readonly api = inject(SuppliersApi);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly isEdit = !!this.data.supplier;
  protected readonly pending = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly errors = signal<Record<string, string>>({});

  protected readonly form = this.fb.group({
    name: [this.data.supplier?.name ?? '', [Validators.required, Validators.maxLength(160)]],
    country: [this.data.supplier?.country ?? ''],
    contactName: [this.data.supplier?.contactName ?? ''],
    email: [this.data.supplier?.email ?? ''],
    phone: [this.data.supplier?.phone ?? ''],
    notes: [this.data.supplier?.notes ?? ''],
    isActive: [this.data.supplier?.isActive ?? true],
  });

  protected submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.pending()) return;

    const value = this.form.getRawValue();
    const payload = {
      name: value.name.trim(),
      country: value.country.trim() || null,
      contactName: value.contactName.trim() || null,
      email: value.email.trim() || null,
      phone: value.phone.trim() || null,
      notes: value.notes.trim() || null,
      isActive: value.isActive,
    };

    this.pending.set(true);
    this.serverError.set(null);
    this.errors.set({});

    const request = this.data.supplier
      ? this.api.update(this.data.supplier.id, payload)
      : this.api.create(payload);

    request.subscribe({
      next: () => {
        this.toast.success(this.isEdit ? 'Proveedor actualizado.' : 'Proveedor creado.');
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
