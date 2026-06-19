import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from '@config/configuration';
import { validate } from '@config/env.validation';
import { CommonModule } from '@common/common.module';
import { PrismaModule } from '@prisma/prisma.module';
import { AuthModule } from '@auth/auth.module';
import { UsersModule } from '@users/users.module';
import { BarbershopsModule } from '@barbershops/barbershops.module';
import { BarbersModule } from '@barbers/barbers.module';
import { CustomersModule } from '@customers/customers.module';
import { AppointmentsModule } from '@appointments/appointments.module';
import { SubscriptionsModule } from '@subscriptions/subscriptions.module';
import { HealthModule } from '@/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate,
      envFilePath: ['.env'],
    }),
    CommonModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    BarbershopsModule,
    BarbersModule,
    CustomersModule,
    AppointmentsModule,
    SubscriptionsModule,
    HealthModule,
  ],
})
export class AppModule {}
