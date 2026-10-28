import { Injectable } from '@nestjs/common';
import type { Page, PageRequest } from '../../../../shared/application/page.js';
import { SpreadsheetWriter } from '../../../../shared/application/spreadsheet-writer.js';
import { NotFoundError } from '../../../../shared/domain/errors.js';
import type { ProductListItem } from '../../domain/product.js';
import {
  ProductRepository,
  type ProductDetail,
  type ProductFilters,
} from '../ports/product.repository.js';

const EXPORT_LIMIT = 5000;

@Injectable()
export class SearchProducts {
  constructor(private readonly products: ProductRepository) {}

  execute(filters: ProductFilters, page: PageRequest): Promise<Page<ProductListItem>> {
    return this.products.search(filters, page);
  }
}

@Injectable()
export class GetProduct {
  constructor(private readonly products: ProductRepository) {}

  async execute(id: number): Promise<ProductDetail> {
    const product = await this.products.findDetail(id);
    if (!product) throw new NotFoundError('Product', id);
    return product;
  }
}

const STATUS_LABEL = { OUT: 'Sin stock', LOW: 'Bajo', OK: 'OK' } as const;

@Injectable()
export class ExportProducts {
  constructor(
    private readonly products: ProductRepository,
    private readonly spreadsheet: SpreadsheetWriter,
  ) {}

  async execute(filters: ProductFilters): Promise<Buffer> {
    const items = await this.products.searchAll(filters, EXPORT_LIMIT);
    return this.spreadsheet.write({
      name: 'Inventario',
      columns: [
        { header: 'Código', key: 'code', width: 20 },
        { header: 'Descripción', key: 'name', width: 50 },
        { header: 'Categoría', key: 'category', width: 26 },
        { header: 'Unidad', key: 'unit', width: 10 },
        { header: 'Stock', key: 'stock', width: 10 },
        { header: 'Stock mínimo', key: 'minStock', width: 14 },
        { header: 'En camino', key: 'incoming', width: 12 },
        { header: 'Estado', key: 'status', width: 12 },
        { header: 'Ubicación', key: 'location', width: 16 },
        { header: 'Costo USD', key: 'cost', width: 12, numFmt: '#,##0.00' },
        { header: 'Precio USD', key: 'price', width: 12, numFmt: '#,##0.00' },
        { header: 'Valor USD', key: 'value', width: 14, numFmt: '#,##0.00' },
      ],
      rows: items.map((item) => ({
        code: item.code,
        name: item.name,
        category: item.categoryName,
        unit: item.unit,
        stock: item.stock,
        minStock: item.minStock,
        incoming: item.incomingQty,
        status: STATUS_LABEL[item.stockStatus],
        location: item.location,
        cost: item.costUsd,
        price: item.priceUsd,
        value: item.costUsd == null ? null : item.costUsd * item.stock,
      })),
    });
  }
}
