import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, debounceTime, distinctUntilChanged, of, switchMap, tap } from 'rxjs';
import { toHttpParams } from '../../core/http/api-utils';
import type { Page, ProductListItem } from '../models/models';
import { FORMAT_PIPES } from '../pipes/format.pipes';
import { StockBadgeComponent } from './badge.components';
import { IconComponent } from './icon.component';

let nextId = 0;

@Component({
  selector: 'app-product-picker',
  imports: [IconComponent, StockBadgeComponent, FORMAT_PIPES],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'relative block', '(document:click)': 'onDocumentClick($event)' },
  template: `
    <div class="relative">
      <span class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
        <ui-icon name="search" [size]="4" />
      </span>
      <input
        class="input input-pill pl-9"
        type="text"
        role="combobox"
        autocomplete="off"
        [id]="inputId()"
        [placeholder]="placeholder()"
        [attr.aria-expanded]="open()"
        [attr.aria-controls]="listId"
        [attr.aria-activedescendant]="open() && results().length ? listId + '-' + active() : null"
        [value]="query()"
        (input)="onInput($any($event.target).value)"
        (focus)="open.set(query().length > 0)"
        (keydown)="onKeydown($event)"
      />
    </div>

    @if (open()) {
      <ul
        [id]="listId"
        role="listbox"
        class="pop-in absolute z-30 mt-1.5 max-h-72 w-full overflow-y-auto rounded-2xl border border-(--line) bg-white p-1.5 shadow-xl"
      >
        @if (loading()) {
          <li class="px-3 py-2 text-sm text-slate-500">Buscando…</li>
        } @else if (results().length === 0) {
          <li class="px-3 py-2 text-sm text-slate-500">Sin resultados</li>
        }
        @for (product of results(); track product.id; let i = $index) {
          <li
            role="option"
            [id]="listId + '-' + i"
            [attr.aria-selected]="i === active()"
            class="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2"
            [class]="i === active() ? 'bg-brand-50' : 'hover:bg-slate-50'"
            (mousedown)="$event.preventDefault()"
            (click)="select(product)"
            (mouseenter)="active.set(i)"
          >
            <span class="min-w-0">
              <span class="block truncate text-sm font-medium text-slate-800">{{
                product.name
              }}</span>
              <span class="block truncate text-xs text-slate-500">{{ product.code }}</span>
            </span>
            <span class="flex shrink-0 items-center gap-2">
              <span class="text-xs text-slate-500 tabular-nums"
                >{{ product.stock | quantity }} en stock</span
              >
              <ui-stock-badge [status]="product.stockStatus" />
            </span>
          </li>
        }
      </ul>
    }
  `,
})
export class ProductPickerComponent {
  private readonly http = inject(HttpClient);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly search$ = new Subject<string>();

  readonly placeholder = input('Buscar por código o descripción…');
  readonly excludeIds = input<number[]>([]);
  readonly includeInactive = input(false);
  readonly inputId = input<string>();
  readonly selected = output<ProductListItem>();

  protected readonly listId = `product-picker-${nextId++}`;
  protected readonly query = signal('');
  protected readonly results = signal<ProductListItem[]>([]);
  protected readonly open = signal(false);
  protected readonly loading = signal(false);
  protected readonly active = signal(0);

  constructor() {
    this.search$
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        tap(() => this.loading.set(true)),
        switchMap((term) =>
          this.http
            .get<Page<ProductListItem>>('/api/products', {
              params: toHttpParams({
                search: term,
                pageSize: 8,
                isActive: this.includeInactive() ? undefined : true,
              }),
            })
            .pipe(catchError(() => of({ items: [] } as unknown as Page<ProductListItem>))),
        ),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe((page) => {
        const excluded = new Set(this.excludeIds());
        this.results.set(page.items.filter((product) => !excluded.has(product.id)));
        this.active.set(0);
        this.loading.set(false);
      });
  }

  protected onInput(value: string): void {
    this.query.set(value);
    const term = value.trim();
    this.open.set(term.length > 0);
    if (term.length > 0) this.search$.next(term);
    else this.results.set([]);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const count = this.results().length;
    if (event.key === 'ArrowDown' && count) {
      event.preventDefault();
      this.active.update((i) => (i + 1) % count);
    } else if (event.key === 'ArrowUp' && count) {
      event.preventDefault();
      this.active.update((i) => (i - 1 + count) % count);
    } else if (event.key === 'Enter' && this.open() && count) {
      event.preventDefault();
      this.select(this.results()[this.active()]);
    } else if (event.key === 'Escape') {
      this.open.set(false);
    }
  }

  protected select(product: ProductListItem | undefined): void {
    if (!product) return;
    this.selected.emit(product);
    this.query.set('');
    this.results.set([]);
    this.open.set(false);
  }

  protected onDocumentClick(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) this.open.set(false);
  }
}
