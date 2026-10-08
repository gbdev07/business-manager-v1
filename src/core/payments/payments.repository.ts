import { Injectable } from '@nestjs/common';
import { Payment, Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { TenantScopedRepository } from '@common/tenancy/tenant-scoped.repository';
import { TenantContext } from '@common/tenancy/tenant-context.service';
import { QueryPaymentsDto } from '@core/payments/dto/payment.dto';

@Injectable()
export class PaymentsRepository extends TenantScopedRepository {
  constructor(prisma: PrismaService, tenantContext: TenantContext) {
    super(prisma, tenantContext);
  }

  findMany(query: QueryPaymentsDto): Promise<[Payment[], number]> {
    const where: Prisma.PaymentWhereInput = {
      tenantId: this.tenantId,
      status: query.status,
      gateway: query.gateway,
      customerId: query.customerId,
      referenceType: query.referenceType,
      referenceId: query.referenceId,
      ...(query.from || query.to
        ? {
            createdAt: {
              gte: query.from ? new Date(query.from) : undefined,
              lte: query.to ? new Date(query.to) : undefined,
            },
          }
        : {}),
    };

    return this.prisma.$transaction([
      this.prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.payment.count({ where }),
    ]);
  }

  findById(id: string): Promise<Payment | null> {
    return this.prisma.payment.findFirst({ where: { id, tenantId: this.tenantId } });
  }

  create(data: Omit<Prisma.PaymentUncheckedCreateInput, 'tenantId'>): Promise<Payment> {
    return this.prisma.payment.create({ data: { ...data, tenantId: this.tenantId } });
  }

  update(id: string, data: Prisma.PaymentUncheckedUpdateInput): Promise<Payment> {
    return this.prisma.payment.update({ where: { id, tenantId: this.tenantId }, data });
  }

  async saleExists(id: string): Promise<boolean> {
    return (await this.prisma.sale.count({ where: { id, tenantId: this.tenantId } })) > 0;
  }

  async subscriptionExists(id: string): Promise<boolean> {
    return (await this.prisma.subscription.count({ where: { id, tenantId: this.tenantId } })) > 0;
  }
}
