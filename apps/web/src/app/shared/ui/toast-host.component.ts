import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IconComponent } from './icon.component';
import { ToastService } from './toast.service';

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
          class="pointer-events-auto flex items-start gap-3 rounded-lg border bg-white p-3 shadow-lg"
          [class]="
            toast.tone === 'error'
              ? 'border-rose-200'
              : toast.tone === 'success'
                ? 'border-emerald-200'
                : 'border-slate-200'
          "
          [attr.role]="toast.tone === 'error' ? 'alert' : 'status'"
        >
          <span
            class="mt-0.5"
            [class]="
              toast.tone === 'error'
                ? 'text-rose-500'
                : toast.tone === 'success'
                  ? 'text-emerald-500'
                  : 'text-sky-500'
            "
          >
            <ui-icon
              [name]="
                toast.tone === 'error' ? 'alert' : toast.tone === 'success' ? 'check' : 'info'
              "
              [size]="5"
            />
          </span>
          <p class="flex-1 text-sm text-slate-700">{{ toast.message }}</p>
          <button
            type="button"
            class="text-slate-400 hover:text-slate-600"
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
