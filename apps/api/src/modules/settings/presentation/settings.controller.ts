import { Body, Controller, Get, Put } from '@nestjs/common';
import { z } from 'zod';
import { Role } from '../../../shared/domain/auth.js';
import { Roles } from '../../../shared/presentation/decorators.js';
import { ZodValidationPipe } from '../../../shared/presentation/zod-validation.pipe.js';
import {
  GetPricingSettings,
  UpdatePricingSettings,
} from '../application/use-cases/pricing-settings-use-cases.js';

const updatePricingSchema = z.strictObject({
  exchangeRate: z.number().gt(0).max(100).optional(),
  igvRate: z.number().min(0).max(1).optional(),
});
type UpdatePricingBody = z.infer<typeof updatePricingSchema>;

@Controller('settings/pricing')
export class SettingsController {
  constructor(
    private readonly getPricing: GetPricingSettings,
    private readonly updatePricing: UpdatePricingSettings,
  ) {}

  @Get()
  get() {
    return this.getPricing.execute();
  }

  @Put()
  @Roles(Role.ADMIN)
  update(@Body(new ZodValidationPipe(updatePricingSchema)) body: UpdatePricingBody) {
    return this.updatePricing.execute(body);
  }
}
