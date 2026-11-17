import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IconComponent } from './icon.component';
import { ToastService } from './toast.service';

/** Dark, high-contrast toasts: the icon colour carries the tone, the text stays readable. */
@Component({
  selector: 'ui-toast-host',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="pointer-events-none fixed right-4 bottom-4 z-[1100] flex w-full max-w-sm flex-col gap-2"
      aria-live="polite"
    >
      @for (toast of toasts.toasts(); track toast.id) {
        <div
          class="pop-in pointer-events-auto flex items-start gap-3 rounded-2xl bg-slate-900 p-3.5 pl-4 text-white shadow-xl"
          style="transform-origin: bottom right"
          [attr.role]="toast.tone === 'error' ? 'alert' : 'status'"
        >
          <span
            class="mt-0.5"
            [class]="
              toast.tone === 'error'
                ? 'text-rose-400'
                : toast.tone === 'success'
                  ? 'text-emerald-400'
                  : 'text-sky-400'
            "
          >
            <ui-icon
              [name]="
                toast.tone === 'error' ? 'alert' : toast.tone === 'success' ? 'check' : 'info'
              "
              [size]="5"
            />
          </span>
          <p class="flex-1 text-[13.5px] font-semibold">{{ toast.message }}</p>
          <button
            type="button"
            class="flex size-7 items-center justify-center rounded-full text-slate-300 transition-colors duration-200 hover:bg-white/10 hover:text-white"
            aria-label="Cerrar"
            (click)="toasts.dismiss(toast.id)"
          >
            <ui-icon name="x" [size]="4" />
          </button>
        </div>
      }
    </div>
  `,
})
export class ToastHostComponent {
  protected readonly toasts = inject(ToastService);
}
