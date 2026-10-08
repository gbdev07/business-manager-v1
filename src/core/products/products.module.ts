import { Module } from '@nestjs/common';
import { ProductsController } from '@core/products/products.controller';
import { ProductsRepository } from '@core/products/products.repository';
import { ProductsService } from '@core/products/products.service';

@Module({
  controllers: [ProductsController],
  providers: [ProductsService, ProductsRepository],
  exports: [ProductsService],
})
export class ProductsModule {}
