import { Global, Module } from '@nestjs/common';
import { DashboardController } from '@core/dashboard/dashboard.controller';
import { DashboardRegistry } from '@core/dashboard/dashboard.registry';
import { DashboardRepository } from '@core/dashboard/dashboard.repository';
import { DashboardService } from '@core/dashboard/dashboard.service';

/** Global so business modules can register their metric providers in the registry. */
@Global()
@Module({
  controllers: [DashboardController],
  providers: [DashboardService, DashboardRepository, DashboardRegistry],
  exports: [DashboardRegistry],
})
export class DashboardModule {}
