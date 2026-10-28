import type { UnitOfMeasure } from '../../shared/models/models';

/** Payload passed from the reorder screen to the import form via router navigation state. */
export interface ImportPrefillLine {
  productId: number;
  code: string;
  name: string;
  unit: UnitOfMeasure;
  quantityOrdered: number;
  unitCostUsd: number | null;
}

export interface ImportPrefill {
  items: ImportPrefillLine[];
}

export interface ImportNavigationState {
  prefill?: ImportPrefill;
}
