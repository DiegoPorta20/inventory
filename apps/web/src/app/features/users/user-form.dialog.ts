import { Dialog, DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { errorMessage, fieldErrors } from '../../core/http/api-utils';
import { ROLE_LABELS, entries } from '../../shared/models/labels';
import type { Role, User } from '../../shared/models/models';
import { DialogFrameComponent } from '../../shared/ui/dialog-frame.component';
import { FieldComponent } from '../../shared/ui/layout.components';
import { ToastService } from '../../shared/ui/toast.service';
import { UsersApi } from './users.api';

export interface UserDialogData {
  user?: User;
  isSelf?: boolean;
}

export function openUserDialog(dialog: Dialog, data: UserDialogData = {}) {
  return dialog.open<boolean, UserDialogData>(UserFormDialog, {
    data,
    ariaModal: true,
    autoFocus: 'first-tabbable',
  });
}

@Component({
  selector: 'app-user-form-dialog',
  imports: [ReactiveFormsModule, DialogFrameComponent, FieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-dialog-frame
      [title]="isEdit() ? 'Editar usuario' : 'Nuevo usuario'"
      [subtitle]="
        isEdit() ? 'Actualiza los datos del usuario.' : 'Crea una cuenta de acceso al sistema.'
      "
      width="30rem"
    >
      <form id="user-form" class="space-y-4" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <ui-field label="Nombre" for="user-name" [required]="true" [error]="controlError('name')">
          <input
            id="user-name"
            class="input"
            formControlName="name"
            maxlength="120"
            autocomplete="name"
          />
        </ui-field>

        @if (!isEdit()) {
          <ui-field
            label="Correo electrónico"
            for="user-email"
            [required]="true"
            [error]="controlError('email')"
          >
            <input
              id="user-email"
              class="input"
              type="email"
              formControlName="email"
              maxlength="190"
              autocomplete="email"
            />
          </ui-field>
        }

        <ui-field
          [label]="isEdit() ? 'Nueva contraseña (opcional)' : 'Contraseña'"
          for="user-password"
          [required]="!isEdit()"
          [error]="controlError('password')"
          [hint]="'Mínimo 8 caracteres.'"
        >
          <input
            id="user-password"
            class="input"
            type="password"
            formControlName="password"
            maxlength="128"
            autocomplete="new-password"
          />
        </ui-field>

        <ui-field label="Rol" for="user-role" [required]="true" [error]="controlError('role')">
          <select id="user-role" class="input" formControlName="role">
            @for (r of roleOptions; track r.value) {
              <option [value]="r.value">{{ r.label }}</option>
            }
          </select>
        </ui-field>

        @if (isEdit()) {
          <label class="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              class="h-4 w-4 rounded border-slate-300"
              formControlName="isActive"
              [disabled]="isSelf()"
            />
            Usuario activo
          </label>
          @if (isSelf()) {
            <p class="text-xs text-slate-500">
              No puedes desactivar tu propia cuenta ni cambiar tu rol.
            </p>
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
        <button type="submit" form="user-form" class="btn btn-primary" [disabled]="pending()">
          {{ pending() ? 'Guardando…' : isEdit() ? 'Guardar' : 'Crear' }}
        </button>
      </ng-container>
    </ui-dialog-frame>
  `,
})
export class UserFormDialog {
  protected readonly data = inject<UserDialogData>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<boolean>>(DialogRef);
  private readonly api = inject(UsersApi);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly roleOptions = entries(ROLE_LABELS);
  protected readonly isEdit = computed(() => !!this.data.user);
  protected readonly isSelf = signal(this.data.isSelf ?? false);
  protected readonly pending = signal(false);
  protected readonly serverError = signal<string | null>(null);
  private readonly serverErrors = signal<Record<string, string>>({});

  protected readonly form = this.fb.group({
    name: [this.data.user?.name ?? '', [Validators.required, Validators.maxLength(120)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', this.data.user ? [] : [Validators.required, Validators.minLength(8)]],
    role: [(this.data.user?.role ?? 'ADMIN') as Role, Validators.required],
    isActive: [this.data.user?.isActive ?? true],
  });

  constructor() {
    if (this.isSelf()) {
      this.form.controls.role.disable();
      this.form.controls.isActive.disable();
    }
  }

  protected controlError(name: 'name' | 'email' | 'password' | 'role'): string | null {
    const control = this.form.controls[name];
    if (control.touched && control.invalid) {
      if (control.hasError('required')) return 'Este campo es obligatorio.';
      if (control.hasError('email')) return 'Ingresa un correo válido.';
      if (control.hasError('minlength')) return 'Mínimo 8 caracteres.';
    }
    return this.serverErrors()[name] ?? null;
  }

  protected submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.pending()) return;

    const value = this.form.getRawValue();
    this.pending.set(true);
    this.serverError.set(null);
    this.serverErrors.set({});

    const request = this.data.user
      ? this.api.update(this.data.user.id, {
          name: value.name.trim(),
          role: this.isSelf() ? undefined : value.role,
          isActive: this.isSelf() ? undefined : value.isActive,
          password: value.password.trim() || undefined,
        })
      : this.api.create({
          name: value.name.trim(),
          email: value.email.trim(),
          password: value.password,
          role: value.role,
        });

    request.subscribe({
      next: () => {
        this.toast.success(this.isEdit() ? 'Usuario actualizado.' : 'Usuario creado.');
        this.ref.close(true);
      },
      error: (error: unknown) => {
        this.pending.set(false);
        this.serverErrors.set(fieldErrors(error));
        this.serverError.set(errorMessage(error));
      },
    });
  }
}
