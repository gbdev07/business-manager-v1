import { Module } from '@nestjs/common';
import { CustomersModule } from '@core/customers/customers.module';
import { ProductsModule } from '@core/products/products.module';
import { SalesController } from '@core/sales/sales.controller';
import { SalesRepository } from '@core/sales/sales.repository';
import { SalesService } from '@core/sales/sales.service';
import { ServicesModule } from '@core/services/services.module';

@Module({
  imports: [CustomersModule, ProductsModule, ServicesModule],
  controllers: [SalesController],
  providers: [SalesService, SalesRepository],
  exports: [SalesService],
})
export class SalesModule {}
