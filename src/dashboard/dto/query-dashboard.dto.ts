import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class QueryDashboardDto {
  @ApiPropertyOptional({ example: 'uuid-barbershop-id' })
  @IsOptional()
  @IsUUID()
  barbershopId?: string;

  @ApiPropertyOptional({
    example: 6,
    description: 'Reference month (1–12). Defaults to current month.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @ApiPropertyOptional({ example: 2026, description: 'Reference year. Defaults to current year.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;
}
