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
      class="flex max-h-[calc(100vh-2rem)] flex-col rounded-xl bg-white shadow-xl"
      [style.width]="'min(' + width() + ', calc(100vw - 2rem))'"
      role="dialog"
      aria-modal="true"
      [attr.aria-label]="title()"
    >
      <header class="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 class="text-base font-semibold text-slate-900">{{ title() }}</h2>
          @if (subtitle()) {
            <p class="mt-0.5 text-sm text-slate-500">{{ subtitle() }}</p>
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
      <div class="overflow-y-auto px-5 py-4"><ng-content /></div>
      <footer class="flex justify-end gap-2 border-t border-slate-100 px-5 py-3 empty:hidden">
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
