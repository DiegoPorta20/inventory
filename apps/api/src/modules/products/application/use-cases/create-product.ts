import { Injectable } from '@nestjs/common';
import { ConflictError } from '../../../../shared/domain/errors.js';
import {
  formatInternalCode,
  normalizeProductCode,
  normalizeProductName,
  type Product,
  type UnitOfMeasure,
} from '../../domain/product.js';
import { ProductReferences } from '../product-references.js';
import { ProductRepository } from '../ports/product.repository.js';

export interface CreateProductInput {
  code?: string;
  name: string;
  description?: string | null;
  specification?: string | null;
  categoryId?: number | null;
  costCenterId?: number | null;
  unit: UnitOfMeasure;
  minStock?: number;
  reorderQuantity?: number;
  location?: string | null;
  costPen?: number | null;
  pricePen?: number | null;
  wholesalePricePen?: number | null;
  wholesaleMinQty?: number | null;
  isConsignment?: boolean;
  notes?: string | null;
  isActive?: boolean;
  equipmentIds?: number[];
}

@Injectable()
export class CreateProduct {
  constructor(
    private readonly products: ProductRepository,
    private readonly references: ProductReferences,
  ) {}

  async execute(input: CreateProductInput): Promise<Product> {
    await this.references.assertCategory(input.categoryId);
    await this.references.assertCostCenter(input.costCenterId);
    await this.references.assertEquipment(input.equipmentIds);
    this.references.assertPricing({
      costPen: input.costPen,
      pricePen: input.pricePen,
      wholesalePricePen: input.wholesalePricePen,
    });

    const isInternalCode = !input.code;
    const code = input.code
      ? normalizeProductCode(input.code)
      : formatInternalCode(await this.products.nextInternalSequence());
    if (await this.products.findByCode(code)) {
      throw new ConflictError(`Product code ${code} already exists`);
    }

    return this.products.create(
      {
        code,
        isInternalCode,
        name: normalizeProductName(input.name),
        description: input.description ?? null,
        specification: input.specification ?? null,
        categoryId: input.categoryId ?? null,
        costCenterId: input.costCenterId ?? null,
        unit: input.unit,
        minStock: input.minStock ?? 0,
        reorderQuantity: input.reorderQuantity ?? 0,
        location: input.location ?? null,
        costPen: input.costPen ?? null,
        pricePen: input.pricePen ?? null,
        wholesalePricePen: input.wholesalePricePen ?? null,
        wholesaleMinQty: input.wholesaleMinQty ?? null,
        isConsignment: input.isConsignment ?? false,
        notes: input.notes ?? null,
        isActive: input.isActive ?? true,
      },
      [...new Set(input.equipmentIds ?? [])],
    );
  }
}
