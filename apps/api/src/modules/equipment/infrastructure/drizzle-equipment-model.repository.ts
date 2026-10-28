import { Injectable } from '@nestjs/common';
import { count, eq, like, or } from 'drizzle-orm';
import { ConflictError, NotFoundError } from '../../../shared/domain/errors.js';
import { DatabaseService } from '../../../shared/infrastructure/database/database.service.js';
import { isDuplicateEntry } from '../../../shared/infrastructure/database/mysql-errors.js';
import {
  equipmentModels,
  productEquipment,
} from '../../../shared/infrastructure/database/schema.js';
import { EquipmentModelRepository } from '../application/ports/equipment-model.repository.js';
import type {
  EquipmentModel,
  EquipmentModelDraft,
  EquipmentModelWithCount,
} from '../domain/equipment-model.js';

const columns = {
  id: equipmentModels.id,
  name: equipmentModels.name,
  brand: equipmentModels.brand,
  description: equipmentModels.description,
};

@Injectable()
export class DrizzleEquipmentModelRepository extends EquipmentModelRepository {
  constructor(private readonly database: DatabaseService) {
    super();
  }

  async findAllWithCounts(search?: string): Promise<EquipmentModelWithCount[]> {
    const term = search ? `%${search}%` : undefined;
    const rows = await this.database.db
      .select({ ...columns, productCount: count(productEquipment.productId) })
      .from(equipmentModels)
      .leftJoin(productEquipment, eq(productEquipment.equipmentId, equipmentModels.id))
      .where(
        term ? or(like(equipmentModels.name, term), like(equipmentModels.brand, term)) : undefined,
      )
      .groupBy(equipmentModels.id)
      .orderBy(equipmentModels.name);
    return rows.map((row) => ({ ...row, productCount: Number(row.productCount) }));
  }

  async findById(id: number): Promise<EquipmentModel | null> {
    const [row] = await this.database.db
      .select(columns)
      .from(equipmentModels)
      .where(eq(equipmentModels.id, id))
      .limit(1);
    return row ?? null;
  }

  async create(model: EquipmentModelDraft): Promise<EquipmentModel> {
    try {
      const [result] = await this.database.db.insert(equipmentModels).values(model);
      return this.requireById(result.insertId);
    } catch (error) {
      if (isDuplicateEntry(error))
        throw new ConflictError('An equipment model with this name already exists');
      throw error;
    }
  }

  async update(id: number, changes: Partial<EquipmentModelDraft>): Promise<EquipmentModel> {
    const values = Object.fromEntries(
      Object.entries(changes).filter(([, value]) => value !== undefined),
    );
    try {
      if (Object.keys(values).length > 0) {
        await this.database.db
          .update(equipmentModels)
          .set(values)
          .where(eq(equipmentModels.id, id));
      }
    } catch (error) {
      if (isDuplicateEntry(error))
        throw new ConflictError('An equipment model with this name already exists');
      throw error;
    }
    return this.requireById(id);
  }

  async delete(id: number): Promise<void> {
    await this.database.db.delete(equipmentModels).where(eq(equipmentModels.id, id));
  }

  private async requireById(id: number): Promise<EquipmentModel> {
    const model = await this.findById(id);
    if (!model) throw new NotFoundError('Equipment model', id);
    return model;
  }
}
