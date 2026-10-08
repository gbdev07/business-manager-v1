import { Injectable } from '@nestjs/common';
import { Prisma, Product } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { TenantScopedRepository } from '@common/tenancy/tenant-scoped.repository';
import { TenantContext } from '@common/tenancy/tenant-context.service';
import { QueryProductsDto } from '@core/products/dto/product.dto';

@Injectable()
export class ProductsRepository extends TenantScopedRepository {
  constructor(prisma: PrismaService, tenantContext: TenantContext) {
    super(prisma, tenantContext);
  }

  findMany(query: QueryProductsDto): Promise<[Product[], number]> {
    const where: Prisma.ProductWhereInput = {
      tenantId: this.tenantId,
      isActive: query.isActive,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { sku: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    return this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.product.count({ where }),
    ]);
  }

  findById(id: string): Promise<Product | null> {
    return this.prisma.product.findFirst({ where: { id, tenantId: this.tenantId } });
  }

  findManyByIds(ids: string[]): Promise<Product[]> {
    return this.prisma.product.findMany({ where: { id: { in: ids }, tenantId: this.tenantId } });
  }

  create(data: Omit<Prisma.ProductUncheckedCreateInput, 'tenantId'>): Promise<Product> {
    return this.prisma.product.create({ data: { ...data, tenantId: this.tenantId } });
  }

  update(id: string, data: Prisma.ProductUpdateInput): Promise<Product> {
    return this.prisma.product.update({ where: { id, tenantId: this.tenantId }, data });
  }
}
