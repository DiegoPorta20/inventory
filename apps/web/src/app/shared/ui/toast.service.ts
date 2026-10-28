import { Injectable, signal } from '@angular/core';

export type ToastTone = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
}

const DURATION_MS = 4500;

@Injectable({ providedIn: 'root' })
export class ToastService {
  private sequence = 0;
  private readonly _toasts = signal<Toast[]>([]);
  readonly toasts = this._toasts.asReadonly();

  success(message: string): void {
    this.push('success', message);
  }

  error(message: string): void {
    this.push('error', message);
  }

  info(message: string): void {
    this.push('info', message);
  }

  dismiss(id: number): void {
    this._toasts.update((list) => list.filter((toast) => toast.id !== id));
  }

  private push(tone: ToastTone, message: string): void {
    const id = ++this.sequence;
    this._toasts.update((list) => [...list, { id, tone, message }]);
    setTimeout(() => this.dismiss(id), DURATION_MS);
  }
}
