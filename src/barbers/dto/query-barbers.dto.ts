import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class QueryBarbersDto {
  @ApiPropertyOptional({
    description: 'Filter by barbershop (required for non super-admins)',
    example: 'uuid-barbershop-id',
  })
  @IsOptional()
  @IsUUID()
  barbershopId?: string;

  @ApiPropertyOptional({ description: 'Include inactive barbers', default: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeInactive?: boolean = false;

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
