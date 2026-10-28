import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { errorMessage } from '../../../core/http/api-utils';
import type { EquipmentModel } from '../../../shared/models/models';
import { FORMAT_PIPES } from '../../../shared/pipes/format.pipes';
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
import { useQueryFilters } from '../../../shared/util/query-filters';
import { openEquipmentDialog } from '../components/equipment.dialog';
import { EquipmentApi } from '../equipment.api';

@Component({
  selector: 'app-equipment-list-page',
  imports: [
    RouterLink,
    FORMAT_PIPES,
    IconComponent,
    PageHeaderComponent,
    SearchInputComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-page-header title="Equipos" subtitle="Máquinas a las que pertenecen los repuestos.">
      <button type="button" class="btn btn-primary" (click)="openCreate()">
        <ui-icon name="plus" [size]="4" /> Nuevo equipo
      </button>
    </ui-page-header>

    <div class="card">
      <div class="flex flex-wrap items-center gap-3 border-b border-slate-100 p-3">
        <div class="min-w-56 flex-1">
          <ui-search-input
            [value]="filters.value().search"
            placeholder="Buscar por nombre o marca…"
            (search)="filters.patch({ search: $event })"
          />
        </div>
      </div>

      @if (equipment.isLoading()) {
        <ui-table-skeleton [rows]="6" [cols]="4" />
      } @else if (equipment.error()) {
        <ui-error-state [message]="errorText()">
          <button type="button" class="btn btn-secondary" (click)="equipment.reload()">
            Reintentar
          </button>
        </ui-error-state>
      } @else if (rows().length === 0) {
        <ui-empty-state
          icon="wrench"
          title="No hay equipos"
          description="Registra los equipos para clasificar los repuestos por máquina."
        >
          <button type="button" class="btn btn-primary" (click)="openCreate()">
            <ui-icon name="plus" [size]="4" /> Nuevo equipo
          </button>
        </ui-empty-state>
      } @else {
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Equipo</th>
                <th>Marca</th>
                <th class="num">Productos</th>
                <th><span class="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              @for (e of rows(); track e.id) {
                <tr>
                  <td>
                    <span class="block max-w-xs truncate font-medium text-slate-800">{{
                      e.name
                    }}</span>
                    @if (e.description) {
                      <span class="block max-w-sm truncate text-xs text-slate-500">{{
                        e.description
                      }}</span>
                    }
                  </td>
                  <td class="text-slate-600">{{ e.brand ?? '—' }}</td>
                  <td class="num">{{ e.productCount ?? 0 | quantity }}</td>
                  <td>
                    <div class="flex items-center justify-end gap-1">
                      <a
                        class="btn btn-ghost btn-sm"
                        [routerLink]="['/products']"
                        [queryParams]="{ equipmentId: e.id }"
                        title="Ver productos"
                      >
                        <ui-icon name="box" [size]="4" /> Productos
                      </a>
                      <button
                        type="button"
                        class="btn btn-ghost btn-icon"
                        aria-label="Editar"
                        (click)="openEdit(e)"
                      >
                        <ui-icon name="edit" [size]="4" />
                      </button>
                      <button
                        type="button"
                        class="btn btn-ghost btn-icon text-rose-600"
                        aria-label="Eliminar"
                        (click)="remove(e)"
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
export class EquipmentListPage {
  private readonly api = inject(EquipmentApi);
  private readonly dialog = inject(Dialog);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  protected readonly filters = useQueryFilters({ search: '' });

  protected readonly equipment = rxResource({
    params: () => ({ search: this.filters.value().search }),
    stream: ({ params }) => this.api.list(params.search || undefined),
  });

  protected readonly rows = computed(() =>
    this.equipment.hasValue() ? this.equipment.value() : [],
  );
  protected readonly errorText = computed(() => errorMessage(this.equipment.error()));

  protected openCreate(): void {
    this.afterClose(openEquipmentDialog(this.dialog));
  }

  protected openEdit(model: EquipmentModel): void {
    this.afterClose(openEquipmentDialog(this.dialog, { model }));
  }

  private afterClose(ref: ReturnType<typeof openEquipmentDialog>): void {
    ref.closed.subscribe((saved) => {
      if (saved) this.equipment.reload();
    });
  }

  protected async remove(model: EquipmentModel): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Eliminar equipo',
      message: `¿Eliminar "${model.name}"? Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!ok) return;

    this.api.remove(model.id).subscribe({
      next: () => {
        this.toast.success('Equipo eliminado.');
        this.equipment.reload();
      },
      error: (error: unknown) => this.toast.error(errorMessage(error)),
    });
  }
}
