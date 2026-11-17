import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { IconComponent } from './icon.component';

@Component({
  selector: 'ui-search-input',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative">
      <span class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
        <ui-icon name="search" [size]="4" />
      </span>
      <input
        class="input input-pill pr-8 pl-9"
        type="search"
        [placeholder]="placeholder()"
        [attr.aria-label]="label()"
        [value]="text()"
        (input)="onInput($any($event.target).value)"
      />
      @if (text()) {
        <button
          type="button"
          class="absolute inset-y-0 right-2 flex items-center text-slate-400 hover:text-slate-600"
          aria-label="Limpiar búsqueda"
          (click)="onInput('')"
        >
          <ui-icon name="x" [size]="4" />
        </button>
      }
    </div>
  `,
})
export class SearchInputComponent {
  readonly value = input('');
  readonly placeholder = input('Buscar…');
  readonly label = input('Buscar');
  readonly debounce = input(300);
  readonly search = output<string>();

  protected readonly text = signal('');
  private readonly typed$ = new Subject<string>();

  constructor() {
    effect(() => this.text.set(this.value()));
    this.typed$
      .pipe(
        debounceTime(this.debounce()),
        distinctUntilChanged(),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe((term) => this.search.emit(term.trim()));
  }

  protected onInput(value: string): void {
    this.text.set(value);
    this.typed$.next(value);
  }
}
