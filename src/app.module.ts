import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BusinessModulesModule } from '@modules/business-modules.module';
import { CommonModule } from '@common/common.module';
import configuration from '@config/configuration';
import { validate } from '@config/env.validation';
import { CoreModule } from '@core/core.module';
import { HealthModule } from '@/health/health.module';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [configuration],
      validate,
    }),
    EventEmitterModule.forRoot(),
    PrismaModule,
    CommonModule,
    CoreModule,
    BusinessModulesModule,
    HealthModule,
  ],
})
export class AppModule {}
