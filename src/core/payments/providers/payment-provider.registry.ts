import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentGateway } from '@prisma/client';
import {
  PAYMENT_PROVIDERS,
  PaymentProvider,
} from '@core/payments/providers/payment-provider.interface';

@Injectable()
export class PaymentProviderRegistry {
  private readonly providers: Map<PaymentGateway, PaymentProvider>;
  private readonly defaultGateway: PaymentGateway;

  constructor(
    @Inject(PAYMENT_PROVIDERS) providers: PaymentProvider[],
    configService: ConfigService,
  ) {
    this.providers = new Map(providers.map((provider) => [provider.gateway, provider]));
    this.defaultGateway =
      (configService.get<string>('payments.defaultProvider') as PaymentGateway | undefined) ??
      PaymentGateway.MANUAL;
  }

  get(gateway: PaymentGateway = this.defaultGateway): PaymentProvider {
    const provider = this.providers.get(gateway);

    if (!provider) {
      throw new BadRequestException(`Payment gateway ${gateway} is not registered`);
    }

    return provider;
  }

  getDefaultGateway(): PaymentGateway {
    return this.defaultGateway;
  }

  list(): { gateway: PaymentGateway; available: boolean }[] {
    return [...this.providers.values()].map((provider) => ({
      gateway: provider.gateway,
      available: provider.isAvailable(),
    }));
  }
}
