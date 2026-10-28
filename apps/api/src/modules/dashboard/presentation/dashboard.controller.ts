import { Controller, Get } from '@nestjs/common';
import { GetDashboardSummary } from '../application/use-cases/get-dashboard-summary.js';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly getSummary: GetDashboardSummary) {}

  @Get('summary')
  summary() {
    return this.getSummary.execute();
  }
}
