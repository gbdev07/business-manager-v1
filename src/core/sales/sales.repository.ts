import { Injectable } from '@nestjs/common';
import { Prisma, Sale, SaleItem } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { TenantScopedRepository } from '@common/tenancy/tenant-scoped.repository';
import { TenantContext } from '@common/tenancy/tenant-context.service';
import { QuerySalesDto } from '@core/sales/dto/sale.dto';

export type SaleWithItems = Sale & { items: SaleItem[] };

const withItems = { items: true } as const;

@Injectable()
export class SalesRepository extends TenantScopedRepository {
  constructor(prisma: PrismaService, tenantContext: TenantContext) {
    super(prisma, tenantContext);
  }

  findMany(query: QuerySalesDto): Promise<[SaleWithItems[], number]> {
    const where: Prisma.SaleWhereInput = {
      tenantId: this.tenantId,
      customerId: query.customerId,
      status: query.status,
      ...(query.from || query.to
        ? {
            completedAt: {
              gte: query.from ? new Date(query.from) : undefined,
              lte: query.to ? new Date(query.to) : undefined,
            },
          }
        : {}),
    };

    return this.prisma.$transaction([
      this.prisma.sale.findMany({
        where,
        include: withItems,
        orderBy: { completedAt: 'desc' },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.sale.count({ where }),
    ]);
  }

  findById(id: string): Promise<SaleWithItems | null> {
    return this.prisma.sale.findFirst({
      where: { id, tenantId: this.tenantId },
      include: withItems,
    });
  }

  create(data: {
    customerId?: string;
    userId?: string;
    subtotal: Prisma.Decimal;
    discount: Prisma.Decimal;
    total: Prisma.Decimal;
    notes?: string;
    items: Prisma.SaleItemCreateWithoutSaleInput[];
  }): Promise<SaleWithItems> {
    return this.prisma.sale.create({
      data: {
        tenantId: this.tenantId,
        customerId: data.customerId,
        userId: data.userId,
        subtotal: data.subtotal,
        discount: data.discount,
        total: data.total,
        notes: data.notes,
        items: { create: data.items },
      },
      include: withItems,
    });
  }

  update(id: string, data: Prisma.SaleUpdateInput): Promise<SaleWithItems> {
    return this.prisma.sale.update({
      where: { id, tenantId: this.tenantId },
      data,
      include: withItems,
    });
  }
}
