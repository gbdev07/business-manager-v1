import { BadRequestException, Injectable } from '@nestjs/common';
import { PaymentProviderName } from '@prisma/client';
import { PaymentProvider } from '@payments/providers/payment-provider.interface';
import {
  AsaasPaymentProvider,
  ManualPaymentProvider,
  MercadoPagoPaymentProvider,
} from '@payments/providers/payment.providers';

@Injectable()
export class PaymentProviderFactory {
  private readonly providers: Map<PaymentProviderName, PaymentProvider>;

  constructor(
    manualProvider: ManualPaymentProvider,
    asaasProvider: AsaasPaymentProvider,
    mercadoPagoProvider: MercadoPagoPaymentProvider,
  ) {
    this.providers = new Map<PaymentProviderName, PaymentProvider>([
      [PaymentProviderName.MANUAL, manualProvider],
      [PaymentProviderName.ASAAS, asaasProvider],
      [PaymentProviderName.MERCADO_PAGO, mercadoPagoProvider],
    ]);
  }

  getProvider(name: PaymentProviderName): PaymentProvider {
    const provider = this.providers.get(name);

    if (!provider) {
      throw new BadRequestException(`Payment provider "${name}" is not registered`);
    }

    return provider;
  }

  listProviders(): PaymentProviderName[] {
    return [...this.providers.keys()];
  }
}
