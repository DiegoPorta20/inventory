import { CdkTrapFocus } from '@angular/cdk/a11y';
import { CdkConnectedOverlay, CdkOverlayOrigin } from '@angular/cdk/overlay';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import {
  RANGE_PRESETS,
  formatShort,
  todayIso,
  type DateRange,
  type IsoDate,
} from '../util/date-iso';
import { CalendarComponent } from './calendar.component';
import { POPOVER_POSITIONS } from './date-input.component';
import { IconComponent } from './icon.component';

/**
 * One control for "Desde / Hasta" filters: quick presets plus a two-click range calendar.
 * Emits ISO dates (`YYYY-MM-DD`); an empty string means "no limit" on that side.
 */
@Component({
  selector: 'ui-date-range',
  imports: [CdkConnectedOverlay, CdkOverlayOrigin, CdkTrapFocus, CalendarComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div class="relative" cdkOverlayOrigin #origin="cdkOverlayOrigin">
      <button
        #trigger
        type="button"
        class="input input-pill flex items-center gap-2 text-left"
        [class]="hasValue() ? 'pr-16' : 'pr-9'"
        aria-haspopup="dialog"
        [attr.aria-expanded]="isOpen()"
        [attr.aria-label]="ariaLabel() + ': ' + summary()"
        (click)="toggle()"
      >
        <ui-icon name="calendar" [size]="4" />
        <span class="truncate" [class]="hasValue() ? 'text-slate-900' : 'text-slate-400'">
          {{ summary() }}
        </span>
      </button>
      @if (hasValue()) {
        <button
          type="button"
          class="date-icon-btn absolute top-1/2 right-1.5 -translate-y-1/2"
          aria-label="Quitar filtro de fechas"
          (click)="clear()"
        >
          <ui-icon name="x" [size]="4" />
        </button>
      }
    </div>

    <ng-template
      cdkConnectedOverlay
      [cdkConnectedOverlayOrigin]="origin"
      [cdkConnectedOverlayOpen]="isOpen()"
      [cdkConnectedOverlayPositions]="positions"
      (overlayOutsideClick)="onOutsideClick($event)"
      (overlayKeydown)="onOverlayKeydown($event)"
      (detach)="isOpen.set(false)"
    >
      <div
        cdkTrapFocus
        role="dialog"
        aria-label="Elegir rango de fechas"
        class="pop-in flex max-w-[calc(100vw-1rem)] flex-col rounded-2xl border border-(--line) bg-white shadow-xl sm:flex-row"
      >
        <div
          class="flex gap-1 overflow-x-auto border-b border-slate-100 p-2 sm:w-40 sm:flex-col sm:overflow-visible sm:border-r sm:border-b-0"
        >
          @for (preset of presets; track preset.label) {
            <button
              type="button"
              class="rounded-xl px-3 py-1.5 text-left text-sm font-semibold whitespace-nowrap text-slate-600 transition-colors duration-200 hover:bg-brand-50 hover:text-brand-700"
              (click)="applyPreset(preset.label)"
            >
              {{ preset.label }}
            </button>
          }
        </div>

        <div class="p-3">
          <ui-calendar
            [rangeStart]="draftStart()"
            [rangeEnd]="draftEnd()"
            [hover]="hoverDay()"
            [autoFocus]="true"
            (picked)="pick($event)"
            (hovered)="hoverDay.set($event)"
          />
          <div class="mt-2 flex items-center justify-between gap-3 border-t border-slate-100 pt-2">
            <p class="text-xs text-slate-500" role="status">{{ hint() }}</p>
            <button type="button" class="btn btn-ghost btn-sm" (click)="clear()">Limpiar</button>
          </div>
        </div>
      </div>
    </ng-template>
  `,
})
export class DateRangeFilterComponent {
  readonly from = input<IsoDate>('');
  readonly to = input<IsoDate>('');
  /** Accessible name of the control; combined with the current selection. */
  readonly ariaLabel = input('Fechas');
  readonly rangeChange = output<DateRange>();

  protected readonly positions = POPOVER_POSITIONS;
  protected readonly presets = RANGE_PRESETS;
  protected readonly isOpen = signal(false);

  protected readonly draftStart = signal<IsoDate>('');
  protected readonly draftEnd = signal<IsoDate>('');
  protected readonly hoverDay = signal<IsoDate>('');

  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');

  protected readonly hasValue = computed(() => !!this.from() || !!this.to());

  protected readonly summary = computed(() => {
    const from = this.from();
    const to = this.to();
    if (from && to)
      return from === to ? formatShort(from) : `${formatShort(from)} – ${formatShort(to)}`;
    if (from) return `Desde ${formatShort(from)}`;
    if (to) return `Hasta ${formatShort(to)}`;
    return 'Todas las fechas';
  });

  protected readonly hint = computed(() =>
    this.draftStart() && !this.draftEnd() ? 'Elige la fecha final' : 'Elige la fecha inicial',
  );

  protected toggle(): void {
    if (this.isOpen()) {
      this.isOpen.set(false);
      return;
    }
    this.draftStart.set(this.from());
    this.draftEnd.set(this.to());
    this.hoverDay.set('');
    this.isOpen.set(true);
  }

  protected pick(iso: IsoDate): void {
    if (!this.draftStart() || this.draftEnd()) {
      this.draftStart.set(iso);
      this.draftEnd.set('');
      return;
    }
    const start = this.draftStart();
    this.commit(iso < start ? { from: iso, to: start } : { from: start, to: iso });
  }

  protected applyPreset(label: string): void {
    const preset = this.presets.find((candidate) => candidate.label === label);
    if (preset) this.commit(preset.range(todayIso()));
  }

  protected clear(): void {
    this.commit({ from: '', to: '' });
  }

  private commit(range: DateRange): void {
    this.rangeChange.emit(range);
    this.isOpen.set(false);
    this.trigger().nativeElement.focus();
  }

  protected onOutsideClick(event: MouseEvent): void {
    const origin = this.trigger().nativeElement.parentElement;
    if (origin?.contains(event.target as Node)) return;
    this.isOpen.set(false);
  }

  protected onOverlayKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    this.isOpen.set(false);
    this.trigger().nativeElement.focus();
  }
}
