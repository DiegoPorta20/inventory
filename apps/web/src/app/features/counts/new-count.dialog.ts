import { Dialog, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { errorMessage } from '../../core/http/api-utils';
import type { Category } from '../../shared/models/models';
import { DialogFrameComponent } from '../../shared/ui/dialog-frame.component';
import { FieldComponent } from '../../shared/ui/layout.components';
import { ToastService } from '../../shared/ui/toast.service';
import { buildCategoryOptions } from '../products/category-options';
import { CountsApi } from './counts.api';

export function openNewCountDialog(dialog: Dialog) {
  return dialog.open<number>(NewCountDialog, { ariaModal: true, autoFocus: 'first-tabbable' });
}

@Component({
  selector: 'app-new-count-dialog',
  imports: [ReactiveFormsModule, DialogFrameComponent, FieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-dialog-frame title="Nuevo conteo" subtitle="Toma de inventario físico." width="30rem">
      <form id="count-form" class="space-y-4" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <ui-field label="Nombre" for="count-name" [required]="true" [error]="nameError()">
          <input
            id="count-name"
            class="input"
            formControlName="name"
            maxlength="120"
            placeholder="Ej. Conteo general octubre"
          />
        </ui-field>

        <ui-field
          label="Categoría (opcional)"
          for="count-category"
          [hint]="'Limita el conteo a una categoría y sus subcategorías. Déjalo vacío para contar todo.'"
        >
          <select id="count-category" class="input" formControlName="categoryId">
            <option [value]="0">Todas las categorías</option>
            @for (c of categoryOptions(); track c.id) {
              <option [value]="c.id" [class.opt-root]="c.depth === 0" [class.opt-child]="c.depth > 0">{{ c.label }}</option>
            }
          </select>
        </ui-field>

        <ui-field label="Nota (opcional)" for="count-note">
          <textarea
            id="count-note"
            class="input"
            rows="2"
            formControlName="note"
            maxlength="500"
          ></textarea>
        </ui-field>

        @if (serverError()) {
          <p
            class="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
            role="alert"
          >
            {{ serverError() }}
          </p>
        }
      </form>

      <ng-container dialog-actions>
        <button type="button" class="btn btn-secondary" (click)="ref.close()">Cancelar</button>
        <button type="submit" form="count-form" class="btn btn-primary" [disabled]="pending()">
          {{ pending() ? 'Creando…' : 'Crear conteo' }}
        </button>
      </ng-container>
    </ui-dialog-frame>
  `,
})
export class NewCountDialog {
  protected readonly ref = inject<DialogRef<number>>(DialogRef);
  private readonly api = inject(CountsApi);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly pending = signal(false);
  protected readonly serverError = signal<string | null>(null);

  protected readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    categoryId: [0],
    note: [''],
  });

  private readonly categories = rxResource<Category[], void>({
    stream: () => this.api.categories(),
  });

  protected readonly categoryOptions = computed(() =>
    buildCategoryOptions(this.categories.hasValue() ? this.categories.value() : []),
  );

  protected nameError(): string | null {
    const control = this.form.controls.name;
    return control.touched && control.invalid ? 'Ingresa un nombre para el conteo.' : null;
  }

  protected submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.pending()) return;

    const value = this.form.getRawValue();
    this.pending.set(true);
    this.serverError.set(null);
    this.api
      .create({
        name: value.name.trim(),
        categoryId: Number(value.categoryId) || null,
        note: value.note.trim() || null,
      })
      .subscribe({
        next: (count) => {
          this.toast.success('Conteo creado.');
          this.ref.close(count.id);
        },
        error: (error: unknown) => {
          this.pending.set(false);
          this.serverError.set(errorMessage(error));
        },
      });
  }
}
