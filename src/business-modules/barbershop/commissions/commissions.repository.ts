import { Injectable } from '@nestjs/common';
import { CommissionRule, CommissionStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { TenantScopedRepository } from '@common/tenancy/tenant-scoped.repository';
import { TenantContext } from '@common/tenancy/tenant-context.service';
import {
  QueryCommissionRulesDto,
  QueryCommissionsDto,
} from '@modules/barbershop/commissions/dto/commission.dto';

const withBarber = { barber: { select: { name: true } } } as const;

export type CommissionWithBarber = Prisma.CommissionGetPayload<{ include: typeof withBarber }>;

@Injectable()
export class CommissionsRepository extends TenantScopedRepository {
  constructor(prisma: PrismaService, tenantContext: TenantContext) {
    super(prisma, tenantContext);
  }

  // ── Rules ────────────────────────────────────────────────────────────────

  findRules(query: QueryCommissionRulesDto): Promise<[CommissionRule[], number]> {
    const where: Prisma.CommissionRuleWhereInput = {
      tenantId: this.tenantId,
      barberId: query.barberId,
      isActive: query.isActive,
    };

    return this.prisma.$transaction([
      this.prisma.commissionRule.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.commissionRule.count({ where }),
    ]);
  }

  findActiveRulesForBarber(barberId: string): Promise<CommissionRule[]> {
    return this.prisma.commissionRule.findMany({
      where: { tenantId: this.tenantId, isActive: true, OR: [{ barberId }, { barberId: null }] },
    });
  }

  createRule(
    data: Omit<Prisma.CommissionRuleUncheckedCreateInput, 'tenantId'>,
  ): Promise<CommissionRule> {
    return this.prisma.commissionRule.create({ data: { ...data, tenantId: this.tenantId } });
  }

  updateRule(id: string, data: Prisma.CommissionRuleUpdateInput): Promise<CommissionRule> {
    return this.prisma.commissionRule.update({ where: { id, tenantId: this.tenantId }, data });
  }

  findRuleById(id: string): Promise<CommissionRule | null> {
    return this.prisma.commissionRule.findFirst({ where: { id, tenantId: this.tenantId } });
  }

  // ── Commissions ──────────────────────────────────────────────────────────

  async findMany(query: QueryCommissionsDto): Promise<{
    items: CommissionWithBarber[];
    total: number;
    totals: { status: CommissionStatus; amount: Prisma.Decimal | null }[];
  }> {
    const where: Prisma.CommissionWhereInput = {
      tenantId: this.tenantId,
      barberId: query.barberId,
      status: query.status,
      createdAt: {
        gte: query.from ? new Date(query.from) : undefined,
        lte: query.to ? new Date(query.to) : undefined,
      },
    };

    const [items, total, grouped] = await Promise.all([
      this.prisma.commission.findMany({
        where,
        include: withBarber,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.commission.count({ where }),
      this.prisma.commission.groupBy({ by: ['status'], where, _sum: { amount: true } }),
    ]);

    return {
      items,
      total,
      totals: grouped.map((row) => ({ status: row.status, amount: row._sum.amount })),
    };
  }

  findById(id: string): Promise<CommissionWithBarber | null> {
    return this.prisma.commission.findFirst({
      where: { id, tenantId: this.tenantId },
      include: withBarber,
    });
  }

  existsForAppointment(appointmentId: string): Promise<boolean> {
    return this.prisma.commission
      .count({ where: { tenantId: this.tenantId, appointmentId } })
      .then((count) => count > 0);
  }

  existsForSale(saleId: string): Promise<boolean> {
    return this.prisma.commission
      .count({ where: { tenantId: this.tenantId, saleId } })
      .then((count) => count > 0);
  }

  createMany(
    data: Omit<Prisma.CommissionUncheckedCreateInput, 'tenantId'>[],
  ): Promise<Prisma.BatchPayload> {
    return this.prisma.commission.createMany({
      data: data.map((item) => ({ ...item, tenantId: this.tenantId })),
      skipDuplicates: true,
    });
  }

  update(id: string, data: Prisma.CommissionUpdateInput): Promise<CommissionWithBarber> {
    return this.prisma.commission.update({
      where: { id, tenantId: this.tenantId },
      data,
      include: withBarber,
    });
  }

  findAppointmentForCommission(id: string) {
    return this.prisma.appointment.findFirst({
      where: { id, tenantId: this.tenantId },
      select: { id: true, barberId: true, serviceId: true, price: true },
    });
  }

  findSaleForCommission(id: string) {
    return this.prisma.sale.findFirst({
      where: { id, tenantId: this.tenantId },
      select: {
        id: true,
        userId: true,
        items: {
          select: {
            serviceId: true,
            productId: true,
            quantity: true,
            total: true,
          },
        },
      },
    });
  }

  findBarberIdByUser(userId: string): Promise<string | null> {
    return this.prisma.barber
      .findFirst({
        where: { tenantId: this.tenantId, userId, isActive: true },
        select: { id: true },
      })
      .then((barber) => barber?.id ?? null);
  }
}
