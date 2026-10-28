import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ZodValidationPipe } from '../../../shared/presentation/zod-validation.pipe.js';
import {
  CreateEquipmentModel,
  DeleteEquipmentModel,
  ListEquipmentModels,
  UpdateEquipmentModel,
} from '../application/use-cases/equipment-model-use-cases.js';
import {
  createEquipmentModelSchema,
  listEquipmentModelsSchema,
  updateEquipmentModelSchema,
  type CreateEquipmentModelBody,
  type ListEquipmentModelsQuery,
  type UpdateEquipmentModelBody,
} from './equipment-models.schemas.js';

@Controller('equipment-models')
export class EquipmentModelsController {
  constructor(
    private readonly listModels: ListEquipmentModels,
    private readonly createModel: CreateEquipmentModel,
    private readonly updateModel: UpdateEquipmentModel,
    private readonly deleteModel: DeleteEquipmentModel,
  ) {}

  @Get()
  list(@Query(new ZodValidationPipe(listEquipmentModelsSchema)) query: ListEquipmentModelsQuery) {
    return this.listModels.execute(query.search);
  }

  @Post()
  create(@Body(new ZodValidationPipe(createEquipmentModelSchema)) body: CreateEquipmentModelBody) {
    return this.createModel.execute({
      name: body.name,
      brand: body.brand ?? null,
      description: body.description ?? null,
    });
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(updateEquipmentModelSchema)) body: UpdateEquipmentModelBody,
  ) {
    return this.updateModel.execute(id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.deleteModel.execute(id);
  }
}
