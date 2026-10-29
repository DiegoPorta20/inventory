import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { errorMessage } from '../../../core/http/api-utils';
import { useQueryFilters } from '../../../shared/util/query-filters';
import { BadgeComponent } from '../../../shared/ui/badge.components';
import { ConfirmService } from '../../../shared/ui/confirm.service';
import { IconComponent } from '../../../shared/ui/icon.component';
import { PageHeaderComponent } from '../../../shared/ui/layout.components';
import { SearchInputComponent } from '../../../shared/ui/search-input.component';
import {
  EmptyStateComponent,
  ErrorStateComponent,
  TableSkeletonComponent,
} from '../../../shared/ui/states.components';
import { ToastService } from '../../../shared/ui/toast.service';
import { apiError } from '../../../core/http/api-utils';
import type { Supplier } from '../../../shared/models/models';
import { openSupplierDialog } from '../components/supplier.dialog';
import { SuppliersApi } from '../suppliers.api';

@Component({
  selector: 'app-suppliers-list-page',
  imports: [
    RouterLink,
    BadgeComponent,
    IconComponent,
    PageHeaderComponent,
    SearchInputComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-page-header title="Proveedores" subtitle="Empresas que surten las importaciones.">
      <button type="button" class="btn btn-primary magnetic" (click)="openCreate()">
        <ui-icon name="plus" [size]="4" /> Nuevo proveedor
      </button>
    </ui-page-header>

    <div class="card">
      <div class="flex flex-wrap items-center gap-3 border-b border-slate-100 p-3">
        <div class="min-w-56 flex-1">
          <ui-search-input
            [value]="filters.value().search"
            placeholder="Buscar por nombre, contacto o país…"
            (search)="filters.patch({ search: $event })"
          />
        </div>
        <select
          class="input input-pill w-auto"
          aria-label="Estado"
          [value]="filters.value().status"
          (change)="filters.patch({ status: $any($event.target).value })"
        >
          <option value="all">Todos</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </select>
      </div>

      @if (suppliers.isLoading()) {
        <ui-table-skeleton [rows]="6" [cols]="5" />
      } @else if (suppliers.error()) {
        <ui-error-state [message]="errorText()">
          <button type="button" class="btn btn-secondary" (click)="suppliers.reload()">
            Reintentar
          </button>
        </ui-error-state>
      } @else if (rows().length === 0) {
        <ui-empty-state
          icon="building"
          title="No hay proveedores"
          description="Registra tus proveedores para asociarlos a las importaciones."
        >
          <button type="button" class="btn btn-primary" (click)="openCreate()">
            <ui-icon name="plus" [size]="4" /> Nuevo proveedor
          </button>
        </ui-empty-state>
      } @else {
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Proveedor</th>
                <th>País</th>
                <th>Contacto</th>
                <th>Estado</th>
                <th><span class="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              @for (s of rows(); track s.id) {
                <tr>
                  <td>
                    <span class="block max-w-xs truncate font-medium text-slate-800">{{
                      s.name
                    }}</span>
                    @if (s.email) {
                      <span class="text-xs text-slate-500">{{ s.email }}</span>
                    }
                  </td>
                  <td class="text-slate-600">{{ s.country ?? '—' }}</td>
                  <td class="text-slate-600">
                    <span class="block">{{ s.contactName ?? '—' }}</span>
                    @if (s.phone) {
                      <span class="text-xs text-slate-500">{{ s.phone }}</span>
                    }
                  </td>
                  <td>
                    @if (s.isActive) {
                      <ui-badge tone="success">Activo</ui-badge>
                    } @else {
                      <ui-badge tone="neutral">Inactivo</ui-badge>
                    }
                  </td>
                  <td>
                    <div class="flex items-center justify-end gap-1">
                      <a
                        class="btn btn-ghost btn-sm"
                        [routerLink]="['/imports']"
                        [queryParams]="{ supplierId: s.id }"
                        title="Ver importaciones"
                      >
                        <ui-icon name="truck" [size]="4" /> Importaciones
                      </a>
                      <button
                        type="button"
                        class="btn btn-ghost btn-icon"
                        aria-label="Editar"
                        (click)="openEdit(s)"
                      >
                        <ui-icon name="edit" [size]="4" />
                      </button>
                      <button
                        type="button"
                        class="btn btn-ghost btn-icon text-rose-600"
                        aria-label="Eliminar"
                        (click)="remove(s)"
                      >
                        <ui-icon name="trash" [size]="4" />
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
})
export class SuppliersListPage {
  private readonly api = inject(SuppliersApi);
  private readonly dialog = inject(Dialog);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  protected readonly filters = useQueryFilters({ search: '', status: 'all' });

  protected readonly suppliers = rxResource({
    params: () => ({ search: this.filters.value().search, status: this.filters.value().status }),
    stream: ({ params }) =>
      this.api.list({
        search: params.search || undefined,
        isActive: params.status === 'all' ? undefined : params.status === 'active',
      }),
  });

  protected readonly rows = computed(() =>
    this.suppliers.hasValue() ? this.suppliers.value() : [],
  );
  protected readonly errorText = computed(() => errorMessage(this.suppliers.error()));

  protected openCreate(): void {
    this.afterClose(openSupplierDialog(this.dialog));
  }

  protected openEdit(supplier: Supplier): void {
    this.afterClose(openSupplierDialog(this.dialog, { supplier }));
  }

  private afterClose(ref: ReturnType<typeof openSupplierDialog>): void {
    ref.closed.subscribe((saved) => {
      if (saved) this.suppliers.reload();
    });
  }

  protected async remove(supplier: Supplier): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Eliminar proveedor',
      message: `¿Eliminar a "${supplier.name}"? Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!ok) return;

    this.api.remove(supplier.id).subscribe({
      next: () => {
        this.toast.success('Proveedor eliminado.');
        this.suppliers.reload();
      },
      error: (error: unknown) => {
        if (apiError(error)?.code === 'SUPPLIER_IN_USE') {
          this.toast.error(errorMessage(error));
          void this.offerDeactivate(supplier);
          return;
        }
        this.toast.error(errorMessage(error));
      },
    });
  }

  private async offerDeactivate(supplier: Supplier): Promise<void> {
    if (!supplier.isActive) return;
    const ok = await this.confirm.confirm({
      title: 'Desactivar proveedor',
      message: 'El proveedor tiene importaciones asociadas. ¿Deseas desactivarlo en su lugar?',
      confirmLabel: 'Desactivar',
    });
    if (!ok) return;
    this.api.update(supplier.id, { isActive: false }).subscribe({
      next: () => {
        this.toast.success('Proveedor desactivado.');
        this.suppliers.reload();
      },
      error: (error: unknown) => this.toast.error(errorMessage(error)),
    });
  }
}
