import { Module } from '@nestjs/common';
import { CustomersController } from '@core/customers/customers.controller';
import { CustomersRepository } from '@core/customers/customers.repository';
import { CustomersService } from '@core/customers/customers.service';

@Module({
  controllers: [CustomersController],
  providers: [CustomersService, CustomersRepository],
  exports: [CustomersService],
})
export class CustomersModule {}
