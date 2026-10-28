import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { errorMessage } from '../../../core/http/api-utils';
import type { StockCountItem } from '../../../shared/models/models';
import { FORMAT_PIPES } from '../../../shared/pipes/format.pipes';
import { ToastService } from '../../../shared/ui/toast.service';
import { CountsApi } from '../counts.api';

type RowState = 'idle' | 'saving' | 'saved' | 'error';

@Component({
  selector: 'app-count-items-table',
  imports: [FORMAT_PIPES],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th scope="col">Código</th>
            <th scope="col">Descripción</th>
            <th scope="col">Categoría</th>
            <th scope="col" class="num">Sistema</th>
            <th scope="col" class="num">Contado</th>
            <th scope="col" class="num">Diferencia</th>
            <th scope="col">Nota</th>
            <th scope="col"><span class="sr-only">Estado</span></th>
          </tr>
        </thead>
        <tbody>
          @for (item of items(); track item.id; let i = $index) {
            <tr>
              <td class="whitespace-nowrap font-medium text-slate-800">{{ item.productCode }}</td>
              <td class="max-w-xs truncate" [title]="item.productName">{{ item.productName }}</td>
              <td class="text-slate-500">{{ item.categoryName ?? '—' }}</td>
              <td class="num">{{ item.systemQty | quantity }}</td>
              <td class="num">
                @if (readonly()) {
                  <span [class.text-slate-400]="item.countedQty === null">{{
                    item.countedQty === null ? 'Pendiente' : (item.countedQty | quantity)
                  }}</span>
                } @else {
                  <input
                    class="input h-8 w-24 text-right tabular-nums"
                    type="number"
                    min="0"
                    step="1"
                    inputmode="numeric"
                    [attr.data-row]="i"
                    [attr.aria-label]="'Cantidad contada de ' + item.productName"
                    [value]="item.countedQty ?? ''"
                    (blur)="save(item, i, $any($event.target).value)"
                    (keydown.enter)="onEnter($event, item, i)"
                  />
                }
              </td>
              <td class="num font-medium" [class]="differenceClass(item)">
                {{ item.difference === null ? '—' : (item.difference | signedQuantity) }}
              </td>
              <td class="max-w-[12rem] truncate text-slate-500" [title]="item.note ?? ''">
                {{ item.note ?? '—' }}
              </td>
              <td class="w-16 text-xs">
                @switch (rowState(item.id)) {
                  @case ('saving') {
                    <span class="text-slate-400">Guardando…</span>
                  }
                  @case ('saved') {
                    <span class="text-emerald-600">Guardado</span>
                  }
                  @case ('error') {
                    <span class="text-rose-600">Error</span>
                  }
                }
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class CountItemsTableComponent {
  private readonly api = inject(CountsApi);
  private readonly toast = inject(ToastService);

  readonly countId = input.required<number>();
  readonly items = input.required<StockCountItem[]>();
  readonly readonly = input(false);
  readonly itemSaved = output<StockCountItem>();

  private readonly states = signal<Record<number, RowState>>({});

  protected rowState(itemId: number): RowState {
    return this.states()[itemId] ?? 'idle';
  }

  protected differenceClass(item: StockCountItem): string {
    if (item.difference === null || item.difference === 0) return 'text-slate-500';
    return item.difference > 0 ? 'text-emerald-700' : 'text-rose-600';
  }

  private setState(itemId: number, state: RowState): void {
    this.states.update((s) => ({ ...s, [itemId]: state }));
  }

  protected onEnter(event: Event, item: StockCountItem, index: number): void {
    event.preventDefault();
    const target = event.target as HTMLInputElement;
    this.save(item, index, target.value);
    const next = document.querySelector<HTMLInputElement>(`input[data-row="${index + 1}"]`);
    if (next) {
      next.focus();
      next.select();
    } else {
      target.blur();
    }
  }

  protected save(item: StockCountItem, _index: number, raw: string): void {
    const trimmed = raw.trim();
    const countedQty = trimmed === '' ? null : Number(trimmed);
    if (countedQty !== null && (!Number.isInteger(countedQty) || countedQty < 0)) {
      this.setState(item.id, 'error');
      return;
    }
    if (countedQty === item.countedQty) return;

    this.setState(item.id, 'saving');
    this.api.recordItem(this.countId(), item.id, countedQty, item.note).subscribe({
      next: (updated) => {
        this.setState(item.id, 'saved');
        this.itemSaved.emit(updated);
      },
      error: (error: unknown) => {
        this.setState(item.id, 'error');
        this.toast.error(errorMessage(error));
      },
    });
  }
}
