import { CdkTrapFocus } from '@angular/cdk/a11y';
import {
  CdkConnectedOverlay,
  CdkOverlayOrigin,
  type ConnectedPosition,
} from '@angular/cdk/overlay';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  linkedSignal,
  model,
  signal,
  viewChild,
} from '@angular/core';
import { fromDisplay, maskDisplay, todayIso, toDisplay, type IsoDate } from '../util/date-iso';
import { CalendarComponent } from './calendar.component';
import { IconComponent } from './icon.component';

export const POPOVER_POSITIONS: ConnectedPosition[] = [
  { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 6 },
  { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -6 },
  { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 6 },
  { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -6 },
];

/**
 * Date field: type `dd/mm/aaaa` or pick from a calendar. The value is an ISO date
 * (`YYYY-MM-DD`) or an empty string, so it plugs into the same filters and forms as `type="date"`.
 */
@Component({
  selector: 'ui-date-input',
  imports: [CdkConnectedOverlay, CdkOverlayOrigin, CdkTrapFocus, CalendarComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div class="relative" cdkOverlayOrigin #origin="cdkOverlayOrigin">
      <input
        #field
        class="input pr-[4.25rem]"
        type="text"
        inputmode="numeric"
        autocomplete="off"
        maxlength="10"
        placeholder="dd/mm/aaaa"
        [id]="inputId()"
        [value]="text()"
        [disabled]="disabled()"
        [attr.aria-invalid]="invalid() ? 'true' : null"
        [attr.aria-label]="ariaLabel() || null"
        (input)="onType($event)"
        (blur)="onBlur()"
        (keydown.arrowdown)="open(); $event.preventDefault()"
      />
      <div class="absolute inset-y-0 right-1 flex items-center">
        @if (value() && !disabled()) {
          <button type="button" class="date-icon-btn" aria-label="Borrar fecha" (click)="clear()">
            <ui-icon name="x" [size]="4" />
          </button>
        }
        <button
          type="button"
          class="date-icon-btn"
          aria-haspopup="dialog"
          aria-label="Abrir calendario"
          [attr.aria-expanded]="isOpen()"
          [disabled]="disabled()"
          (click)="toggle()"
        >
          <ui-icon name="calendar" [size]="4" />
        </button>
      </div>
    </div>
    @if (invalid()) {
      <p class="field-error" role="alert">Fecha no válida. Usa el formato dd/mm/aaaa.</p>
    }

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
        aria-label="Elegir fecha"
        class="pop-in rounded-2xl border border-(--line) bg-white p-3 shadow-xl"
      >
        <ui-calendar
          [value]="value()"
          [min]="min()"
          [max]="max()"
          [autoFocus]="true"
          (picked)="select($event)"
        />
        <div class="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
          <button type="button" class="btn btn-ghost btn-sm" (click)="select(today())">Hoy</button>
          <button type="button" class="btn btn-ghost btn-sm" (click)="clear()">Borrar</button>
        </div>
      </div>
    </ng-template>
  `,
})
export class DateInputComponent {
  readonly value = model<IsoDate>('');
  readonly inputId = input('');
  readonly min = input<IsoDate>('');
  readonly max = input<IsoDate>('');
  readonly disabled = input(false);
  /** Accessible name when there is no visible <label for>. */
  readonly ariaLabel = input('');

  protected readonly positions = POPOVER_POSITIONS;
  protected readonly isOpen = signal(false);
  protected readonly invalid = signal(false);

  /** What the user sees; follows `value` until they start typing. */
  protected readonly text = linkedSignal(() => toDisplay(this.value()));

  private readonly field = viewChild.required<ElementRef<HTMLInputElement>>('field');

  protected today(): IsoDate {
    return todayIso();
  }

  protected toggle(): void {
    if (this.isOpen()) this.close();
    else this.open();
  }

  protected open(): void {
    if (!this.disabled()) this.isOpen.set(true);
  }

  private close(): void {
    this.isOpen.set(false);
  }

  protected select(iso: IsoDate): void {
    this.setValue(iso);
    this.close();
    this.field().nativeElement.focus();
  }

  protected clear(): void {
    this.setValue('');
    this.close();
    this.field().nativeElement.focus();
  }

  private setValue(iso: IsoDate): void {
    this.invalid.set(false);
    this.text.set(toDisplay(iso));
    this.value.set(iso);
  }

  protected onType(event: Event): void {
    const input = event.target as HTMLInputElement;
    const masked = maskDisplay(input.value);
    input.value = masked;
    this.text.set(masked);

    if (masked === '') {
      this.invalid.set(false);
      this.value.set('');
      return;
    }
    if (masked.length === 10) this.applyTyped(masked);
    else this.invalid.set(false);
  }

  protected onBlur(): void {
    const typed = this.text();
    if (typed === '' || typed === toDisplay(this.value())) {
      this.invalid.set(false);
      return;
    }
    this.applyTyped(typed);
    if (typed.length < 10) this.invalid.set(true);
  }

  private applyTyped(typed: string): void {
    const iso = fromDisplay(typed);
    const outOfRange =
      iso !== null && ((this.min() && iso < this.min()) || (this.max() && iso > this.max()));
    if (iso === null || outOfRange) {
      this.invalid.set(true);
      return;
    }
    this.invalid.set(false);
    this.value.set(iso);
  }

  protected onOutsideClick(event: MouseEvent): void {
    const origin = this.field().nativeElement.parentElement;
    if (origin?.contains(event.target as Node)) return;
    this.close();
  }

  protected onOverlayKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    this.close();
    this.field().nativeElement.focus();
  }
}
