import { Module } from '@nestjs/common';
import { SubscriptionsController } from '@subscriptions/subscriptions.controller';
import { SubscriptionsService } from '@subscriptions/subscriptions.service';

@Module({
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
