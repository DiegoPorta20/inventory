import { Injectable } from '@nestjs/common';
import { DEFAULT_PRICING, type PricingSettings } from '../../domain/pricing.js';
import { SettingsRepository } from '../ports/settings.repository.js';

const EXCHANGE_RATE_KEY = 'pricing.exchangeRate';
const IGV_RATE_KEY = 'pricing.igvRate';

@Injectable()
export class GetPricingSettings {
  constructor(private readonly settings: SettingsRepository) {}

  async execute(): Promise<PricingSettings> {
    const stored = await this.settings.getAll();
    return {
      exchangeRate: Number(stored[EXCHANGE_RATE_KEY] ?? DEFAULT_PRICING.exchangeRate),
      igvRate: Number(stored[IGV_RATE_KEY] ?? DEFAULT_PRICING.igvRate),
    };
  }
}

@Injectable()
export class UpdatePricingSettings {
  constructor(
    private readonly settings: SettingsRepository,
    private readonly getSettings: GetPricingSettings,
  ) {}

  async execute(input: Partial<PricingSettings>): Promise<PricingSettings> {
    const entries: Record<string, string> = {};
    if (input.exchangeRate !== undefined) entries[EXCHANGE_RATE_KEY] = String(input.exchangeRate);
    if (input.igvRate !== undefined) entries[IGV_RATE_KEY] = String(input.igvRate);
    if (Object.keys(entries).length > 0) await this.settings.set(entries);
    return this.getSettings.execute();
  }
}
