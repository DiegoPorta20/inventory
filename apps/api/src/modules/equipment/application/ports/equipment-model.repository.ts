import type {
  EquipmentModel,
  EquipmentModelDraft,
  EquipmentModelWithCount,
} from '../../domain/equipment-model.js';

export abstract class EquipmentModelRepository {
  abstract findAllWithCounts(search?: string): Promise<EquipmentModelWithCount[]>;
  abstract findById(id: number): Promise<EquipmentModel | null>;
  abstract create(model: EquipmentModelDraft): Promise<EquipmentModel>;
  abstract update(id: number, changes: Partial<EquipmentModelDraft>): Promise<EquipmentModel>;
  abstract delete(id: number): Promise<void>;
}
