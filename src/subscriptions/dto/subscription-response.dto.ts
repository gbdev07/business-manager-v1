import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SubscriptionInterval, SubscriptionStatus, SubscriptionType } from '@prisma/client';

export class SubscriptionPlanResponseDto {
  @ApiProperty({ example: 'uuid-plan-id' })
  id!: string;

  @ApiProperty({ example: 'uuid-barbershop-id' })
  barbershopId!: string;

  @ApiProperty({ enum: SubscriptionType, example: SubscriptionType.PLAN })
  type!: SubscriptionType;

  @ApiProperty({ example: 'Plano Mensal Premium' })
  name!: string;

  @ApiPropertyOptional({ example: '4 cortes por mês + barba' })
  description?: string | null;

  @ApiProperty({ example: '149.90' })
  price!: string;

  @ApiProperty({ example: 'BRL' })
  currency!: string;

  @ApiPropertyOptional({ enum: SubscriptionInterval })
  interval?: SubscriptionInterval | null;

  @ApiPropertyOptional({ example: 30 })
  durationDays?: number | null;

  @ApiProperty({ example: ['4 cortes por mês', 'Barba inclusa'] })
  benefits!: string[];

  @ApiProperty({ enum: SubscriptionStatus })
  status!: SubscriptionStatus;

  @ApiProperty({ example: '2026-06-19T12:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-06-19T12:00:00.000Z' })
  updatedAt!: Date;
}

export class SubscriptionEnrollmentResponseDto {
  @ApiProperty({ example: 'uuid-enrollment-id' })
  id!: string;

  @ApiProperty({ example: 'uuid-barbershop-id' })
  barbershopId!: string;

  @ApiProperty({ enum: SubscriptionType, example: SubscriptionType.ENROLLMENT })
  type!: SubscriptionType;

  @ApiProperty({ example: 'uuid-plan-id' })
  planId!: string;

  @ApiProperty({ example: 'Plano Mensal Premium' })
  planName!: string;

  @ApiProperty({ example: 'uuid-customer-id' })
  customerId!: string;

  @ApiProperty({ example: 'João Silva' })
  customerName!: string;

  @ApiProperty({ example: '149.90' })
  price!: string;

  @ApiProperty({ example: 'BRL' })
  currency!: string;

  @ApiPropertyOptional({ example: 30 })
  durationDays?: number | null;

  @ApiProperty({ example: ['4 cortes por mês'] })
  benefits!: string[];

  @ApiProperty({ enum: SubscriptionStatus })
  status!: SubscriptionStatus;

  @ApiProperty({ example: '2026-06-20T00:00:00.000Z' })
  startDate!: Date;

  @ApiProperty({ example: '2026-07-20T00:00:00.000Z' })
  endDate!: Date;

  @ApiProperty({ example: false })
  autoRenew!: boolean;

  @ApiPropertyOptional({ example: '2026-07-19T00:00:00.000Z' })
  nextRenewalAt?: Date | null;

  @ApiProperty({ example: '2026-06-19T12:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-06-19T12:00:00.000Z' })
  updatedAt!: Date;
}

export class PaginatedPlansResponseDto {
  @ApiProperty({ type: [SubscriptionPlanResponseDto] })
  data!: SubscriptionPlanResponseDto[];

  @ApiProperty({ example: 5 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 10 })
  limit!: number;

  @ApiProperty({ example: 1 })
  totalPages!: number;
}

export class PaginatedEnrollmentsResponseDto {
  @ApiProperty({ type: [SubscriptionEnrollmentResponseDto] })
  data!: SubscriptionEnrollmentResponseDto[];

  @ApiProperty({ example: 12 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 10 })
  limit!: number;

  @ApiProperty({ example: 2 })
  totalPages!: number;
}

export class AutoRenewalRulesResponseDto {
  @ApiProperty({ example: true })
  enabled!: boolean;

  @ApiProperty({ example: 3 })
  gracePeriodDays!: number;

  @ApiProperty({ example: 3 })
  maxRenewalAttempts!: number;

  @ApiProperty({ example: 1 })
  renewalLeadDays!: number;

  @ApiProperty({
    example:
      'When autoRenew=true and nextRenewalAt <= now, a scheduled job should renew the enrollment and create a SUBSCRIPTION_RENEWAL payment.',
  })
  description!: string;
}
