import { Module } from '@nestjs/common';
import { AuditModule } from '@core/audit/audit.module';
import { AuthModule } from '@core/auth/auth.module';
import { CustomersModule } from '@core/customers/customers.module';
import { DashboardModule } from '@core/dashboard/dashboard.module';
import { NotificationsModule } from '@core/notifications/notifications.module';
import { PaymentsModule } from '@core/payments/payments.module';
import { ProductsModule } from '@core/products/products.module';
import { SalesModule } from '@core/sales/sales.module';
import { ServicesModule } from '@core/services/services.module';
import { SubscriptionsModule } from '@core/subscriptions/subscriptions.module';
import { TenantsModule } from '@core/tenants/tenants.module';
import { UsersModule } from '@core/users/users.module';

/** Segment-agnostic platform capabilities shared by every tenant. */
@Module({
  imports: [
    AuditModule,
    AuthModule,
    TenantsModule,
    UsersModule,
    CustomersModule,
    ServicesModule,
    ProductsModule,
    SalesModule,
    PaymentsModule,
    SubscriptionsModule,
    NotificationsModule,
    DashboardModule,
  ],
})
export class CoreModule {}
