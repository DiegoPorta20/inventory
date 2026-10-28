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
} from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from '../../../shared/presentation/zod-validation.pipe.js';
import {
  CreateCostCenter,
  DeleteCostCenter,
  ListCostCenters,
  RenameCostCenter,
} from '../application/use-cases/cost-center-use-cases.js';

const costCenterSchema = z.strictObject({ name: z.string().trim().min(1).max(120) });
type CostCenterBody = z.infer<typeof costCenterSchema>;

@Controller('cost-centers')
export class CostCentersController {
  constructor(
    private readonly listCostCenters: ListCostCenters,
    private readonly createCostCenter: CreateCostCenter,
    private readonly renameCostCenter: RenameCostCenter,
    private readonly deleteCostCenter: DeleteCostCenter,
  ) {}

  @Get()
  list() {
    return this.listCostCenters.execute();
  }

  @Post()
  create(@Body(new ZodValidationPipe(costCenterSchema)) body: CostCenterBody) {
    return this.createCostCenter.execute(body.name);
  }

  @Patch(':id')
  rename(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(costCenterSchema)) body: CostCenterBody,
  ) {
    return this.renameCostCenter.execute(id, body.name);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.deleteCostCenter.execute(id);
  }
}
