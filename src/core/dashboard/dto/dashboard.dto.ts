import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class DashboardQueryDto {
  @ApiPropertyOptional({
    example: '2026-09-01',
    description: 'Defaults to the first day of the current month',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-09-30T23:59:59Z', description: 'Defaults to now' })
  @IsOptional()
  @IsDateString()
  to?: string;
}

export class DashboardMetricDto {
  @ApiProperty({ example: 'revenue' })
  key!: string;

  @ApiProperty({ example: 'Faturamento' })
  label!: string;

  @ApiProperty({ oneOf: [{ type: 'number' }, { type: 'string' }], example: '1520.00' })
  value!: number | string;

  @ApiProperty({ enum: ['count', 'currency', 'percent'] })
  unit!: 'count' | 'currency' | 'percent';
}

export class DashboardSectionDto {
  @ApiProperty({ example: 'barbershop' })
  key!: string;

  @ApiProperty({ example: 'Barbearia' })
  label!: string;

  @ApiProperty({ type: [DashboardMetricDto] })
  metrics!: DashboardMetricDto[];
}

export class DashboardPeriodDto {
  @ApiProperty()
  from!: Date;

  @ApiProperty()
  to!: Date;
}

export class DashboardResponseDto {
  @ApiProperty({ type: DashboardPeriodDto })
  period!: DashboardPeriodDto;

  @ApiProperty({ type: DashboardSectionDto })
  core!: DashboardSectionDto;

  @ApiProperty({
    type: [DashboardSectionDto],
    description: 'Metrics contributed by business modules',
  })
  modules!: DashboardSectionDto[];
}
