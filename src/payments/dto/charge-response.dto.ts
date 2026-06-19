import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, PaymentProviderName, PaymentStatus, PaymentType } from '@prisma/client';

export class ChargeResponseDto {
  @ApiProperty({ example: 'uuid-payment-id' })
  id!: string;

  @ApiProperty({ example: 'uuid-barbershop-id' })
  barbershopId!: string;

  @ApiPropertyOptional({ example: 'uuid-customer-id' })
  customerId?: string | null;

  @ApiPropertyOptional({ example: 'uuid-appointment-id' })
  appointmentId?: string | null;

  @ApiPropertyOptional({ example: 'uuid-subscription-id' })
  subscriptionId?: string | null;

  @ApiProperty({ enum: PaymentType })
  type!: PaymentType;

  @ApiProperty({ example: '149.90' })
  amount!: string;

  @ApiProperty({ example: 'BRL' })
  currency!: string;

  @ApiProperty({ enum: PaymentStatus })
  status!: PaymentStatus;

  @ApiProperty({ enum: PaymentProviderName })
  provider!: PaymentProviderName;

  @ApiPropertyOptional({ enum: PaymentMethod })
  method?: PaymentMethod | null;

  @ApiPropertyOptional({ example: 'manual_uuid-or-gateway-id' })
  externalId?: string | null;

  @ApiPropertyOptional({ example: 'Assinatura Plano Mensal Premium' })
  description?: string | null;

  @ApiPropertyOptional({ example: 'https://checkout.example.com/abc' })
  checkoutUrl?: string | null;

  @ApiPropertyOptional({ example: '2026-06-20T14:30:00.000Z' })
  paidAt?: Date | null;

  @ApiProperty({ example: '2026-06-19T12:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-06-19T12:00:00.000Z' })
  updatedAt!: Date;
}

export class PaginatedChargesResponseDto {
  @ApiProperty({ type: [ChargeResponseDto] })
  data!: ChargeResponseDto[];

  @ApiProperty({ example: 20 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 10 })
  limit!: number;

  @ApiProperty({ example: 2 })
  totalPages!: number;
}

export class PaymentProvidersResponseDto {
  @ApiProperty({ enum: PaymentProviderName, isArray: true })
  available!: PaymentProviderName[];

  @ApiProperty({ enum: PaymentProviderName, example: PaymentProviderName.MANUAL })
  defaultProvider!: PaymentProviderName;

  @ApiProperty({
    example:
      'ASAAS and MERCADO_PAGO providers are registered as stubs — implement gateway clients when ready.',
  })
  note!: string;
}
