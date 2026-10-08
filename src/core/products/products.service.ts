import { Injectable, NotFoundException } from '@nestjs/common';
import { Product } from '@prisma/client';
import { paginate, Paginated } from '@common/dto/pagination.dto';
import { toMoneyString } from '@common/utils/money.util';
import {
  CreateProductDto,
  ProductResponseDto,
  QueryProductsDto,
  UpdateProductDto,
} from '@core/products/dto/product.dto';
import { ProductsRepository } from '@core/products/products.repository';

@Injectable()
export class ProductsService {
  constructor(private readonly productsRepository: ProductsRepository) {}

  async list(query: QueryProductsDto): Promise<Paginated<ProductResponseDto>> {
    const [products, total] = await this.productsRepository.findMany(query);
    return paginate(products.map(toProductResponse), total, query);
  }

  async findById(id: string): Promise<ProductResponseDto> {
    const product = await this.productsRepository.findById(id);

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return toProductResponse(product);
  }

  async create(dto: CreateProductDto): Promise<ProductResponseDto> {
    return toProductResponse(await this.productsRepository.create(dto));
  }

  async update(id: string, dto: UpdateProductDto): Promise<ProductResponseDto> {
    return toProductResponse(await this.productsRepository.update(id, dto));
  }

  async findActiveByIds(ids: string[]): Promise<Map<string, Product>> {
    const products = await this.productsRepository.findManyByIds(ids);
    return new Map(products.filter((p) => p.isActive).map((p) => [p.id, p]));
  }
}

function toProductResponse(product: Product): ProductResponseDto {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    sku: product.sku,
    price: toMoneyString(product.price),
    isActive: product.isActive,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}
