import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class CreateAppointmentDto {
  @ApiProperty({ example: 'uuid-barbershop-id' })
  @IsUUID()
  barbershopId!: string;

  @ApiProperty({ example: 'uuid-barber-id' })
  @IsUUID()
  barberId!: string;

  @ApiProperty({ example: 'uuid-customer-id' })
  @IsUUID()
  customerId!: string;

  @ApiProperty({ example: '2026-06-20T14:00:00.000Z' })
  @IsDateString()
  scheduledAt!: string;

  @ApiPropertyOptional({ example: 30, default: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(15)
  @Max(480)
  durationMinutes?: number = 30;

  @ApiPropertyOptional({ example: 45.0 })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ example: 'Corte + barba' })
  @IsOptional()
  @IsString()
  notes?: string;
}
