import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CorePermission } from '@common/auth/permissions';
import { CurrentUser, RequirePermissions } from '@common/decorators/auth.decorators';
import { AuthenticatedUser } from '@common/types/authenticated-user';
import { DashboardService } from '@core/dashboard/dashboard.service';
import { DashboardQueryDto, DashboardResponseDto } from '@core/dashboard/dto/dashboard.dto';

@ApiTags('Core · Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @RequirePermissions(CorePermission.DASHBOARD_READ)
  @ApiOperation({ summary: 'Core metrics plus metrics contributed by the tenant business modules' })
  @ApiOkResponse({ type: DashboardResponseDto })
  getOverview(
    @Query() query: DashboardQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DashboardResponseDto> {
    return this.dashboardService.getOverview(query, user.businessType);
  }
}
