import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '@auth/decorators/current-user.decorator';
import { Roles } from '@auth/decorators/roles.decorator';
import { AuthenticatedUser } from '@auth/interfaces/authenticated-user.interface';
import { DASHBOARD_READ_ROLES } from '@dashboard/constants/dashboard.constants';
import {
  ActiveCustomersMetricDto,
  ActiveSubscriptionsMetricDto,
  AppointmentsTodayMetricDto,
  DashboardSummaryResponseDto,
  MonthlyRevenueMetricDto,
  TopBarberMetricDto,
} from '@dashboard/dto/dashboard-response.dto';
import { QueryDashboardDto } from '@dashboard/dto/query-dashboard.dto';
import { DashboardService } from '@dashboard/dashboard.service';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @Roles(...DASHBOARD_READ_ROLES)
  @ApiOperation({
    summary: 'Dashboard summary',
    description:
      'Returns all KPIs in a single request. Metrics are fetched in parallel with optimized Prisma queries.',
  })
  @ApiOkResponse({ type: DashboardSummaryResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing access token' })
  getSummary(
    @Query() query: QueryDashboardDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<DashboardSummaryResponseDto> {
    return this.dashboardService.getSummary(query, currentUser);
  }

  @Get('metrics/active-customers')
  @Roles(...DASHBOARD_READ_ROLES)
  @ApiOperation({ summary: 'Active customers count' })
  @ApiOkResponse({ type: ActiveCustomersMetricDto })
  getActiveCustomers(
    @Query() query: QueryDashboardDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<ActiveCustomersMetricDto> {
    return this.dashboardService.getActiveCustomersMetric(query, currentUser);
  }

  @Get('metrics/appointments-today')
  @Roles(...DASHBOARD_READ_ROLES)
  @ApiOperation({ summary: 'Appointments scheduled for today (barbershop timezone)' })
  @ApiOkResponse({ type: AppointmentsTodayMetricDto })
  getAppointmentsToday(
    @Query() query: QueryDashboardDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<AppointmentsTodayMetricDto> {
    return this.dashboardService.getAppointmentsTodayMetric(query, currentUser);
  }

  @Get('metrics/monthly-revenue')
  @Roles(...DASHBOARD_READ_ROLES)
  @ApiOperation({ summary: 'Paid revenue for the reference month' })
  @ApiOkResponse({ type: MonthlyRevenueMetricDto })
  getMonthlyRevenue(
    @Query() query: QueryDashboardDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<MonthlyRevenueMetricDto> {
    return this.dashboardService.getMonthlyRevenueMetric(query, currentUser);
  }

  @Get('metrics/active-subscriptions')
  @Roles(...DASHBOARD_READ_ROLES)
  @ApiOperation({ summary: 'Active subscription enrollments count' })
  @ApiOkResponse({ type: ActiveSubscriptionsMetricDto })
  getActiveSubscriptions(
    @Query() query: QueryDashboardDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<ActiveSubscriptionsMetricDto> {
    return this.dashboardService.getActiveSubscriptionsMetric(query, currentUser);
  }

  @Get('metrics/top-barber')
  @Roles(...DASHBOARD_READ_ROLES)
  @ApiOperation({
    summary: 'Most productive barber',
    description: 'Barber with the most completed appointments in the reference month.',
  })
  @ApiOkResponse({ type: TopBarberMetricDto })
  getTopBarber(
    @Query() query: QueryDashboardDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<TopBarberMetricDto> {
    return this.dashboardService.getTopBarberMetric(query, currentUser);
  }
}
