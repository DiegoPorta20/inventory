import { Injectable } from '@nestjs/common';
import type { Page, PageRequest } from '../../../../shared/application/page.js';
import { SpreadsheetWriter } from '../../../../shared/application/spreadsheet-writer.js';
import { NotFoundError } from '../../../../shared/domain/errors.js';
import { GetPricingSettings } from '../../../settings/application/use-cases/pricing-settings-use-cases.js';
import {
  productPricing,
  type PricingSettings,
  type ProductPricing,
} from '../../../settings/domain/pricing.js';
import type { ProductListItem } from '../../domain/product.js';
import {
  ProductRepository,
  type ProductDetail,
  type ProductFilters,
} from '../ports/product.repository.js';

const EXPORT_LIMIT = 5000;

export type PricedProduct = ProductListItem & { pricing: ProductPricing };
export type PricedProductDetail = ProductDetail & { pricing: ProductPricing };

const withPricing = <T extends ProductListItem>(item: T, settings: PricingSettings) => ({
  ...item,
  pricing: productPricing(item, settings),
});

@Injectable()
export class SearchProducts {
  constructor(
    private readonly products: ProductRepository,
    private readonly pricingSettings: GetPricingSettings,
  ) {}

  async execute(filters: ProductFilters, page: PageRequest): Promise<Page<PricedProduct>> {
    const [result, settings] = await Promise.all([
      this.products.search(filters, page),
      this.pricingSettings.execute(),
    ]);
    return { ...result, items: result.items.map((item) => withPricing(item, settings)) };
  }
}

@Injectable()
export class GetProduct {
  constructor(
    private readonly products: ProductRepository,
    private readonly pricingSettings: GetPricingSettings,
  ) {}

  async execute(id: number): Promise<PricedProductDetail> {
    const product = await this.products.findDetail(id);
    if (!product) throw new NotFoundError('Product', id);
    return withPricing(product, await this.pricingSettings.execute());
  }
}

const STATUS_LABEL = { OUT: 'Sin stock', LOW: 'Bajo', OK: 'OK' } as const;
const MONEY = '#,##0.00';

@Injectable()
export class ExportProducts {
  constructor(
    private readonly products: ProductRepository,
    private readonly pricingSettings: GetPricingSettings,
    private readonly spreadsheet: SpreadsheetWriter,
  ) {}

  async execute(filters: ProductFilters): Promise<Buffer> {
    const [items, settings] = await Promise.all([
      this.products.searchAll(filters, EXPORT_LIMIT),
      this.pricingSettings.execute(),
    ]);
    return this.spreadsheet.write({
      name: 'Inventario',
      columns: [
        { header: 'Código', key: 'code', width: 20 },
        { header: 'Descripción', key: 'name', width: 50 },
        { header: 'Especificación', key: 'specification', width: 30 },
        { header: 'Categoría', key: 'category', width: 26 },
        { header: 'Centro de costo', key: 'costCenter', width: 20 },
        { header: 'Unidad', key: 'unit', width: 10 },
        { header: 'Stock', key: 'stock', width: 10 },
        { header: 'Stock mínimo', key: 'minStock', width: 14 },
        { header: 'En camino', key: 'incoming', width: 12 },
        { header: 'Estado', key: 'status', width: 12 },
        { header: 'Ubicación', key: 'location', width: 16 },
        { header: 'Consignación', key: 'consignment', width: 14 },
        { header: 'Costo USD', key: 'cost', width: 12, numFmt: MONEY },
        { header: 'Precio USD sin IGV', key: 'price', width: 18, numFmt: MONEY },
        { header: 'Precio S/ con IGV', key: 'pricePen', width: 18, numFmt: MONEY },
        { header: 'Valor a costo USD', key: 'costValue', width: 18, numFmt: MONEY },
        { header: 'Valor a precio USD', key: 'priceValue', width: 18, numFmt: MONEY },
      ],
      rows: items.map((item) => {
        const { pricing } = withPricing(item, settings);
        return {
          code: item.code,
          name: item.name,
          specification: item.specification,
          category: item.categoryName,
          costCenter: item.costCenterName,
          unit: item.unit,
          stock: item.stock,
          minStock: item.minStock,
          incoming: item.incomingQty,
          status: STATUS_LABEL[item.stockStatus],
          location: item.location,
          consignment: item.isConsignment ? 'Sí' : '',
          cost: item.costUsd,
          price: item.priceUsd,
          pricePen: pricing.retail?.priceWithIgvPen ?? null,
          costValue: item.costUsd == null ? null : item.costUsd * item.stock,
          priceValue: item.priceUsd == null ? null : item.priceUsd * item.stock,
        };
      }),
    });
  }
}

@Injectable()
export class ExportPriceList {
  constructor(
    private readonly products: ProductRepository,
    private readonly pricingSettings: GetPricingSettings,
    private readonly spreadsheet: SpreadsheetWriter,
  ) {}

  async execute(filters: ProductFilters): Promise<Buffer> {
    const [items, settings] = await Promise.all([
      this.products.searchAll(
        { ...filters, hasPrice: filters.hasPrice ?? true, isActive: filters.isActive ?? true },
        EXPORT_LIMIT,
      ),
      this.pricingSettings.execute(),
    ]);
    return this.spreadsheet.write({
      name: 'Lista de precios',
      columns: [
        { header: 'Código', key: 'code', width: 20 },
        { header: 'Descripción', key: 'name', width: 50 },
        { header: 'Especificación', key: 'specification', width: 30 },
        { header: 'Centro de costo', key: 'costCenter', width: 20 },
        { header: 'Unidad', key: 'unit', width: 10 },
        { header: 'Stock', key: 'stock', width: 10 },
        { header: 'Precio USD sin IGV', key: 'price', width: 18, numFmt: MONEY },
        { header: `IGV ${settings.igvRate * 100}% USD`, key: 'igv', width: 14, numFmt: MONEY },
        { header: 'Precio USD con IGV', key: 'priceIgv', width: 18, numFmt: MONEY },
        {
          header: `Precio S/ con IGV (T.C. ${settings.exchangeRate})`,
          key: 'pricePen',
          width: 26,
          numFmt: MONEY,
        },
        { header: 'Precio por mayor S/', key: 'wholesalePen', width: 20, numFmt: MONEY },
        { header: 'Mín. por mayor', key: 'wholesaleMin', width: 14 },
      ],
      rows: items.map((item) => {
        const { pricing } = withPricing(item, settings);
        return {
          code: item.code,
          name: item.name,
          specification: item.specification,
          costCenter: item.costCenterName,
          unit: item.unit,
          stock: item.stock,
          price: pricing.retail?.priceUsd ?? null,
          igv: pricing.retail?.igvUsd ?? null,
          priceIgv: pricing.retail?.priceWithIgvUsd ?? null,
          pricePen: pricing.retail?.priceWithIgvPen ?? null,
          wholesalePen: pricing.wholesale?.priceWithIgvPen ?? null,
          wholesaleMin: pricing.wholesale?.minQty ?? null,
        };
      }),
    });
  }
}
