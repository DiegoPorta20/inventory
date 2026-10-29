import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { errorMessage } from '../../../core/http/api-utils';
import type { ProductImportPreview, ProductImportRow } from '../../../shared/models/models';
import { FORMAT_PIPES } from '../../../shared/pipes/format.pipes';
import { BadgeComponent } from '../../../shared/ui/badge.components';
import { IconComponent } from '../../../shared/ui/icon.component';
import {
  FieldComponent,
  PageHeaderComponent,
  StatCardComponent,
} from '../../../shared/ui/layout.components';
import { ToastService } from '../../../shared/ui/toast.service';
import { downloadBlob } from '../../../shared/util/download';
import { ProductsApi } from '../products.api';

type RowFilter = 'all' | 'errors' | 'warnings';

const PAGE_STEP = 100;

@Component({
  selector: 'app-product-import-page',
  imports: [
    RouterLink,
    FORMAT_PIPES,
    BadgeComponent,
    FieldComponent,
    IconComponent,
    PageHeaderComponent,
    StatCardComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-page-header
      title="Importar productos"
      subtitle="Crea productos nuevos o actualiza los existentes desde un archivo Excel."
    >
      <a class="btn btn-secondary" routerLink="/products">Volver a productos</a>
    </ui-page-header>

    <div class="grid gap-4 lg:grid-cols-2">
      <section class="card p-4">
        <h2 class="section-title mb-2">1. Descarga la plantilla</h2>
        <p class="text-sm text-slate-600">
          Llena una fila por producto. La plantilla trae listas desplegables, una hoja de
          instrucciones y notas en cada encabezado.
        </p>
        <ul class="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600">
          <li>Si el <strong>código ya existe</strong>, se actualiza ese producto.</li>
          <li>Si el código no existe o va vacío, se <strong>crea</strong> uno nuevo.</li>
          <li>Las celdas vacías no modifican los productos existentes.</li>
          <li>
            Los montos van en soles: costo <strong>sin IGV</strong>, precios
            <strong>con IGV</strong>.
          </li>
        </ul>
        <button
          type="button"
          class="btn btn-secondary mt-4"
          [disabled]="downloading()"
          (click)="downloadTemplate()"
        >
          <ui-icon name="download" [size]="4" />
          {{ downloading() ? 'Descargando…' : 'Descargar plantilla' }}
        </button>
      </section>

      <section class="card p-4">
        <h2 class="section-title mb-2">2. Sube tu archivo</h2>
        <ui-field
          label="Archivo Excel (.xlsx)"
          for="import-file"
          hint="Máximo 5 MB y 2000 filas. Se valida antes de guardar nada."
        >
          <input
            id="import-file"
            class="input h-auto py-1.5 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1 file:text-sm file:font-medium file:text-slate-700"
            type="file"
            accept=".xlsx"
            [disabled]="validating() || importing()"
            (change)="onFileSelected($event)"
          />
        </ui-field>
        @if (validating()) {
          <p class="mt-3 text-sm text-slate-500" role="status">Validando el archivo…</p>
        }
        @if (requestError()) {
          <p
            class="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
            role="alert"
          >
            {{ requestError() }}
          </p>
        }
      </section>
    </div>

    @if (preview(); as p) {
      <section class="mt-4" aria-labelledby="preview-title">
        <h2 id="preview-title" class="section-title mb-3">3. Revisa y confirma</h2>

        @for (error of p.fileErrors; track error) {
          <p
            class="mb-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
            role="alert"
          >
            {{ error }}
          </p>
        }
        @for (warning of p.fileWarnings; track warning) {
          <p class="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            {{ warning }}
          </p>
        }

        @if (p.fileErrors.length === 0) {
          <div class="grid grid-cols-2 gap-3 md:grid-cols-5">
            <ui-stat-card label="Filas con datos" [value]="p.summary.totalRows | quantity" />
            <ui-stat-card
              label="Se crearán"
              [value]="p.summary.toCreate | quantity"
              [tone]="p.summary.toCreate > 0 ? 'success' : 'neutral'"
              hint="Productos nuevos"
            />
            <ui-stat-card
              label="Se actualizarán"
              [value]="p.summary.toUpdate | quantity"
              hint="Código ya existente"
            />
            <ui-stat-card
              label="Con errores"
              [value]="p.summary.withErrors | quantity"
              [tone]="p.summary.withErrors > 0 ? 'danger' : 'neutral'"
              [hint]="p.summary.withErrors > 0 ? 'Corrígelos para importar' : undefined"
            />
            <ui-stat-card
              label="Con avisos"
              [value]="p.summary.withWarnings | quantity"
              [tone]="p.summary.withWarnings > 0 ? 'warning' : 'neutral'"
              hint="No bloquean la importación"
            />
          </div>

          <div class="card mt-4">
            <div class="card-header">
              <h3 class="card-title">Detalle por fila</h3>
              <div class="flex gap-1" role="group" aria-label="Filtrar filas">
                @for (option of filterOptions; track option.value) {
                  <button
                    type="button"
                    class="btn btn-sm"
                    [class]="filter() === option.value ? 'btn-primary' : 'btn-secondary'"
                    [attr.aria-pressed]="filter() === option.value"
                    (click)="setFilter(option.value)"
                  >
                    {{ option.label }}
                  </button>
                }
              </div>
            </div>

            @if (visibleRows().length === 0) {
              <p class="px-4 py-10 text-center text-sm text-slate-500">
                No hay filas para este filtro.
              </p>
            } @else {
              <div class="table-wrap">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th scope="col" class="num w-16">Fila</th>
                      <th scope="col">Acción</th>
                      <th scope="col">Código</th>
                      <th scope="col">Descripción</th>
                      <th scope="col">Observaciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of visibleRows(); track row.rowNumber) {
                      <tr>
                        <td class="num text-slate-500">{{ row.rowNumber }}</td>
                        <td>
                          <ui-badge [tone]="tone(row)">{{ actionLabel(row) }}</ui-badge>
                        </td>
                        <td class="font-medium">
                          {{ row.code ?? 'Automático' }}
                        </td>
                        <td>{{ row.name ?? '—' }}</td>
                        <td>
                          @if (row.errors.length + row.warnings.length === 0) {
                            <span class="text-slate-400">—</span>
                          } @else {
                            <ul class="space-y-0.5">
                              @for (issue of row.errors; track $index) {
                                <li class="text-rose-700">
                                  <strong>{{ issue.column }}:</strong> {{ issue.message }}
                                </li>
                              }
                              @for (issue of row.warnings; track $index) {
                                <li class="text-amber-700">
                                  <strong>Aviso · {{ issue.column }}:</strong> {{ issue.message }}
                                </li>
                              }
                            </ul>
                          }
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
              @if (hiddenCount() > 0) {
                <div class="border-t border-slate-100 p-3 text-center">
                  <button type="button" class="btn btn-secondary btn-sm" (click)="showMore()">
                    Mostrar {{ hiddenCount() < step ? hiddenCount() : step }} más ({{
                      hiddenCount() | quantity
                    }}
                    sin mostrar)
                  </button>
                </div>
              }
            }
          </div>
        }

        <div class="mt-4 flex flex-wrap items-center justify-end gap-2">
          @if (!canImport() && p.fileErrors.length === 0 && p.summary.withErrors > 0) {
            <p class="mr-auto text-sm text-rose-700" role="status">
              Corrige los errores en tu archivo y vuelve a subirlo. No se importa nada mientras haya
              errores.
            </p>
          }
          <button
            type="button"
            class="btn btn-primary"
            [disabled]="!canImport() || importing()"
            (click)="confirmImport()"
          >
            <ui-icon name="upload" [size]="4" />
            {{ importing() ? 'Importando…' : importLabel() }}
          </button>
        </div>
      </section>
    }
  `,
})
export class ProductImportPage {
  private readonly api = inject(ProductsApi);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly step = PAGE_STEP;
  protected readonly filterOptions: { value: RowFilter; label: string }[] = [
    { value: 'all', label: 'Todas' },
    { value: 'errors', label: 'Con errores' },
    { value: 'warnings', label: 'Con avisos' },
  ];

  private readonly file = signal<File | null>(null);
  protected readonly preview = signal<ProductImportPreview | null>(null);
  protected readonly filter = signal<RowFilter>('all');
  protected readonly shown = signal(PAGE_STEP);
  protected readonly downloading = signal(false);
  protected readonly validating = signal(false);
  protected readonly importing = signal(false);
  protected readonly requestError = signal<string | null>(null);

  private readonly filteredRows = computed(() => {
    const rows = this.preview()?.rows ?? [];
    switch (this.filter()) {
      case 'errors':
        return rows.filter((row) => row.errors.length > 0);
      case 'warnings':
        return rows.filter((row) => row.warnings.length > 0);
      default:
        return rows;
    }
  });
  protected readonly visibleRows = computed(() => this.filteredRows().slice(0, this.shown()));
  protected readonly hiddenCount = computed(
    () => this.filteredRows().length - this.visibleRows().length,
  );

  protected readonly canImport = computed(() => {
    const p = this.preview();
    return (
      p !== null &&
      p.fileErrors.length === 0 &&
      p.summary.withErrors === 0 &&
      p.summary.totalRows > 0
    );
  });
  protected readonly importLabel = computed(() => {
    const summary = this.preview()?.summary;
    const valid = (summary?.toCreate ?? 0) + (summary?.toUpdate ?? 0);
    return `Importar ${valid} ${valid === 1 ? 'producto' : 'productos'}`;
  });

  protected tone(row: ProductImportRow): 'danger' | 'success' | 'brand' {
    if (row.errors.length > 0) return 'danger';
    return row.action === 'CREATE' ? 'success' : 'brand';
  }

  protected actionLabel(row: ProductImportRow): string {
    if (row.errors.length > 0) return 'Con error';
    return row.action === 'CREATE' ? 'Nuevo' : 'Actualiza';
  }

  protected setFilter(value: RowFilter): void {
    this.filter.set(value);
    this.shown.set(PAGE_STEP);
  }

  protected showMore(): void {
    this.shown.update((current) => current + PAGE_STEP);
  }

  protected downloadTemplate(): void {
    if (this.downloading()) return;
    this.downloading.set(true);
    this.api.downloadImportTemplate().subscribe({
      next: (blob) => {
        this.downloading.set(false);
        downloadBlob(blob, 'plantilla-productos.xlsx');
      },
      error: (error: unknown) => {
        this.downloading.set(false);
        this.toast.error(errorMessage(error));
      },
    });
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.item(0) ?? null;
    this.preview.set(null);
    this.requestError.set(null);
    this.filter.set('all');
    this.shown.set(PAGE_STEP);
    this.file.set(file);
    if (!file) return;

    this.validating.set(true);
    this.api.previewImport(file).subscribe({
      next: (preview) => {
        this.validating.set(false);
        this.preview.set(preview);
      },
      error: (error: unknown) => {
        this.validating.set(false);
        this.requestError.set(errorMessage(error));
        input.value = '';
        this.file.set(null);
      },
    });
  }

  protected confirmImport(): void {
    const file = this.file();
    if (!file || !this.canImport() || this.importing()) return;

    this.importing.set(true);
    this.requestError.set(null);
    this.api.importProducts(file).subscribe({
      next: (result) => {
        this.importing.set(false);
        const parts = [
          result.created > 0 ? `${result.created} creados` : null,
          result.updated > 0 ? `${result.updated} actualizados` : null,
        ].filter(Boolean);
        this.toast.success(`Importación completa: ${parts.join(' y ')}.`);
        void this.router.navigate(['/products']);
      },
      error: (error: unknown) => {
        this.importing.set(false);
        this.requestError.set(errorMessage(error));
      },
    });
  }
}
