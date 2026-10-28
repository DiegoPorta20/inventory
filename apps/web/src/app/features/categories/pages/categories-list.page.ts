import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { errorMessage } from '../../../core/http/api-utils';
import type { Category } from '../../../shared/models/models';
import { FORMAT_PIPES } from '../../../shared/pipes/format.pipes';
import { IconComponent } from '../../../shared/ui/icon.component';
import { PageHeaderComponent } from '../../../shared/ui/layout.components';
import { ConfirmService } from '../../../shared/ui/confirm.service';
import {
  EmptyStateComponent,
  ErrorStateComponent,
  TableSkeletonComponent,
} from '../../../shared/ui/states.components';
import { ToastService } from '../../../shared/ui/toast.service';
import { CategoriesApi } from '../categories.api';
import { openCategoryDialog } from '../components/category.dialog';

interface CategoryNode extends Category {
  children: Category[];
}

@Component({
  selector: 'app-categories-list-page',
  imports: [
    RouterLink,
    FORMAT_PIPES,
    IconComponent,
    PageHeaderComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-page-header title="Categorías" subtitle="Clasificación de productos en dos niveles.">
      <button type="button" class="btn btn-primary" (click)="openCreate()">
        <ui-icon name="plus" [size]="4" /> Nueva categoría
      </button>
    </ui-page-header>

    <div class="card">
      @if (categories.isLoading()) {
        <ui-table-skeleton [rows]="6" [cols]="3" />
      } @else if (categories.error()) {
        <ui-error-state>
          <button type="button" class="btn btn-secondary" (click)="categories.reload()">
            Reintentar
          </button>
        </ui-error-state>
      } @else if (tree().length === 0) {
        <ui-empty-state
          icon="tag"
          title="Sin categorías"
          description="Crea categorías para clasificar tus productos y filtrarlos con facilidad."
        >
          <button type="button" class="btn btn-primary" (click)="openCreate()">
            Nueva categoría
          </button>
        </ui-empty-state>
      } @else {
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Categoría</th>
                <th class="num">Productos</th>
                <th class="w-28"><span class="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              @for (node of tree(); track node.id) {
                <tr>
                  <td>
                    <a
                      class="font-medium text-slate-800 hover:text-brand-700"
                      [routerLink]="['/products']"
                      [queryParams]="{ categoryId: node.id }"
                    >
                      {{ node.name }}
                    </a>
                  </td>
                  <td class="num">{{ node.productCount | quantity }}</td>
                  <td>
                    <div class="flex justify-end gap-1">
                      <button
                        type="button"
                        class="btn btn-ghost btn-icon btn-sm"
                        [attr.aria-label]="'Editar ' + node.name"
                        (click)="openEdit(node)"
                      >
                        <ui-icon name="edit" [size]="4" />
                      </button>
                      <button
                        type="button"
                        class="btn btn-ghost btn-icon btn-sm text-rose-600"
                        [attr.aria-label]="'Eliminar ' + node.name"
                        (click)="remove(node)"
                      >
                        <ui-icon name="trash" [size]="4" />
                      </button>
                    </div>
                  </td>
                </tr>
                @for (child of node.children; track child.id) {
                  <tr>
                    <td>
                      <span class="flex items-center gap-2 pl-6 text-slate-700">
                        <ui-icon name="chevron-right" [size]="3" />
                        <a
                          class="hover:text-brand-700"
                          [routerLink]="['/products']"
                          [queryParams]="{ categoryId: child.id }"
                        >
                          {{ child.name }}
                        </a>
                      </span>
                    </td>
                    <td class="num">{{ child.productCount | quantity }}</td>
                    <td>
                      <div class="flex justify-end gap-1">
                        <button
                          type="button"
                          class="btn btn-ghost btn-icon btn-sm"
                          [attr.aria-label]="'Editar ' + child.name"
                          (click)="openEdit(child)"
                        >
                          <ui-icon name="edit" [size]="4" />
                        </button>
                        <button
                          type="button"
                          class="btn btn-ghost btn-icon btn-sm text-rose-600"
                          [attr.aria-label]="'Eliminar ' + child.name"
                          (click)="remove(child)"
                        >
                          <ui-icon name="trash" [size]="4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
})
export class CategoriesListPage {
  private readonly api = inject(CategoriesApi);
  private readonly dialog = inject(Dialog);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  protected readonly categories = rxResource<Category[], void>({
    stream: () => this.api.list(),
  });

  private readonly items = computed(() =>
    this.categories.hasValue() ? this.categories.value() : [],
  );
  protected readonly roots = computed(() =>
    this.items().filter((category) => category.parentId === null),
  );

  protected readonly tree = computed<CategoryNode[]>(() => {
    const all = this.items();
    const byParent = new Map<number, Category[]>();
    for (const category of all) {
      if (category.parentId === null) continue;
      const list = byParent.get(category.parentId) ?? [];
      list.push(category);
      byParent.set(category.parentId, list);
    }
    const sort = (list: Category[]) =>
      [...list].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'es'));
    return sort(this.roots()).map((root) => ({
      ...root,
      children: sort(byParent.get(root.id) ?? []),
    }));
  });

  protected async openCreate(): Promise<void> {
    const saved = await firstValueFrom(
      openCategoryDialog(this.dialog, { roots: this.roots() }).closed,
    );
    if (saved) this.categories.reload();
  }

  protected async openEdit(category: Category): Promise<void> {
    const saved = await firstValueFrom(
      openCategoryDialog(this.dialog, { category, roots: this.roots() }).closed,
    );
    if (saved) this.categories.reload();
  }

  protected async remove(category: Category): Promise<void> {
    const confirmed = await this.confirm.confirm({
      title: 'Eliminar categoría',
      message: `¿Eliminar la categoría "${category.name}"? Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!confirmed) return;

    this.api.remove(category.id).subscribe({
      next: () => {
        this.toast.success('Categoría eliminada.');
        this.categories.reload();
      },
      error: (error: unknown) => this.toast.error(errorMessage(error)),
    });
  }
}
