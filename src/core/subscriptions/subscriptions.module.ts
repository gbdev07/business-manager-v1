import { Module } from '@nestjs/common';
import { CustomersModule } from '@core/customers/customers.module';
import { SubscriptionsController } from '@core/subscriptions/subscriptions.controller';
import { SubscriptionsRepository } from '@core/subscriptions/subscriptions.repository';
import { SubscriptionsService } from '@core/subscriptions/subscriptions.service';

@Module({
  imports: [CustomersModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, SubscriptionsRepository],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
