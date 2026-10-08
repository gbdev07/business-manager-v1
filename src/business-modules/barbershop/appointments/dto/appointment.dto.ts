import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppointmentStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PageMetaDto, PaginationQueryDto } from '@common/dto/pagination.dto';

export class CreateAppointmentDto {
  @ApiProperty()
  @IsUUID()
  customerId!: string;

  @ApiProperty()
  @IsUUID()
  barberId!: string;

  @ApiProperty({ description: 'Core catalog service; its duration defines the slot length' })
  @IsUUID()
  serviceId!: string;

  @ApiProperty({ example: '2026-10-01T13:00:00.000Z' })
  @IsDateString()
  startsAt!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class RescheduleAppointmentDto {
  @ApiProperty({ example: '2026-10-02T14:00:00.000Z' })
  @IsDateString()
  startsAt!: string;

  @ApiPropertyOptional({ description: 'Optionally move to another barber' })
  @IsOptional()
  @IsUUID()
  barberId?: string;
}

export class CancelAppointmentDto {
  @ApiPropertyOptional({ example: 'Cliente pediu para desmarcar' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class QueryAppointmentsDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  barberId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ enum: AppointmentStatus })
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @ApiPropertyOptional({ example: '2026-10-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-10-31T23:59:59.000Z' })
  @IsOptional()
  @IsDateString()
  to?: string;
}

class NamedRefDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;
}

export class AppointmentResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ type: NamedRefDto })
  customer!: NamedRefDto;

  @ApiProperty({ type: NamedRefDto })
  barber!: NamedRefDto;

  @ApiProperty({ type: NamedRefDto })
  service!: NamedRefDto;

  @ApiProperty()
  startsAt!: Date;

  @ApiProperty()
  endsAt!: Date;

  @ApiProperty({ enum: AppointmentStatus })
  status!: AppointmentStatus;

  @ApiPropertyOptional({ nullable: true, example: '45.00' })
  price!: string | null;

  @ApiPropertyOptional({ nullable: true })
  notes!: string | null;

  @ApiPropertyOptional({ nullable: true })
  confirmedAt!: Date | null;

  @ApiPropertyOptional({ nullable: true })
  completedAt!: Date | null;

  @ApiPropertyOptional({ nullable: true })
  cancelledAt!: Date | null;

  @ApiPropertyOptional({ nullable: true })
  cancellationReason!: string | null;

  @ApiProperty()
  createdAt!: Date;
}

export class PaginatedAppointmentsDto {
  @ApiProperty({ type: [AppointmentResponseDto] })
  data!: AppointmentResponseDto[];

  @ApiProperty({ type: PageMetaDto })
  meta!: PageMetaDto;
}
