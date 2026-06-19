import { Payment } from '@prisma/client';
import { ChargeResponseDto } from '@payments/dto/charge-response.dto';
import { ProviderChargeResult } from '@payments/providers/payment-provider.interface';

export function mapPaymentToChargeResponse(
  payment: Payment,
  providerExtras?: Pick<ProviderChargeResult, 'checkoutUrl' | 'barcode' | 'pixCopyPaste'>,
): ChargeResponseDto {
  return {
    id: payment.id,
    barbershopId: payment.barbershopId,
    customerId: payment.customerId,
    appointmentId: payment.appointmentId,
    subscriptionId: payment.subscriptionId,
    type: payment.type,
    amount: payment.amount.toString(),
    currency: payment.currency,
    status: payment.status,
    provider: payment.provider,
    method: payment.method,
    externalId: payment.externalId,
    description: payment.description,
    checkoutUrl: providerExtras?.checkoutUrl ?? null,
    paidAt: payment.paidAt,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
  };
}
