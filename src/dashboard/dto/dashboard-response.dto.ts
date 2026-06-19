import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ActiveCustomersMetricDto {
  @ApiProperty({ example: 128 })
  count!: number;
}

export class AppointmentsTodayMetricDto {
  @ApiProperty({ example: 14 })
  count!: number;

  @ApiProperty({ example: '2026-06-19' })
  date!: string;
}

export class MonthlyRevenueMetricDto {
  @ApiProperty({ example: '8750.00' })
  total!: string;

  @ApiProperty({ example: 'BRL' })
  currency!: string;

  @ApiProperty({ example: 6 })
  month!: number;

  @ApiProperty({ example: 2026 })
  year!: number;
}

export class ActiveSubscriptionsMetricDto {
  @ApiProperty({ example: 42 })
  count!: number;
}

export class TopBarberMetricDto {
  @ApiPropertyOptional({ example: 'uuid-barber-id' })
  barberId?: string | null;

  @ApiPropertyOptional({ example: 'Carlos Silva' })
  barberName?: string | null;

  @ApiProperty({ example: 38 })
  completedAppointments!: number;

  @ApiProperty({ example: 6 })
  month!: number;

  @ApiProperty({ example: 2026 })
  year!: number;
}

export class DashboardSummaryResponseDto {
  @ApiProperty({ example: 'uuid-barbershop-id' })
  barbershopId!: string;

  @ApiProperty({ example: 'America/Sao_Paulo' })
  timezone!: string;

  @ApiProperty({ type: ActiveCustomersMetricDto })
  activeCustomers!: ActiveCustomersMetricDto;

  @ApiProperty({ type: AppointmentsTodayMetricDto })
  appointmentsToday!: AppointmentsTodayMetricDto;

  @ApiProperty({ type: MonthlyRevenueMetricDto })
  monthlyRevenue!: MonthlyRevenueMetricDto;

  @ApiProperty({ type: ActiveSubscriptionsMetricDto })
  activeSubscriptions!: ActiveSubscriptionsMetricDto;

  @ApiProperty({ type: TopBarberMetricDto })
  topBarber!: TopBarberMetricDto;

  @ApiProperty({ example: '2026-06-19T15:30:00.000Z' })
  generatedAt!: Date;
}
