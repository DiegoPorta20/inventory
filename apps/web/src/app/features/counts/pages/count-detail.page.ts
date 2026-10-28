import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { RouterLink } from '@angular/router';
import { errorMessage } from '../../../core/http/api-utils';
import { COUNT_STATUS_LABELS, COUNT_STATUS_TONES } from '../../../shared/models/labels';
import type { StockCount, StockCountItem } from '../../../shared/models/models';
import { FORMAT_PIPES } from '../../../shared/pipes/format.pipes';
import { BadgeComponent } from '../../../shared/ui/badge.components';
import { ConfirmService } from '../../../shared/ui/confirm.service';
import { IconComponent } from '../../../shared/ui/icon.component';
import { PageHeaderComponent, StatCardComponent } from '../../../shared/ui/layout.components';
import { PaginationComponent } from '../../../shared/ui/pagination.component';
import { SearchInputComponent } from '../../../shared/ui/search-input.component';
import {
  EmptyStateComponent,
  ErrorStateComponent,
  TableSkeletonComponent,
} from '../../../shared/ui/states.components';
import { ToastService } from '../../../shared/ui/toast.service';
import { CountItemsTableComponent } from '../components/count-items-table.component';
import { CountsApi } from '../counts.api';

const PAGE_SIZE = 50;

@Component({
  selector: 'app-count-detail-page',
  imports: [
    RouterLink,
    FORMAT_PIPES,
    BadgeComponent,
    IconComponent,
    PageHeaderComponent,
    StatCardComponent,
    PaginationComponent,
    SearchInputComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
    CountItemsTableComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (countResource.isLoading() && !count()) {
      <div class="card p-4"><div class="skeleton h-6 w-48"></div></div>
    } @else if (countResource.error()) {
      <div class="card">
        <ui-error-state>
          <button type="button" class="btn btn-secondary" (click)="countResource.reload()">
            Reintentar
          </button>
        </ui-error-state>
      </div>
    } @else if (count(); as c) {
      <ui-page-header
        [title]="c.name"
        [subtitle]="c.categoryName ? 'Alcance: ' + c.categoryName : 'Alcance: todas las categorías'"
      >
        <a routerLink="/counts" class="btn btn-ghost btn-sm"
          ><ui-icon name="chevron-left" [size]="4" /> Conteos</a
        >
        @if (isOpen()) {
          <button
            type="button"
            class="btn btn-secondary"
            [disabled]="busy()"
            (click)="confirmPending()"
          >
            Confirmar pendientes con stock del sistema
          </button>
          <button type="button" class="btn btn-secondary" [disabled]="busy()" (click)="cancel()">
            Cancelar conteo
          </button>
          <button type="button" class="btn btn-primary" [disabled]="busy()" (click)="complete()">
            Completar conteo
          </button>
        } @else {
          <a
            [routerLink]="['/movements']"
            [queryParams]="{ referenceType: 'STOCK_COUNT', referenceId: c.id }"
            class="btn btn-secondary"
          >
            Ver ajustes generados
          </a>
        }
      </ui-page-header>

      <div class="mb-4 flex flex-wrap items-center gap-2">
        <ui-badge [tone]="statusTone[c.status]">{{ statusLabel[c.status] }}</ui-badge>
        @if (c.completedAt) {
          <span class="text-xs text-slate-500">Completado el {{ c.completedAt | dateTime }}</span>
        }
        @if (c.note) {
          <span class="text-xs text-slate-500">· {{ c.note }}</span>
        }
      </div>

      <div class="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ui-stat-card label="Productos" [value]="c.summary.itemsTotal | quantity" />
        <ui-stat-card
          label="Contados"
          [value]="c.summary.itemsCounted + ' / ' + c.summary.itemsTotal"
        />
        <ui-stat-card
          label="Con diferencia"
          [value]="c.summary.itemsWithDifference | quantity"
          [tone]="c.summary.itemsWithDifference > 0 ? 'warning' : 'neutral'"
        />
        <ui-stat-card label="Diferencia neta" [value]="netDifference()" [tone]="netTone()" />
      </div>

      <div class="card mb-4 p-4">
        <div class="grid gap-3 md:grid-cols-3">
          <div>
            <label class="label" for="items-search">Buscar</label>
            <ui-search-input
              [value]="search()"
              placeholder="Código o descripción…"
              (search)="onSearch($event)"
            />
          </div>
          <label class="flex items-end gap-2 pb-2 text-sm text-slate-700">
            <input
              type="checkbox"
              class="h-4 w-4 rounded border-slate-300"
              [checked]="onlyDifferences()"
              (change)="onToggle('onlyDifferences', $any($event.target).checked)"
            />
            Solo con diferencias
          </label>
          <label class="flex items-end gap-2 pb-2 text-sm text-slate-700">
            <input
              type="checkbox"
              class="h-4 w-4 rounded border-slate-300"
              [checked]="onlyPending()"
              (change)="onToggle('onlyPending', $any($event.target).checked)"
            />
            Solo pendientes
          </label>
        </div>
      </div>

      <div class="card">
        @if (itemsResource.isLoading() && items().length === 0) {
          <ui-table-skeleton [rows]="10" [cols]="7" />
        } @else if (itemsResource.error()) {
          <ui-error-state>
            <button type="button" class="btn btn-secondary" (click)="itemsResource.reload()">
              Reintentar
            </button>
          </ui-error-state>
        } @else if (items().length === 0) {
          <ui-empty-state
            icon="box"
            title="Sin productos"
            description="No hay productos que coincidan con los filtros."
          />
        } @else {
          <app-count-items-table
            [countId]="c.id"
            [items]="items()"
            [readonly]="!isOpen()"
            (itemSaved)="onItemSaved($event)"
          />
          <ui-pagination
            [page]="page()"
            [pageSize]="pageSize"
            [total]="total()"
            (pageChange)="page.set($event)"
          />
        }
      </div>
    }
  `,
})
export class CountDetailPage {
  private readonly api = inject(CountsApi);
  private readonly confirmService = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  readonly id = input.required<string>();
  private readonly countId = computed(() => Number(this.id()));

  protected readonly pageSize = PAGE_SIZE;
  protected readonly statusLabel = COUNT_STATUS_LABELS;
  protected readonly statusTone = COUNT_STATUS_TONES;

  protected readonly busy = signal(false);
  protected readonly search = signal('');
  protected readonly onlyDifferences = signal(false);
  protected readonly onlyPending = signal(false);
  protected readonly page = signal(1);

  private readonly localCount = signal<StockCount | null>(null);
  protected readonly items = signal<StockCountItem[]>([]);
  protected readonly total = signal(0);

  protected readonly countResource = rxResource({
    params: () => ({ id: this.countId() }),
    stream: ({ params }) => this.api.get(params.id),
  });
  protected readonly count = computed(
    () => this.localCount() ?? (this.countResource.hasValue() ? this.countResource.value() : null),
  );
  protected readonly isOpen = computed(() => this.count()?.status === 'OPEN');

  protected readonly itemsResource = rxResource({
    params: () => ({
      id: this.countId(),
      search: this.search(),
      onlyDifferences: this.onlyDifferences(),
      onlyPending: this.onlyPending(),
      page: this.page(),
    }),
    stream: ({ params }) =>
      this.api.items(
        params.id,
        {
          search: params.search || undefined,
          onlyDifferences: params.onlyDifferences || undefined,
          onlyPending: params.onlyPending || undefined,
        },
        params.page,
        PAGE_SIZE,
      ),
  });

  constructor() {
    effect(() => {
      if (this.countResource.hasValue()) this.localCount.set(this.countResource.value());
    });
    effect(() => {
      if (this.itemsResource.hasValue()) {
        const page = this.itemsResource.value();
        this.items.set(page.items);
        this.total.set(page.total);
      }
    });
  }

  protected readonly netDifference = computed(() => {
    const net = this.count()?.summary.netDifference ?? 0;
    return `${net > 0 ? '+' : ''}${net}`;
  });
  protected readonly netTone = computed<'neutral' | 'success' | 'danger'>(() => {
    const net = this.count()?.summary.netDifference ?? 0;
    if (net > 0) return 'success';
    if (net < 0) return 'danger';
    return 'neutral';
  });

  protected onSearch(value: string): void {
    this.search.set(value);
    this.page.set(1);
  }

  protected onToggle(key: 'onlyDifferences' | 'onlyPending', value: boolean): void {
    this[key].set(value);
    this.page.set(1);
  }

  protected onItemSaved(updated: StockCountItem): void {
    this.items.update((list) => list.map((item) => (item.id === updated.id ? updated : item)));
    this.countResource.reload();
  }

  private refresh(): void {
    this.countResource.reload();
    this.itemsResource.reload();
  }

  protected async confirmPending(): Promise<void> {
    const ok = await this.confirmService.confirm({
      title: 'Confirmar pendientes',
      message: 'Los productos sin contar tomarán el stock actual del sistema. ¿Continuar?',
      confirmLabel: 'Confirmar',
    });
    if (!ok) return;
    this.busy.set(true);
    try {
      const { confirmed } = await firstValueFrom(this.api.confirmPending(this.countId()));
      this.toast.success(`${confirmed} producto(s) confirmados con el stock del sistema.`);
      this.refresh();
    } catch (error: unknown) {
      this.toast.error(errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  protected async complete(): Promise<void> {
    const ok = await this.confirmService.confirm({
      title: 'Completar conteo',
      message:
        'Cada diferencia entre lo contado y el stock actual generará un ajuste de stock. El conteo quedará cerrado y no podrá editarse. ¿Completar ahora?',
      confirmLabel: 'Completar',
    });
    if (!ok) return;
    this.busy.set(true);
    try {
      const result = await firstValueFrom(this.api.complete(this.countId()));
      this.toast.success(
        `Conteo completado. Se generaron ${result.adjustments} ajuste(s) de stock.`,
      );
      this.refresh();
    } catch (error: unknown) {
      this.toast.error(errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  protected async cancel(): Promise<void> {
    const ok = await this.confirmService.confirm({
      title: 'Cancelar conteo',
      message: 'El conteo quedará cancelado y no podrá reabrirse. ¿Continuar?',
      confirmLabel: 'Cancelar conteo',
      cancelLabel: 'Volver',
      danger: true,
    });
    if (!ok) return;
    this.busy.set(true);
    try {
      await firstValueFrom(this.api.cancel(this.countId()));
      this.toast.success('Conteo cancelado.');
      this.refresh();
    } catch (error: unknown) {
      this.toast.error(errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }
}
