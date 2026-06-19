import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentProviderName, PaymentStatus, PaymentType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class QueryChargesDto {
  @ApiPropertyOptional({ example: 'uuid-barbershop-id' })
  @IsOptional()
  @IsUUID()
  barbershopId?: string;

  @ApiPropertyOptional({ example: 'uuid-customer-id' })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiPropertyOptional({ enum: PaymentProviderName })
  @IsOptional()
  @IsEnum(PaymentProviderName)
  provider?: PaymentProviderName;

  @ApiPropertyOptional({ enum: PaymentType })
  @IsOptional()
  @IsEnum(PaymentType)
  type?: PaymentType;

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
