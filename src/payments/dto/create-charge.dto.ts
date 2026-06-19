import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, PaymentProviderName, PaymentType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateChargeDto {
  @ApiProperty({ example: 'uuid-barbershop-id' })
  @IsUUID()
  barbershopId!: string;

  @ApiPropertyOptional({ example: 'uuid-customer-id' })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ example: 'uuid-appointment-id' })
  @IsOptional()
  @IsUUID()
  appointmentId?: string;

  @ApiPropertyOptional({ example: 'uuid-subscription-id' })
  @IsOptional()
  @IsUUID()
  subscriptionId?: string;

  @ApiProperty({ example: 149.9 })
  @Type(() => Number)
  @Min(0.01)
  amount!: number;

  @ApiPropertyOptional({ example: 'BRL', default: 'BRL' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ enum: PaymentType, default: PaymentType.OTHER })
  @IsOptional()
  @IsEnum(PaymentType)
  type?: PaymentType;

  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;

  @ApiPropertyOptional({
    enum: PaymentProviderName,
    default: PaymentProviderName.MANUAL,
    description: 'Gateway provider — ASAAS and MERCADO_PAGO are stubs for future integration',
  })
  @IsOptional()
  @IsEnum(PaymentProviderName)
  provider?: PaymentProviderName;

  @ApiPropertyOptional({ example: 'Assinatura Plano Mensal Premium' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '2026-06-25T23:59:59.000Z' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;
}

export class CancelChargeDto {
  @ApiPropertyOptional({ example: 'Cliente desistiu da compra' })
  @IsOptional()
  @IsString()
  reason?: string;
}
