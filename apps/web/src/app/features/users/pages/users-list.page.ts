import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { ROLE_LABELS } from '../../../shared/models/labels';
import type { User } from '../../../shared/models/models';
import { FORMAT_PIPES } from '../../../shared/pipes/format.pipes';
import { BadgeComponent } from '../../../shared/ui/badge.components';
import { IconComponent } from '../../../shared/ui/icon.component';
import { PageHeaderComponent } from '../../../shared/ui/layout.components';
import {
  EmptyStateComponent,
  ErrorStateComponent,
  TableSkeletonComponent,
} from '../../../shared/ui/states.components';
import { UsersApi } from '../users.api';
import { openUserDialog } from '../user-form.dialog';

@Component({
  selector: 'app-users-list-page',
  imports: [
    FORMAT_PIPES,
    BadgeComponent,
    IconComponent,
    PageHeaderComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-page-header title="Usuarios" subtitle="Cuentas con acceso al sistema.">
      <button type="button" class="btn btn-primary magnetic" (click)="create()">
        <ui-icon name="plus" [size]="4" /> Nuevo usuario
      </button>
    </ui-page-header>

    <div class="card">
      @if (users.isLoading()) {
        <ui-table-skeleton [rows]="6" [cols]="5" />
      } @else if (users.error()) {
        <ui-error-state>
          <button type="button" class="btn btn-secondary" (click)="users.reload()">
            Reintentar
          </button>
        </ui-error-state>
      } @else if (data(); as list) {
        @if (list.length === 0) {
          <ui-empty-state
            icon="users"
            title="Sin usuarios"
            description="Crea la primera cuenta de acceso."
          >
            <button type="button" class="btn btn-primary" (click)="create()">
              <ui-icon name="plus" [size]="4" /> Nuevo usuario
            </button>
          </ui-empty-state>
        } @else {
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th scope="col">Nombre</th>
                  <th scope="col">Correo</th>
                  <th scope="col">Rol</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Último acceso</th>
                  <th scope="col" class="w-10"><span class="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                @for (u of list; track u.id) {
                  <tr>
                    <td class="font-medium text-slate-800">
                      {{ u.name }}
                      @if (isSelf(u)) {
                        <span class="ml-1 text-xs text-slate-400">(tú)</span>
                      }
                    </td>
                    <td class="text-slate-600">{{ u.email }}</td>
                    <td>
                      <ui-badge tone="brand">{{ roleLabel(u.role) }}</ui-badge>
                    </td>
                    <td>
                      @if (u.isActive) {
                        <ui-badge tone="success">Activo</ui-badge>
                      } @else {
                        <ui-badge tone="neutral">Inactivo</ui-badge>
                      }
                    </td>
                    <td class="whitespace-nowrap text-slate-500">
                      {{ u.lastLoginAt ? (u.lastLoginAt | dateTime) : 'Nunca' }}
                    </td>
                    <td>
                      <button
                        type="button"
                        class="btn btn-ghost btn-icon"
                        [attr.aria-label]="'Editar ' + u.name"
                        (click)="edit(u)"
                      >
                        <ui-icon name="edit" [size]="4" />
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      }
    </div>
  `,
})
export class UsersListPage {
  private readonly api = inject(UsersApi);
  private readonly dialog = inject(Dialog);
  private readonly auth = inject(AuthService);

  protected readonly users = rxResource<User[], void>({
    stream: () => this.api.list(),
  });
  protected readonly data = computed(() => (this.users.hasValue() ? this.users.value() : null));

  protected roleLabel(role: string): string {
    return ROLE_LABELS[role] ?? role;
  }

  protected isSelf(user: User): boolean {
    return this.auth.user()?.id === user.id;
  }

  protected async create(): Promise<void> {
    const ref = openUserDialog(this.dialog);
    if (await firstValueFrom(ref.closed, { defaultValue: false })) this.users.reload();
  }

  protected async edit(user: User): Promise<void> {
    const ref = openUserDialog(this.dialog, { user, isSelf: this.isSelf(user) });
    if (await firstValueFrom(ref.closed, { defaultValue: false })) this.users.reload();
  }
}
