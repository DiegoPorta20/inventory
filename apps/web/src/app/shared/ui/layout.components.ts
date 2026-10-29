import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'ui-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div class="min-w-0">
        <h1 class="page-title">{{ title() }}</h1>
        @if (subtitle()) {
          <p class="mt-2 text-sm text-slate-500">{{ subtitle() }}</p>
        }
      </div>
      <div class="flex flex-wrap items-center gap-2"><ng-content /></div>
    </header>
  `,
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
}

@Component({
  selector: 'ui-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div>
      @if (label()) {
        <label class="label" [attr.for]="for()">
          {{ label() }}
          @if (required()) {
            <span class="text-rose-500" aria-hidden="true">*</span>
          }
        </label>
      }
      <ng-content />
      @if (error()) {
        <p class="field-error" role="alert">{{ error() }}</p>
      } @else if (hint()) {
        <p class="mt-1 text-xs text-slate-500">{{ hint() }}</p>
      }
    </div>
  `,
})
export class FieldComponent {
  readonly label = input<string>();
  readonly for = input<string>();
  readonly hint = input<string>();
  readonly error = input<string | null>();
  readonly required = input(false);
}

@Component({
  selector: 'ui-stat-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'card block p-5' },
  template: `
    <p class="text-xs font-semibold text-slate-500">{{ label() }}</p>
    <p
      class="mt-1.5 text-[26px] leading-tight font-semibold tracking-tight text-slate-900 tabular-nums"
    >
      {{ value() }}
    </p>
    @if (hint()) {
      <p class="mt-1 text-xs" [class]="toneClass()">{{ hint() }}</p>
    }
  `,
})
export class StatCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly hint = input<string>();
  readonly tone = input<'neutral' | 'danger' | 'warning' | 'success'>('neutral');

  protected toneClass(): string {
    return {
      neutral: 'text-slate-500',
      danger: 'text-rose-600',
      warning: 'text-amber-700',
      success: 'text-emerald-700',
    }[this.tone()];
  }
}
