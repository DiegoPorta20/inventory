import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  input,
  linkedSignal,
  output,
} from '@angular/core';
import {
  addDays,
  addMonths,
  formatLong,
  formatMonth,
  monthWeeks,
  startOfMonth,
  todayIso,
  weekdayIndex,
  type IsoDate,
} from '../util/date-iso';

interface DayCell {
  iso: IsoDate;
  day: number;
  outside: boolean;
  today: boolean;
  /** The picked day (single mode) or either end of the range. */
  edge: boolean;
  inRange: boolean;
  disabled: boolean;
  tabbable: boolean;
}

const WEEKDAYS = [
  { short: 'L', long: 'lunes' },
  { short: 'M', long: 'martes' },
  { short: 'X', long: 'miércoles' },
  { short: 'J', long: 'jueves' },
  { short: 'V', long: 'viernes' },
  { short: 'S', long: 'sábado' },
  { short: 'D', long: 'domingo' },
] as const;

/**
 * Month grid with keyboard support. Single mode uses `value`; range mode uses `rangeStart` /
 * `rangeEnd` (and `hover` to preview the range while the end is still being chosen).
 */
@Component({
  selector: 'ui-calendar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-[18.5rem] select-none' },
  template: `
    <div class="mb-2 flex items-center justify-between gap-1">
      <div class="flex">
        <button type="button" class="cal-nav" aria-label="Año anterior" (click)="shift(-12)">
          «
        </button>
        <button type="button" class="cal-nav" aria-label="Mes anterior" (click)="shift(-1)">
          ‹
        </button>
      </div>
      <p class="text-sm font-semibold text-slate-800 first-letter:uppercase" aria-live="polite">
        {{ title() }}
      </p>
      <div class="flex">
        <button type="button" class="cal-nav" aria-label="Mes siguiente" (click)="shift(1)">
          ›
        </button>
        <button type="button" class="cal-nav" aria-label="Año siguiente" (click)="shift(12)">
          »
        </button>
      </div>
    </div>

    <div role="grid" [attr.aria-label]="title()">
      <div role="row" class="grid grid-cols-7">
        @for (weekday of weekdays; track weekday.short) {
          <div
            role="columnheader"
            class="py-1 text-center text-xs font-medium text-slate-400"
            [attr.aria-label]="weekday.long"
          >
            {{ weekday.short }}
          </div>
        }
      </div>
      @for (week of weeks(); track $index) {
        <div role="row" class="grid grid-cols-7">
          @for (cell of week; track cell.iso) {
            <div role="gridcell" class="py-0.5" [attr.aria-selected]="cell.edge">
              <button
                type="button"
                class="cal-day"
                [class.cal-day-outside]="cell.outside"
                [class.cal-day-today]="cell.today"
                [class.cal-day-range]="cell.inRange"
                [class.cal-day-edge]="cell.edge"
                [attr.data-date]="cell.iso"
                [attr.aria-label]="label(cell)"
                [attr.aria-current]="cell.today ? 'date' : null"
                [attr.tabindex]="cell.tabbable ? 0 : -1"
                [disabled]="cell.disabled"
                (click)="pick(cell.iso)"
                (keydown)="onKeydown($event, cell.iso)"
                (mouseenter)="hovered.emit(cell.iso)"
                (focus)="focusIso.set(cell.iso)"
              >
                {{ cell.day }}
              </button>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class CalendarComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  readonly value = input<IsoDate>('');
  readonly rangeStart = input<IsoDate>('');
  readonly rangeEnd = input<IsoDate>('');
  /** Day under the pointer while choosing the end of a range. */
  readonly hover = input<IsoDate>('');
  readonly min = input<IsoDate>('');
  readonly max = input<IsoDate>('');
  /** Move focus to the active day as soon as the calendar appears (use inside popovers). */
  readonly autoFocus = input(false);

  readonly picked = output<IsoDate>();
  readonly hovered = output<IsoDate>();

  protected readonly weekdays = WEEKDAYS;
  private readonly today = todayIso();

  /** Day that owns the roving tabindex and keyboard focus. */
  protected readonly focusIso = linkedSignal<IsoDate>(
    () => this.value() || this.rangeStart() || this.today,
  );
  /** First day of the month on display. */
  private readonly view = linkedSignal<IsoDate>(() =>
    startOfMonth(this.value() || this.rangeStart() || this.today),
  );

  protected readonly title = computed(() => formatMonth(this.view()));

  protected readonly weeks = computed<DayCell[][]>(() => {
    const view = this.view();
    const focus = this.focusIso();
    const focusInView = focus.slice(0, 7) === view.slice(0, 7);
    const min = this.min();
    const max = this.max();

    const single = this.value();
    const start = this.rangeStart();
    const end = this.rangeEnd() || (start ? this.hover() : '');
    const [low, high] = start && end && end < start ? [end, start] : [start, end];

    return monthWeeks(view).map((week) =>
      week.map((cell) => {
        const disabled = (!!min && cell.iso < min) || (!!max && cell.iso > max);
        const isEdge = cell.iso === single || cell.iso === start || cell.iso === this.rangeEnd();
        return {
          ...cell,
          today: cell.iso === this.today,
          edge: isEdge,
          inRange: !!low && !!high && cell.iso >= low && cell.iso <= high,
          disabled,
          tabbable: focusInView ? cell.iso === focus : cell.iso === view,
        };
      }),
    );
  });

  constructor() {
    afterNextRender(() => {
      if (this.autoFocus()) this.focusDay(this.focusIso());
    });
  }

  protected label(cell: DayCell): string {
    return formatLong(cell.iso);
  }

  protected pick(iso: IsoDate): void {
    this.picked.emit(iso);
  }

  protected shift(months: number): void {
    const next = addMonths(this.focusIso(), months);
    this.view.set(startOfMonth(next));
    this.focusIso.set(next);
  }

  protected onKeydown(event: KeyboardEvent, iso: IsoDate): void {
    let target: IsoDate | null = null;
    switch (event.key) {
      case 'ArrowLeft':
        target = addDays(iso, -1);
        break;
      case 'ArrowRight':
        target = addDays(iso, 1);
        break;
      case 'ArrowUp':
        target = addDays(iso, -7);
        break;
      case 'ArrowDown':
        target = addDays(iso, 7);
        break;
      case 'Home':
        target = addDays(iso, -weekdayIndex(iso));
        break;
      case 'End':
        target = addDays(iso, 6 - weekdayIndex(iso));
        break;
      case 'PageUp':
        target = addMonths(iso, event.shiftKey ? -12 : -1);
        break;
      case 'PageDown':
        target = addMonths(iso, event.shiftKey ? 12 : 1);
        break;
      default:
        return;
    }
    event.preventDefault();
    this.focusIso.set(target);
    this.view.set(startOfMonth(target));
    this.focusDay(target);
  }

  focusDay(iso: IsoDate): void {
    afterNextRender(
      () => this.host.nativeElement.querySelector<HTMLElement>(`[data-date="${iso}"]`)?.focus(),
      { injector: this.injector },
    );
  }
}
