import { ApiPropertyOptional } from '@nestjs/swagger';
import { AppointmentStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class QueryAppointmentsDto {
  @ApiPropertyOptional({ example: 'uuid-barbershop-id' })
  @IsOptional()
  @IsUUID()
  barbershopId?: string;

  @ApiPropertyOptional({ example: 'uuid-barber-id' })
  @IsOptional()
  @IsUUID()
  barberId?: string;

  @ApiPropertyOptional({ example: 'uuid-customer-id' })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ enum: AppointmentStatus })
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @ApiPropertyOptional({ example: '2026-06-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-06-30T23:59:59.999Z' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}
