import { Module, OnModuleInit } from '@nestjs/common';
import { CustomersModule } from '@core/customers/customers.module';
import { NotificationsModule } from '@core/notifications/notifications.module';
import { ProductsModule } from '@core/products/products.module';
import { ServicesModule } from '@core/services/services.module';
import { SubscriptionsModule } from '@core/subscriptions/subscriptions.module';
import { TenantsModule } from '@core/tenants/tenants.module';
import { SystemRolesService } from '@core/users/system-roles.service';
import { UsersModule } from '@core/users/users.module';
import { AppointmentsController } from '@modules/barbershop/appointments/appointments.controller';
import { AppointmentsRepository } from '@modules/barbershop/appointments/appointments.repository';
import { AppointmentsService } from '@modules/barbershop/appointments/appointments.service';
import { BARBERSHOP_ROLE_PERMISSIONS } from '@modules/barbershop/barbershop.permissions';
import { BarbersController } from '@modules/barbershop/barbers/barbers.controller';
import { BarbersRepository } from '@modules/barbershop/barbers/barbers.repository';
import { BarbersService } from '@modules/barbershop/barbers/barbers.service';
import { CommissionsController } from '@modules/barbershop/commissions/commissions.controller';
import { CommissionsListener } from '@modules/barbershop/commissions/commissions.listener';
import { CommissionsRepository } from '@modules/barbershop/commissions/commissions.repository';
import { CommissionsService } from '@modules/barbershop/commissions/commissions.service';
import { BarbershopDashboardProvider } from '@modules/barbershop/dashboard/barbershop-dashboard.provider';
import { BarbershopNotificationsListener } from '@modules/barbershop/notifications/barbershop-notifications.listener';
import { PlanBenefitsController } from '@modules/barbershop/plan-benefits/plan-benefits.controller';
import { PlanBenefitsRepository } from '@modules/barbershop/plan-benefits/plan-benefits.repository';
import { PlanBenefitsService } from '@modules/barbershop/plan-benefits/plan-benefits.service';
import { BarbershopSettingsController } from '@modules/barbershop/settings/settings.controller';
import { BarbershopTenantListener } from '@modules/barbershop/settings/settings.listener';
import { BarbershopSettingsRepository } from '@modules/barbershop/settings/settings.repository';
import { BarbershopSettingsService } from '@modules/barbershop/settings/settings.service';

/**
 * Barbershop vertical. Consumes core services and events; the core has no reference to it.
 * Every controller is gated by @BusinessModule(BusinessType.BARBERSHOP).
 */
@Module({
  imports: [
    TenantsModule,
    UsersModule,
    CustomersModule,
    ServicesModule,
    ProductsModule,
    SubscriptionsModule,
    NotificationsModule,
  ],
  controllers: [
    BarbershopSettingsController,
    BarbersController,
    AppointmentsController,
    PlanBenefitsController,
    CommissionsController,
  ],
  providers: [
    BarbershopSettingsService,
    BarbershopSettingsRepository,
    BarbershopTenantListener,
    BarbersService,
    BarbersRepository,
    AppointmentsService,
    AppointmentsRepository,
    PlanBenefitsService,
    PlanBenefitsRepository,
    CommissionsService,
    CommissionsRepository,
    CommissionsListener,
    BarbershopNotificationsListener,
    BarbershopDashboardProvider,
  ],
})
export class BarbershopModule implements OnModuleInit {
  constructor(private readonly systemRoles: SystemRolesService) {}

  onModuleInit(): void {
    this.systemRoles.contribute(BARBERSHOP_ROLE_PERMISSIONS);
  }
}
