import { Injectable } from '@nestjs/common';
import { BusinessRuleError, NotFoundError } from '../../../../shared/domain/errors.js';
import { ProductRepository } from '../ports/product.repository.js';

@Injectable()
export class DeleteProduct {
  constructor(private readonly products: ProductRepository) {}

  async execute(id: number): Promise<void> {
    if (!(await this.products.findById(id))) throw new NotFoundError('Product', id);
    if (await this.products.hasHistory(id)) {
      throw new BusinessRuleError(
        'PRODUCT_HAS_HISTORY',
        'Product has stock history; deactivate it instead of deleting',
      );
    }
    await this.products.delete(id);
  }
}
