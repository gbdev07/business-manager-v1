import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppointmentStatus } from '@prisma/client';

export class AppointmentHistoryItemDto {
  @ApiProperty({ example: 'uuid-appointment-id' })
  id!: string;

  @ApiProperty({ example: '2026-06-20T14:00:00.000Z' })
  scheduledAt!: Date;

  @ApiProperty({ enum: AppointmentStatus, example: AppointmentStatus.SCHEDULED })
  status!: AppointmentStatus;

  @ApiProperty({ example: 30 })
  durationMinutes!: number;

  @ApiPropertyOptional({ example: '45.00' })
  price?: string | null;

  @ApiProperty({ example: 'Carlos Santos' })
  barberName!: string;

  @ApiPropertyOptional({ example: 'Corte + barba' })
  notes?: string | null;
}

export class CustomerHistoryResponseDto {
  @ApiProperty({ example: 'uuid-customer-id' })
  customerId!: string;

  @ApiProperty({
    type: [AppointmentHistoryItemDto],
    description: 'Past completed or cancelled appointments',
  })
  past!: AppointmentHistoryItemDto[];

  @ApiProperty({
    type: [AppointmentHistoryItemDto],
    description: 'Upcoming scheduled appointments',
  })
  upcoming!: AppointmentHistoryItemDto[];

  @ApiProperty({ example: 12 })
  totalPast!: number;

  @ApiProperty({ example: 2 })
  totalUpcoming!: number;
}
