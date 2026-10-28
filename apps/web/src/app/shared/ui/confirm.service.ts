import { Dialog, DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

@Component({
  selector: 'ui-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="w-[min(28rem,calc(100vw-2rem))] rounded-xl bg-white p-5 shadow-xl"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-message"
    >
      <h2 id="confirm-title" class="text-base font-semibold text-slate-900">{{ data.title }}</h2>
      <p id="confirm-message" class="mt-2 text-sm text-slate-600">{{ data.message }}</p>
      <div class="mt-5 flex justify-end gap-2">
        <button type="button" class="btn btn-secondary" (click)="ref.close(false)">
          {{ data.cancelLabel ?? 'Cancelar' }}
        </button>
        <button
          type="button"
          class="btn"
          [class]="data.danger ? 'btn-danger' : 'btn-primary'"
          cdkFocusInitial
          (click)="ref.close(true)"
        >
          {{ data.confirmLabel ?? 'Confirmar' }}
        </button>
      </div>
    </div>
  `,
})
export class ConfirmDialogComponent {
  protected readonly data = inject<ConfirmOptions>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<boolean>>(DialogRef);
}

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private readonly dialog = inject(Dialog);

  async confirm(options: ConfirmOptions): Promise<boolean> {
    const ref = this.dialog.open<boolean>(ConfirmDialogComponent, {
      data: options,
      ariaModal: true,
      autoFocus: 'dialog',
    });
    return (await firstValueFrom(ref.closed, { defaultValue: false })) === true;
  }
}
