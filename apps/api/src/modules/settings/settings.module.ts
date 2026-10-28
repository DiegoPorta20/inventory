import { Module } from '@nestjs/common';
import { SettingsRepository } from './application/ports/settings.repository.js';
import {
  GetPricingSettings,
  UpdatePricingSettings,
} from './application/use-cases/pricing-settings-use-cases.js';
import { DrizzleSettingsRepository } from './infrastructure/drizzle-settings.repository.js';
import { SettingsController } from './presentation/settings.controller.js';

@Module({
  controllers: [SettingsController],
  providers: [
    GetPricingSettings,
    UpdatePricingSettings,
    { provide: SettingsRepository, useClass: DrizzleSettingsRepository },
  ],
  exports: [GetPricingSettings],
})
export class SettingsModule {}
