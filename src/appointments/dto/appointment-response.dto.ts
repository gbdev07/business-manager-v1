import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppointmentStatus } from '@prisma/client';

export class AppointmentResponseDto {
  @ApiProperty({ example: 'uuid-appointment-id' })
  id!: string;

  @ApiProperty({ example: 'uuid-barbershop-id' })
  barbershopId!: string;

  @ApiProperty({ example: 'uuid-barber-id' })
  barberId!: string;

  @ApiProperty({ example: 'Carlos Santos' })
  barberName!: string;

  @ApiProperty({ example: 'uuid-customer-id' })
  customerId!: string;

  @ApiProperty({ example: 'João Silva' })
  customerName!: string;

  @ApiProperty({ example: '2026-06-20T14:00:00.000Z' })
  scheduledAt!: Date;

  @ApiProperty({ example: 30 })
  durationMinutes!: number;

  @ApiProperty({ enum: AppointmentStatus, example: AppointmentStatus.SCHEDULED })
  status!: AppointmentStatus;

  @ApiPropertyOptional({ example: '45.00' })
  price?: string | null;

  @ApiPropertyOptional({ example: 'Corte + barba' })
  notes?: string | null;

  @ApiPropertyOptional({ example: '2026-06-19T12:00:00.000Z' })
  cancelledAt?: Date | null;

  @ApiPropertyOptional({ example: 'Cliente desistiu' })
  cancellationReason?: string | null;

  @ApiProperty({ example: '2026-06-19T12:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-06-19T12:00:00.000Z' })
  updatedAt!: Date;
}

export class PaginatedAppointmentsResponseDto {
  @ApiProperty({ type: [AppointmentResponseDto] })
  data!: AppointmentResponseDto[];

  @ApiProperty({ example: 15 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 10 })
  limit!: number;

  @ApiProperty({ example: 2 })
  totalPages!: number;
}
