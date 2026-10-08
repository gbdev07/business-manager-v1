import { Injectable, NotImplementedException } from '@nestjs/common';
import { PaymentGateway } from '@prisma/client';
import {
  ChargeResult,
  CreateChargeInput,
  PaymentProvider,
} from '@core/payments/providers/payment-provider.interface';

/**
 * Placeholder for external gateways. Each subclass will receive its own HTTP client
 * and credentials when the integration is implemented (see README roadmap, phase 3).
 */
abstract class NotIntegratedPaymentProvider implements PaymentProvider {
  abstract readonly gateway: PaymentGateway;

  isAvailable(): boolean {
    return false;
  }

  createCharge(_input: CreateChargeInput): Promise<ChargeResult> {
    return this.notIntegrated();
  }

  getCharge(_externalId: string): Promise<ChargeResult> {
    return this.notIntegrated();
  }

  cancelCharge(_externalId: string): Promise<ChargeResult> {
    return this.notIntegrated();
  }

  private notIntegrated(): Promise<never> {
    return Promise.reject(
      new NotImplementedException(`Payment gateway ${this.gateway} is not integrated yet`),
    );
  }
}

@Injectable()
export class AsaasPaymentProvider extends NotIntegratedPaymentProvider {
  readonly gateway = PaymentGateway.ASAAS;
}

@Injectable()
export class MercadoPagoPaymentProvider extends NotIntegratedPaymentProvider {
  readonly gateway = PaymentGateway.MERCADO_PAGO;
}

@Injectable()
export class StripePaymentProvider extends NotIntegratedPaymentProvider {
  readonly gateway = PaymentGateway.STRIPE;
}
