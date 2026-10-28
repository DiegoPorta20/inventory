import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { errorMessage } from '../../core/http/api-utils';
import { AuthService } from '../../core/auth/auth.service';
import { FieldComponent, PageHeaderComponent } from '../../shared/ui/layout.components';
import { ToastService } from '../../shared/ui/toast.service';

@Component({
  selector: 'app-account-page',
  imports: [ReactiveFormsModule, PageHeaderComponent, FieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-page-header title="Mi cuenta" subtitle="Datos de tu sesión y seguridad." />

    <div class="grid max-w-3xl gap-5 md:grid-cols-2">
      <section class="card p-5">
        <h2 class="card-title">Perfil</h2>
        <dl class="mt-3 space-y-3 text-sm">
          <div>
            <dt class="text-xs text-slate-500">Nombre</dt>
            <dd class="font-medium">{{ auth.user()?.name }}</dd>
          </div>
          <div>
            <dt class="text-xs text-slate-500">Correo</dt>
            <dd class="font-medium">{{ auth.user()?.email }}</dd>
          </div>
        </dl>
      </section>

      <form class="card space-y-4 p-5" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <h2 class="card-title">Cambiar contraseña</h2>
        <ui-field label="Contraseña actual" for="current" [error]="serverError()">
          <input
            id="current"
            class="input"
            type="password"
            formControlName="currentPassword"
            autocomplete="current-password"
          />
        </ui-field>
        <ui-field
          label="Nueva contraseña"
          for="next"
          hint="Mínimo 8 caracteres."
          [error]="
            form.controls.newPassword.touched && form.controls.newPassword.invalid
              ? 'Usa al menos 8 caracteres.'
              : null
          "
        >
          <input
            id="next"
            class="input"
            type="password"
            formControlName="newPassword"
            autocomplete="new-password"
          />
        </ui-field>
        <button type="submit" class="btn btn-primary" [disabled]="pending()">
          Actualizar contraseña
        </button>
      </form>
    </div>
  `,
})
export class AccountPage {
  protected readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly pending = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly form = this.fb.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
  });

  protected submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.pending()) return;

    this.pending.set(true);
    this.serverError.set(null);
    const { currentPassword, newPassword } = this.form.getRawValue();
    this.auth.changePassword(currentPassword, newPassword).subscribe({
      next: () => {
        this.pending.set(false);
        this.form.reset();
        this.toast.success('Contraseña actualizada.');
      },
      error: (error: unknown) => {
        this.pending.set(false);
        this.serverError.set(errorMessage(error));
      },
    });
  }
}
