import { Dialog, DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { errorMessage, fieldErrors } from '../../../core/http/api-utils';
import type { Category } from '../../../shared/models/models';
import { DialogFrameComponent } from '../../../shared/ui/dialog-frame.component';
import { FieldComponent } from '../../../shared/ui/layout.components';
import { ToastService } from '../../../shared/ui/toast.service';
import { CategoriesApi } from '../categories.api';

export interface CategoryDialogData {
  /** Category being edited, or undefined when creating. */
  category?: Category;
  /** Root categories selectable as parent. */
  roots: Category[];
}

/** Opens the create/edit dialog; resolves to true when a category was saved. */
export function openCategoryDialog(dialog: Dialog, data: CategoryDialogData) {
  return dialog.open<boolean, CategoryDialogData>(CategoryDialog, {
    data,
    ariaModal: true,
    autoFocus: 'first-tabbable',
  });
}

@Component({
  selector: 'app-category-dialog',
  imports: [ReactiveFormsModule, DialogFrameComponent, FieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-dialog-frame [title]="isEdit ? 'Editar categoría' : 'Nueva categoría'" width="28rem">
      <form
        id="category-form"
        class="space-y-4"
        [formGroup]="form"
        (ngSubmit)="submit()"
        novalidate
      >
        <ui-field label="Nombre" for="category-name" [required]="true" [error]="errors()['name']">
          <input
            id="category-name"
            class="input"
            formControlName="name"
            maxlength="120"
            autocomplete="off"
          />
        </ui-field>

        <ui-field
          label="Categoría padre"
          for="category-parent"
          hint="Déjalo vacío para una categoría raíz."
          [error]="errors()['parentId']"
        >
          <select id="category-parent" class="input" formControlName="parentId">
            <option [ngValue]="null">— Sin padre (raíz) —</option>
            @for (root of selectableRoots; track root.id) {
              <option [ngValue]="root.id">{{ root.name }}</option>
            }
          </select>
        </ui-field>

        <ui-field
          label="Orden"
          for="category-sort"
          hint="Menor aparece primero."
          [error]="errors()['sortOrder']"
        >
          <input
            id="category-sort"
            class="input"
            type="number"
            min="0"
            step="1"
            formControlName="sortOrder"
          />
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
        <button type="button" class="btn btn-secondary" (click)="ref.close(false)">Cancelar</button>
        <button type="submit" form="category-form" class="btn btn-primary" [disabled]="pending()">
          {{ pending() ? 'Guardando…' : 'Guardar' }}
        </button>
      </ng-container>
    </ui-dialog-frame>
  `,
})
export class CategoryDialog {
  protected readonly data = inject<CategoryDialogData>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<boolean>>(DialogRef);
  private readonly api = inject(CategoriesApi);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly isEdit = !!this.data.category;
  // A category with children cannot become a child itself; itself is never selectable as its own parent.
  protected readonly selectableRoots = this.data.roots.filter(
    (root) => root.id !== this.data.category?.id,
  );

  protected readonly pending = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly errors = signal<Record<string, string>>({});

  protected readonly form = this.fb.group({
    name: [this.data.category?.name ?? '', [Validators.required, Validators.maxLength(120)]],
    parentId: [this.data.category?.parentId ?? (null as number | null)],
    sortOrder: [this.data.category?.sortOrder ?? 0, [Validators.min(0)]],
  });

  protected submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.pending()) return;

    const value = this.form.getRawValue();
    const payload = {
      name: value.name.trim(),
      parentId: value.parentId ?? null,
      sortOrder: Number(value.sortOrder) || 0,
    };

    this.pending.set(true);
    this.serverError.set(null);
    this.errors.set({});

    const request = this.data.category
      ? this.api.update(this.data.category.id, payload)
      : this.api.create(payload);

    request.subscribe({
      next: () => {
        this.toast.success(this.isEdit ? 'Categoría actualizada.' : 'Categoría creada.');
        this.ref.close(true);
      },
      error: (error: unknown) => {
        this.pending.set(false);
        this.errors.set(fieldErrors(error));
        this.serverError.set(errorMessage(error));
      },
    });
  }
}
