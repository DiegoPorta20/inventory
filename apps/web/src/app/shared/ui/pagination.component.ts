import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { IconComponent } from './icon.component';

@Component({
  selector: 'ui-pagination',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (total() > 0) {
      <nav
        class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-600"
        aria-label="Paginación"
      >
        <p>
          <span class="tabular-nums">{{ from() }}–{{ to() }}</span> de
          <span class="tabular-nums">{{ total() }}</span>
        </p>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="btn btn-secondary btn-sm"
            [disabled]="page() <= 1"
            (click)="pageChange.emit(page() - 1)"
          >
            <ui-icon name="chevron-left" [size]="4" /> Anterior
          </button>
          <span class="px-1 tabular-nums">Página {{ page() }} de {{ pages() }}</span>
          <button
            type="button"
            class="btn btn-secondary btn-sm"
            [disabled]="page() >= pages()"
            (click)="pageChange.emit(page() + 1)"
          >
            Siguiente <ui-icon name="chevron-right" [size]="4" />
          </button>
        </div>
      </nav>
    }
  `,
})
export class PaginationComponent {
  readonly page = input.required<number>();
  readonly pageSize = input.required<number>();
  readonly total = input.required<number>();
  readonly pageChange = output<number>();

  protected readonly pages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));
  protected readonly from = computed(() => (this.page() - 1) * this.pageSize() + 1);
  protected readonly to = computed(() => Math.min(this.page() * this.pageSize(), this.total()));
}
