import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AppointmentStatus,
  PaymentStatus,
  Prisma,
  SubscriptionStatus,
  SubscriptionType,
} from '@prisma/client';
import { AuthenticatedUser } from '@auth/interfaces/authenticated-user.interface';
import { QueryDashboardDto } from '@dashboard/dto/query-dashboard.dto';
import {
  ActiveCustomersMetricDto,
  ActiveSubscriptionsMetricDto,
  AppointmentsTodayMetricDto,
  DashboardSummaryResponseDto,
  MonthlyRevenueMetricDto,
  TopBarberMetricDto,
} from '@dashboard/dto/dashboard-response.dto';
import {
  DashboardContext,
  formatTodayInTimezone,
  resolveDashboardPeriod,
} from '@dashboard/utils/dashboard-context.util';
import { PrismaService } from '@prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(
    query: QueryDashboardDto,
    currentUser: AuthenticatedUser,
  ): Promise<DashboardSummaryResponseDto> {
    const context = await this.resolveContext(query, currentUser);

    const [activeCustomers, appointmentsToday, monthlyRevenue, activeSubscriptions, topBarber] =
      await Promise.all([
        this.getActiveCustomers(context),
        this.getAppointmentsToday(context),
        this.getMonthlyRevenue(context),
        this.getActiveSubscriptions(context),
        this.getTopBarber(context),
      ]);

    return {
      barbershopId: context.barbershopId,
      timezone: context.timezone,
      activeCustomers,
      appointmentsToday,
      monthlyRevenue,
      activeSubscriptions,
      topBarber,
      generatedAt: new Date(),
    };
  }

  async getActiveCustomersMetric(
    query: QueryDashboardDto,
    currentUser: AuthenticatedUser,
  ): Promise<ActiveCustomersMetricDto> {
    const context = await this.resolveContext(query, currentUser);
    return this.getActiveCustomers(context);
  }

  async getAppointmentsTodayMetric(
    query: QueryDashboardDto,
    currentUser: AuthenticatedUser,
  ): Promise<AppointmentsTodayMetricDto> {
    const context = await this.resolveContext(query, currentUser);
    return this.getAppointmentsToday(context);
  }

  async getMonthlyRevenueMetric(
    query: QueryDashboardDto,
    currentUser: AuthenticatedUser,
  ): Promise<MonthlyRevenueMetricDto> {
    const context = await this.resolveContext(query, currentUser);
    return this.getMonthlyRevenue(context);
  }

  async getActiveSubscriptionsMetric(
    query: QueryDashboardDto,
    currentUser: AuthenticatedUser,
  ): Promise<ActiveSubscriptionsMetricDto> {
    const context = await this.resolveContext(query, currentUser);
    return this.getActiveSubscriptions(context);
  }

  async getTopBarberMetric(
    query: QueryDashboardDto,
    currentUser: AuthenticatedUser,
  ): Promise<TopBarberMetricDto> {
    const context = await this.resolveContext(query, currentUser);
    return this.getTopBarber(context);
  }

  private async getActiveCustomers(context: DashboardContext): Promise<ActiveCustomersMetricDto> {
    const count = await this.prisma.customer.count({
      where: {
        barbershopId: context.barbershopId,
        isActive: true,
        deletedAt: null,
      },
    });

    return { count };
  }

  private async getAppointmentsToday(
    context: DashboardContext,
  ): Promise<AppointmentsTodayMetricDto> {
    const date = formatTodayInTimezone(context.timezone);

    const result = await this.prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int AS count
      FROM appointments
      WHERE barbershop_id = ${context.barbershopId}::uuid
        AND deleted_at IS NULL
        AND status <> ${AppointmentStatus.CANCELLED}::appointment_status
        AND scheduled_at >= date_trunc('day', NOW() AT TIME ZONE ${context.timezone})
        AND scheduled_at < date_trunc('day', NOW() AT TIME ZONE ${context.timezone}) + INTERVAL '1 day'
    `;

    return {
      count: result[0]?.count ?? 0,
      date,
    };
  }

  private async getMonthlyRevenue(context: DashboardContext): Promise<MonthlyRevenueMetricDto> {
    const result = await this.prisma.$queryRaw<
      { total: Prisma.Decimal | null; currency: string }[]
    >`
      SELECT COALESCE(SUM(amount), 0) AS total, currency
      FROM payments
      WHERE barbershop_id = ${context.barbershopId}::uuid
        AND status = ${PaymentStatus.PAID}::payment_status
        AND paid_at IS NOT NULL
        AND paid_at >= make_timestamptz(
          ${context.period.year}::int,
          ${context.period.month}::int,
          1,
          0, 0, 0,
          ${context.timezone}
        )
        AND paid_at < make_timestamptz(
          ${context.period.year}::int,
          ${context.period.month}::int,
          1,
          0, 0, 0,
          ${context.timezone}
        ) + INTERVAL '1 month'
      GROUP BY currency
      ORDER BY currency
      LIMIT 1
    `;

    const row = result[0];

    return {
      total: row?.total?.toString() ?? '0.00',
      currency: row?.currency ?? 'BRL',
      month: context.period.month,
      year: context.period.year,
    };
  }

  private async getActiveSubscriptions(
    context: DashboardContext,
  ): Promise<ActiveSubscriptionsMetricDto> {
    const count = await this.prisma.subscription.count({
      where: {
        barbershopId: context.barbershopId,
        type: SubscriptionType.ENROLLMENT,
        status: SubscriptionStatus.ACTIVE,
        deletedAt: null,
      },
    });

    return { count };
  }

  private async getTopBarber(context: DashboardContext): Promise<TopBarberMetricDto> {
    const result = await this.prisma.$queryRaw<
      { barber_id: string; barber_name: string; completed_count: number }[]
    >`
      SELECT
        b.id AS barber_id,
        b.display_name AS barber_name,
        COUNT(a.id)::int AS completed_count
      FROM appointments a
      INNER JOIN barbers b ON b.id = a.barber_id
      WHERE a.barbershop_id = ${context.barbershopId}::uuid
        AND a.deleted_at IS NULL
        AND b.deleted_at IS NULL
        AND a.status = ${AppointmentStatus.COMPLETED}::appointment_status
        AND a.scheduled_at >= make_timestamptz(
          ${context.period.year}::int,
          ${context.period.month}::int,
          1,
          0, 0, 0,
          ${context.timezone}
        )
        AND a.scheduled_at < make_timestamptz(
          ${context.period.year}::int,
          ${context.period.month}::int,
          1,
          0, 0, 0,
          ${context.timezone}
        ) + INTERVAL '1 month'
      GROUP BY b.id, b.display_name
      ORDER BY completed_count DESC, b.display_name ASC
      LIMIT 1
    `;

    const top = result[0];

    return {
      barberId: top?.barber_id ?? null,
      barberName: top?.barber_name ?? null,
      completedAppointments: top?.completed_count ?? 0,
      month: context.period.month,
      year: context.period.year,
    };
  }

  private async resolveContext(
    query: QueryDashboardDto,
    currentUser: AuthenticatedUser,
  ): Promise<DashboardContext> {
    const barbershopId = this.resolveBarbershopId(query.barbershopId, currentUser);

    const barbershop = await this.prisma.barbershop.findFirst({
      where: { id: barbershopId, deletedAt: null, isActive: true },
      select: { id: true, timezone: true },
    });

    if (!barbershop) {
      throw new NotFoundException('Barbershop not found');
    }

    this.assertBarbershopReadAccess(currentUser, barbershop.id);

    return {
      barbershopId: barbershop.id,
      timezone: barbershop.timezone,
      period: resolveDashboardPeriod(query.month, query.year, barbershop.timezone),
    };
  }

  private resolveBarbershopId(
    barbershopId: string | undefined,
    currentUser: AuthenticatedUser,
  ): string {
    if (currentUser.isSuperAdmin) {
      if (!barbershopId) {
        throw new BadRequestException('barbershopId is required');
      }
      return barbershopId;
    }

    const allowedBarbershopIds = currentUser.memberships.map(
      (membership) => membership.barbershopId,
    );

    if (allowedBarbershopIds.length === 0) {
      throw new ForbiddenException('You do not belong to any barbershop');
    }

    if (barbershopId) {
      if (!allowedBarbershopIds.includes(barbershopId)) {
        throw new ForbiddenException('You do not have access to this barbershop');
      }
      return barbershopId;
    }

    if (allowedBarbershopIds.length === 1) {
      return allowedBarbershopIds[0];
    }

    throw new BadRequestException(
      'barbershopId is required when you belong to multiple barbershops',
    );
  }

  private assertBarbershopReadAccess(currentUser: AuthenticatedUser, barbershopId: string): void {
    if (currentUser.isSuperAdmin) {
      return;
    }

    const hasAccess = currentUser.memberships.some(
      (membership) => membership.barbershopId === barbershopId,
    );

    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this barbershop');
    }
  }
}
