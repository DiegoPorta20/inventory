import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { errorMessage } from '../../../core/http/api-utils';
import type { CostCenter } from '../../../shared/models/models';
import { FORMAT_PIPES } from '../../../shared/pipes/format.pipes';
import { ConfirmService } from '../../../shared/ui/confirm.service';
import { IconComponent } from '../../../shared/ui/icon.component';
import { PageHeaderComponent } from '../../../shared/ui/layout.components';
import {
  EmptyStateComponent,
  ErrorStateComponent,
  TableSkeletonComponent,
} from '../../../shared/ui/states.components';
import { ToastService } from '../../../shared/ui/toast.service';
import { openCostCenterDialog } from '../components/cost-center.dialog';
import { CostCentersApi } from '../cost-centers.api';

@Component({
  selector: 'app-cost-centers-list-page',
  imports: [
    RouterLink,
    FORMAT_PIPES,
    IconComponent,
    PageHeaderComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-page-header
      title="Centros de costo"
      subtitle="Líneas de negocio a las que se asignan los productos."
    >
      <button type="button" class="btn btn-primary magnetic" (click)="openCreate()">
        <ui-icon name="plus" [size]="4" /> Nuevo centro de costo
      </button>
    </ui-page-header>

    <div class="card">
      @if (costCenters.isLoading()) {
        <ui-table-skeleton [rows]="6" [cols]="3" />
      } @else if (costCenters.error()) {
        <ui-error-state [message]="errorText()">
          <button type="button" class="btn btn-secondary" (click)="costCenters.reload()">
            Reintentar
          </button>
        </ui-error-state>
      } @else if (rows().length === 0) {
        <ui-empty-state
          icon="tag"
          title="No hay centros de costo"
          description="Crea centros de costo para clasificar los productos por línea de negocio."
        >
          <button type="button" class="btn btn-primary" (click)="openCreate()">
            <ui-icon name="plus" [size]="4" /> Nuevo centro de costo
          </button>
        </ui-empty-state>
      } @else {
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th scope="col">Centro de costo</th>
                <th scope="col" class="num">Productos</th>
                <th scope="col"><span class="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              @for (c of rows(); track c.id) {
                <tr>
                  <td>
                    <span class="font-medium text-slate-800">{{ c.name }}</span>
                  </td>
                  <td class="num">{{ c.productCount | quantity }}</td>
                  <td>
                    <div class="flex items-center justify-end gap-1">
                      <a
                        class="btn btn-ghost btn-sm"
                        [routerLink]="['/products']"
                        [queryParams]="{ costCenterId: c.id }"
                        title="Ver productos"
                      >
                        <ui-icon name="box" [size]="4" /> Productos
                      </a>
                      <button
                        type="button"
                        class="btn btn-ghost btn-icon"
                        aria-label="Renombrar"
                        (click)="openEdit(c)"
                      >
                        <ui-icon name="edit" [size]="4" />
                      </button>
                      <button
                        type="button"
                        class="btn btn-ghost btn-icon text-rose-600"
                        aria-label="Eliminar"
                        (click)="remove(c)"
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
export class CostCentersListPage {
  private readonly api = inject(CostCentersApi);
  private readonly dialog = inject(Dialog);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  protected readonly costCenters = rxResource<CostCenter[], void>({
    stream: () => this.api.list(),
  });

  protected readonly rows = computed(() =>
    this.costCenters.hasValue() ? this.costCenters.value() : [],
  );
  protected readonly errorText = computed(() => errorMessage(this.costCenters.error()));

  protected openCreate(): void {
    this.afterClose(openCostCenterDialog(this.dialog));
  }

  protected openEdit(costCenter: CostCenter): void {
    this.afterClose(openCostCenterDialog(this.dialog, { costCenter }));
  }

  private afterClose(ref: ReturnType<typeof openCostCenterDialog>): void {
    ref.closed.subscribe((saved) => {
      if (saved) this.costCenters.reload();
    });
  }

  protected async remove(costCenter: CostCenter): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Eliminar centro de costo',
      message: `¿Eliminar "${costCenter.name}"? Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!ok) return;

    this.api.remove(costCenter.id).subscribe({
      next: () => {
        this.toast.success('Centro de costo eliminado.');
        this.costCenters.reload();
      },
      error: (error: unknown) => this.toast.error(errorMessage(error)),
    });
  }
}
