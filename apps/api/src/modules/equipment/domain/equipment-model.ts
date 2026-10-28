export interface EquipmentModel {
  id: number;
  name: string;
  brand: string | null;
  description: string | null;
}

export interface EquipmentModelWithCount extends EquipmentModel {
  productCount: number;
}

export type EquipmentModelDraft = Omit<EquipmentModel, 'id'>;
