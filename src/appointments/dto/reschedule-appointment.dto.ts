import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class RescheduleAppointmentDto {
  @ApiProperty({ example: '2026-06-21T10:00:00.000Z' })
  @IsDateString()
  scheduledAt!: string;

  @ApiPropertyOptional({ example: 'uuid-barber-id' })
  @IsOptional()
  @IsUUID()
  barberId?: string;

  @ApiPropertyOptional({ example: 45 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(15)
  @Max(480)
  durationMinutes?: number;
}
