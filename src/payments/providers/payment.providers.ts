import { Injectable, NotImplementedException } from '@nestjs/common';
import { PaymentProviderName, PaymentStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import {
  CreateProviderChargeInput,
  PaymentProvider,
  ProviderChargeResult,
} from '@payments/providers/payment-provider.interface';

@Injectable()
export class ManualPaymentProvider implements PaymentProvider {
  readonly name = PaymentProviderName.MANUAL;

  createCharge(input: CreateProviderChargeInput): Promise<ProviderChargeResult> {
    return Promise.resolve({
      externalId: `manual_${randomUUID()}`,
      status: PaymentStatus.PENDING,
      providerPayload: {
        mode: 'manual',
        barbershopId: input.barbershopId,
        amount: input.amount,
        currency: input.currency,
        description: input.description,
      },
    });
  }

  getCharge(externalId: string): Promise<ProviderChargeResult> {
    return Promise.resolve({
      externalId,
      status: PaymentStatus.PENDING,
      providerPayload: { mode: 'manual', note: 'Local manual charge — no external sync' },
    });
  }

  cancelCharge(externalId: string): Promise<ProviderChargeResult> {
    return Promise.resolve({
      externalId,
      status: PaymentStatus.CANCELLED,
      providerPayload: { mode: 'manual', cancelled: true },
    });
  }
}

@Injectable()
export class AsaasPaymentProvider implements PaymentProvider {
  readonly name = PaymentProviderName.ASAAS;

  createCharge(_input: CreateProviderChargeInput): Promise<ProviderChargeResult> {
    throw new NotImplementedException(
      'Asaas integration is not implemented yet. Configure Manual provider or implement AsaasPaymentProvider.',
    );
  }

  getCharge(_externalId: string): Promise<ProviderChargeResult> {
    throw new NotImplementedException('Asaas integration is not implemented yet.');
  }

  cancelCharge(_externalId: string): Promise<ProviderChargeResult> {
    throw new NotImplementedException('Asaas integration is not implemented yet.');
  }
}

@Injectable()
export class MercadoPagoPaymentProvider implements PaymentProvider {
  readonly name = PaymentProviderName.MERCADO_PAGO;

  createCharge(_input: CreateProviderChargeInput): Promise<ProviderChargeResult> {
    throw new NotImplementedException(
      'Mercado Pago integration is not implemented yet. Configure Manual provider or implement MercadoPagoPaymentProvider.',
    );
  }

  getCharge(_externalId: string): Promise<ProviderChargeResult> {
    throw new NotImplementedException('Mercado Pago integration is not implemented yet.');
  }

  cancelCharge(_externalId: string): Promise<ProviderChargeResult> {
    throw new NotImplementedException('Mercado Pago integration is not implemented yet.');
  }
}
