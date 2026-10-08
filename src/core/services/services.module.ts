import { Module } from '@nestjs/common';
import { ServicesController } from '@core/services/services.controller';
import { ServicesRepository } from '@core/services/services.repository';
import { ServicesService } from '@core/services/services.service';

@Module({
  controllers: [ServicesController],
  providers: [ServicesService, ServicesRepository],
  exports: [ServicesService],
})
export class ServicesModule {}
