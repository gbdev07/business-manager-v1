import { Injectable } from '@nestjs/common';
import { PaymentGateway, PaymentStatus } from '@prisma/client';
import {
  ChargeResult,
  CreateChargeInput,
  PaymentProvider,
} from '@core/payments/providers/payment-provider.interface';

/** Local provider for payments received outside a gateway (cash, card machine, PIX key...). */
@Injectable()
export class ManualPaymentProvider implements PaymentProvider {
  readonly gateway = PaymentGateway.MANUAL;

  isAvailable(): boolean {
    return true;
  }

  createCharge(input: CreateChargeInput): Promise<ChargeResult> {
    return Promise.resolve({
      externalId: `manual_${input.paymentId}`,
      status: PaymentStatus.PENDING,
    });
  }

  getCharge(externalId: string): Promise<ChargeResult> {
    // Manual charges have no remote state; the stored status is the source of truth.
    return Promise.resolve({ externalId, status: PaymentStatus.PENDING });
  }

  cancelCharge(externalId: string): Promise<ChargeResult> {
    return Promise.resolve({ externalId, status: PaymentStatus.CANCELLED });
  }
}
