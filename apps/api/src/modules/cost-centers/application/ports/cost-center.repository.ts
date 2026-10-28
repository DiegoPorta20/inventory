import type { CostCenter, CostCenterWithCount } from '../../domain/cost-center.js';

export abstract class CostCenterRepository {
  abstract findAllWithCounts(): Promise<CostCenterWithCount[]>;
  abstract findById(id: number): Promise<CostCenter | null>;
  abstract create(name: string): Promise<CostCenter>;
  abstract rename(id: number, name: string): Promise<CostCenter>;
  abstract countProducts(id: number): Promise<number>;
  abstract delete(id: number): Promise<void>;
}
