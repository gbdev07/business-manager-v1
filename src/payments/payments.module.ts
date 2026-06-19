import { Module } from '@nestjs/common';
import { PaymentsController } from '@payments/payments.controller';
import { PaymentsService } from '@payments/payments.service';
import { PaymentProviderFactory } from '@payments/providers/payment-provider.factory';
import {
  AsaasPaymentProvider,
  ManualPaymentProvider,
  MercadoPagoPaymentProvider,
} from '@payments/providers/payment.providers';

@Module({
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    PaymentProviderFactory,
    ManualPaymentProvider,
    AsaasPaymentProvider,
    MercadoPagoPaymentProvider,
  ],
  exports: [PaymentsService, PaymentProviderFactory],
})
export class PaymentsModule {}
