import { DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { IconComponent } from './icon.component';

/** Standard frame for CDK dialogs: opened with `Dialog.open(MyComponent, { data })`, closed via DialogRef. */
@Component({
  selector: 'ui-dialog-frame',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="pop-in flex max-h-[calc(100vh-2rem)] flex-col rounded-3xl border bg-white shadow-xl"
      style="border-color: var(--line); transform-origin: center top"
      [style.width]="'min(' + width() + ', calc(100vw - 2rem))'"
      role="dialog"
      aria-modal="true"
      [attr.aria-label]="title()"
    >
      <header class="flex items-start justify-between gap-4 px-6 pt-5 pb-2">
        <div>
          <h2 class="text-xl font-bold tracking-tight text-slate-900">{{ title() }}</h2>
          @if (subtitle()) {
            <p class="mt-1 text-[13.5px] text-slate-500">{{ subtitle() }}</p>
          }
        </div>
        <button
          type="button"
          class="btn btn-ghost btn-icon -mt-1 -mr-2"
          aria-label="Cerrar"
          (click)="ref.close()"
        >
          <ui-icon name="x" [size]="5" />
        </button>
      </header>
      <div class="overflow-y-auto px-6 py-3"><ng-content /></div>
      <footer class="flex justify-end gap-2.5 px-6 pt-2 pb-5 empty:hidden">
        <ng-content select="[dialog-actions]" />
      </footer>
    </section>
  `,
})
export class DialogFrameComponent {
  protected readonly ref = inject(DialogRef);
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
  readonly width = input('32rem');
}
