import { Injectable } from '@nestjs/common';
import { ConflictError, NotFoundError } from '../../../../shared/domain/errors.js';
import { normalizeProductCode, normalizeProductName, type Product } from '../../domain/product.js';
import { ProductReferences } from '../product-references.js';
import { ProductRepository, type ProductChanges } from '../ports/product.repository.js';
import type { CreateProductInput } from './create-product.js';

export type UpdateProductInput = Partial<CreateProductInput>;

@Injectable()
export class UpdateProduct {
  constructor(
    private readonly products: ProductRepository,
    private readonly references: ProductReferences,
  ) {}

  async execute(id: number, input: UpdateProductInput): Promise<Product> {
    const existing = await this.products.findById(id);
    if (!existing) throw new NotFoundError('Product', id);

    await this.references.assertCategory(input.categoryId);
    await this.references.assertEquipment(input.equipmentIds);
    this.references.assertPricing(input.costUsd, input.priceUsd);

    const changes: ProductChanges = {
      name: input.name === undefined ? undefined : normalizeProductName(input.name),
      description: input.description,
      categoryId: input.categoryId,
      unit: input.unit,
      minStock: input.minStock,
      reorderQuantity: input.reorderQuantity,
      location: input.location,
      costUsd: input.costUsd,
      priceUsd: input.priceUsd,
      notes: input.notes,
      isActive: input.isActive,
    };

    if (input.code !== undefined) {
      const code = normalizeProductCode(input.code);
      const owner = await this.products.findByCode(code);
      if (owner && owner.id !== id) throw new ConflictError(`Product code ${code} already exists`);
      changes.code = code;
      changes.isInternalCode = false;
    }

    return this.products.update(
      id,
      changes,
      input.equipmentIds ? [...new Set(input.equipmentIds)] : undefined,
    );
  }
}
