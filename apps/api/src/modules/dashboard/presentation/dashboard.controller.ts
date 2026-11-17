import { Controller, Get } from '@nestjs/common';
import { GetDashboardSummary } from '../application/use-cases/get-dashboard-summary.js';
import { RequirePermission } from '../../../shared/presentation/decorators.js';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly getSummary: GetDashboardSummary) {}

  @Get('summary')
  @RequirePermission('dashboard.view')
  summary() {
    return this.getSummary.execute();
  }
}
