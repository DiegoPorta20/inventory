import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconComponent, type IconName } from './icon.component';

@Component({
  selector: 'ui-empty-state',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col items-center px-6 py-14 text-center">
      <span
        class="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"
      >
        <ui-icon [name]="icon()" [size]="6" />
      </span>
      <h3 class="text-sm font-semibold text-slate-800">{{ title() }}</h3>
      @if (description()) {
        <p class="mt-1 max-w-sm text-sm text-slate-500">{{ description() }}</p>
      }
      <div class="mt-4 flex gap-2 empty:hidden"><ng-content /></div>
    </div>
  `,
})
export class EmptyStateComponent {
  readonly icon = input<IconName>('box');
  readonly title = input.required<string>();
  readonly description = input<string>();
}

@Component({
  selector: 'ui-error-state',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col items-center px-6 py-12 text-center" role="alert">
      <span
        class="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-500"
      >
        <ui-icon name="alert" [size]="6" />
      </span>
      <h3 class="text-sm font-semibold text-slate-800">{{ title() }}</h3>
      <p class="mt-1 max-w-sm text-sm text-slate-500">{{ message() }}</p>
      <div class="mt-4"><ng-content /></div>
    </div>
  `,
})
export class ErrorStateComponent {
  readonly title = input('No se pudo cargar la información');
  readonly message = input('Inténtalo nuevamente en unos segundos.');
}

@Component({
  selector: 'ui-table-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-3 p-4" aria-busy="true" aria-label="Cargando">
      @for (row of rowList(); track row) {
        <div class="flex items-center gap-4">
          @for (col of colList(); track col) {
            <div class="skeleton h-4 flex-1" [style.max-width.%]="col === 0 ? 20 : 100"></div>
          }
        </div>
      }
    </div>
  `,
})
export class TableSkeletonComponent {
  readonly rows = input(8);
  readonly cols = input(5);

  protected rowList(): number[] {
    return Array.from({ length: this.rows() }, (_, i) => i);
  }

  protected colList(): number[] {
    return Array.from({ length: this.cols() }, (_, i) => i);
  }
}
