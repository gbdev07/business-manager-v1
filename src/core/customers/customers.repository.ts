import { Injectable } from '@nestjs/common';
import { Customer, Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { TenantScopedRepository } from '@common/tenancy/tenant-scoped.repository';
import { TenantContext } from '@common/tenancy/tenant-context.service';
import { QueryCustomersDto } from '@core/customers/dto/customer.dto';

const HISTORY_LIMIT = 20;

@Injectable()
export class CustomersRepository extends TenantScopedRepository {
  constructor(prisma: PrismaService, tenantContext: TenantContext) {
    super(prisma, tenantContext);
  }

  findMany(query: QueryCustomersDto): Promise<[Customer[], number]> {
    const where: Prisma.CustomerWhereInput = {
      tenantId: this.tenantId,
      isActive: query.isActive,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
              { phone: { contains: query.search } },
            ],
          }
        : {}),
    };

    return this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.customer.count({ where }),
    ]);
  }

  findById(id: string): Promise<Customer | null> {
    return this.prisma.customer.findFirst({ where: { id, tenantId: this.tenantId } });
  }

  create(data: Omit<Prisma.CustomerUncheckedCreateInput, 'tenantId'>): Promise<Customer> {
    return this.prisma.customer.create({ data: { ...data, tenantId: this.tenantId } });
  }

  update(id: string, data: Prisma.CustomerUpdateInput): Promise<Customer> {
    return this.prisma.customer.update({ where: { id, tenantId: this.tenantId }, data });
  }

  findHistory(customerId: string) {
    const scope = { tenantId: this.tenantId, customerId };

    return Promise.all([
      this.prisma.sale.findMany({
        where: scope,
        orderBy: { completedAt: 'desc' },
        take: HISTORY_LIMIT,
        select: { id: true, status: true, total: true, notes: true, completedAt: true },
      }),
      this.prisma.payment.findMany({
        where: scope,
        orderBy: { createdAt: 'desc' },
        take: HISTORY_LIMIT,
        select: { id: true, status: true, amount: true, description: true, createdAt: true },
      }),
      this.prisma.subscription.findMany({
        where: scope,
        orderBy: { startDate: 'desc' },
        take: HISTORY_LIMIT,
        select: {
          id: true,
          status: true,
          price: true,
          startDate: true,
          plan: { select: { name: true } },
        },
      }),
    ]);
  }
}
