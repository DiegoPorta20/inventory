import { Injectable } from '@nestjs/common';
import { ValidationError } from '../../../../shared/domain/errors.js';
import { ProductReferences } from '../product-references.js';
import { ProductRepository, type BulkProductChanges } from '../ports/product.repository.js';

@Injectable()
export class BulkUpdateProducts {
  constructor(
    private readonly products: ProductRepository,
    private readonly references: ProductReferences,
  ) {}

  async execute(ids: number[], changes: BulkProductChanges): Promise<{ updated: number }> {
    if (Object.values(changes).every((value) => value === undefined)) {
      throw new ValidationError('No changes provided');
    }
    await this.references.assertCategory(changes.categoryId);
    const updated = await this.products.bulkUpdate([...new Set(ids)], changes);
    return { updated };
  }
}
