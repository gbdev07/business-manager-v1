import { Module } from '@nestjs/common';
import { CustomersModule } from '@core/customers/customers.module';
import { PaymentsController } from '@core/payments/payments.controller';
import { PaymentsRepository } from '@core/payments/payments.repository';
import { PaymentsService } from '@core/payments/payments.service';
import {
  AsaasPaymentProvider,
  MercadoPagoPaymentProvider,
  StripePaymentProvider,
} from '@core/payments/providers/gateway.providers';
import { ManualPaymentProvider } from '@core/payments/providers/manual.provider';
import {
  PAYMENT_PROVIDERS,
  PaymentProvider,
} from '@core/payments/providers/payment-provider.interface';
import { PaymentProviderRegistry } from '@core/payments/providers/payment-provider.registry';

const gatewayProviders = [
  ManualPaymentProvider,
  AsaasPaymentProvider,
  MercadoPagoPaymentProvider,
  StripePaymentProvider,
];

@Module({
  imports: [CustomersModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    PaymentsRepository,
    PaymentProviderRegistry,
    ...gatewayProviders,
    {
      provide: PAYMENT_PROVIDERS,
      useFactory: (...providers: PaymentProvider[]) => providers,
      inject: gatewayProviders,
    },
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
