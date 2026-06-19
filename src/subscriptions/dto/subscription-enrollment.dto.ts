import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsOptional, IsUUID } from 'class-validator';

export class EnrollCustomerDto {
  @ApiProperty({ example: 'uuid-plan-id' })
  @IsUUID()
  planId!: string;

  @ApiProperty({ example: 'uuid-customer-id' })
  @IsUUID()
  customerId!: string;

  @ApiPropertyOptional({ example: '2026-06-20T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Enable future automatic renewal when payment integration is active',
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  autoRenew?: boolean = false;
}

export class RenewEnrollmentDto {
  @ApiPropertyOptional({
    example: '2026-07-20T00:00:00.000Z',
    description: 'Optional new start date; defaults to current end date or now',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Keep automatic renewal enabled after manual renewal',
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  autoRenew?: boolean;
}

export class CancelEnrollmentDto {
  @ApiPropertyOptional({ example: 'Cliente solicitou cancelamento' })
  @IsOptional()
  reason?: string;
}
