import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  CommissionRule,
  CommissionSource,
  CommissionStatus,
  CommissionType,
  Prisma,
} from '@prisma/client';
import { paginate } from '@common/dto/pagination.dto';
import { toMoneyString } from '@common/utils/money.util';
import { ProductsService } from '@core/products/products.service';
import { ServicesService } from '@core/services/services.service';
import { BarbersService } from '@modules/barbershop/barbers/barbers.service';
import {
  calculateCommission,
  CommissionTarget,
  pickCommissionRule,
} from '@modules/barbershop/commissions/commission-calculator';
import {
  CommissionsRepository,
  CommissionWithBarber,
} from '@modules/barbershop/commissions/commissions.repository';
import {
  CommissionResponseDto,
  CommissionRuleResponseDto,
  CreateCommissionRuleDto,
  PaginatedCommissionRulesDto,
  PaginatedCommissionsDto,
  QueryCommissionRulesDto,
  QueryCommissionsDto,
  UpdateCommissionRuleDto,
} from '@modules/barbershop/commissions/dto/commission.dto';

@Injectable()
export class CommissionsService {
  constructor(
    private readonly repository: CommissionsRepository,
    private readonly barbersService: BarbersService,
    private readonly servicesService: ServicesService,
    private readonly productsService: ProductsService,
  ) {}

  // ── Rules ────────────────────────────────────────────────────────────────

  async listRules(query: QueryCommissionRulesDto): Promise<PaginatedCommissionRulesDto> {
    const [rules, total] = await this.repository.findRules(query);
    return paginate(rules.map(toRuleResponse), total, query);
  }

  async createRule(dto: CreateCommissionRuleDto): Promise<CommissionRuleResponseDto> {
    if (dto.serviceId && dto.productId) {
      throw new BadRequestException('A rule can target a service or a product, not both');
    }
    assertRuleValue(dto.type, dto.value);

    if (dto.barberId) await this.barbersService.getOrThrow(dto.barberId);
    if (dto.serviceId) await this.servicesService.findById(dto.serviceId);
    if (dto.productId) await this.productsService.findById(dto.productId);

    return toRuleResponse(await this.repository.createRule(dto));
  }

  async updateRule(id: string, dto: UpdateCommissionRuleDto): Promise<CommissionRuleResponseDto> {
    const rule = await this.repository.findRuleById(id);

    if (!rule) {
      throw new NotFoundException('Commission rule not found');
    }

    assertRuleValue(dto.type ?? rule.type, dto.value ?? rule.value.toNumber());
    return toRuleResponse(await this.repository.updateRule(id, dto));
  }

  // ── Commissions ──────────────────────────────────────────────────────────

  async list(query: QueryCommissionsDto): Promise<PaginatedCommissionsDto> {
    const { items, total, totals } = await this.repository.findMany(query);
    const sumOf = (status: CommissionStatus) =>
      toMoneyString(totals.find((row) => row.status === status)?.amount ?? 0);

    return {
      ...paginate(items.map(toCommissionResponse), total, query),
      totals: { pending: sumOf(CommissionStatus.PENDING), paid: sumOf(CommissionStatus.PAID) },
    };
  }

  async markPaid(id: string): Promise<CommissionResponseDto> {
    await this.getPendingOrThrow(id);
    return toCommissionResponse(
      await this.repository.update(id, { status: CommissionStatus.PAID, paidAt: new Date() }),
    );
  }

  async cancel(id: string): Promise<CommissionResponseDto> {
    await this.getPendingOrThrow(id);
    return toCommissionResponse(
      await this.repository.update(id, { status: CommissionStatus.CANCELLED }),
    );
  }

  /** Idempotent: an appointment generates at most one commission. Requires tenant context. */
  async generateForAppointment(appointmentId: string): Promise<void> {
    if (await this.repository.existsForAppointment(appointmentId)) return;

    const appointment = await this.repository.findAppointmentForCommission(appointmentId);
    if (!appointment?.price) return;

    const rules = await this.repository.findActiveRulesForBarber(appointment.barberId);
    const rule = pickCommissionRule(rules, appointment.barberId, {
      serviceId: appointment.serviceId,
    });
    if (!rule) return;

    await this.repository.createMany([
      {
        barberId: appointment.barberId,
        ruleId: rule.id,
        source: CommissionSource.SERVICE,
        appointmentId: appointment.id,
        baseAmount: appointment.price,
        amount: calculateCommission(rule, appointment.price),
      },
    ]);
  }

  /**
   * One commission per eligible sale item, credited to the barber linked to the seller user.
   * Idempotent per sale. Requires tenant context.
   */
  async generateForSale(saleId: string): Promise<void> {
    if (await this.repository.existsForSale(saleId)) return;

    const sale = await this.repository.findSaleForCommission(saleId);
    if (!sale?.userId) return;

    const barberId = await this.repository.findBarberIdByUser(sale.userId);
    if (!barberId) return;

    const rules = await this.repository.findActiveRulesForBarber(barberId);
    const commissions: Omit<Prisma.CommissionUncheckedCreateInput, 'tenantId'>[] = [];

    for (const item of sale.items) {
      const target: CommissionTarget | null = item.serviceId
        ? { serviceId: item.serviceId }
        : item.productId
          ? { productId: item.productId }
          : null;
      if (!target) continue;

      const rule = pickCommissionRule(rules, barberId, target);
      if (!rule) continue;

      commissions.push({
        barberId,
        ruleId: rule.id,
        source: CommissionSource.SALE,
        saleId: sale.id,
        baseAmount: item.total,
        amount: calculateCommission(rule, item.total, item.quantity),
      });
    }

    if (commissions.length > 0) {
      await this.repository.createMany(commissions);
    }
  }

  private async getPendingOrThrow(id: string): Promise<CommissionWithBarber> {
    const commission = await this.repository.findById(id);

    if (!commission) {
      throw new NotFoundException('Commission not found');
    }

    if (commission.status !== CommissionStatus.PENDING) {
      throw new BadRequestException(`Commission is already ${commission.status}`);
    }

    return commission;
  }
}

function assertRuleValue(type: CommissionType, value: number): void {
  if (type === CommissionType.PERCENTAGE && value > 100) {
    throw new BadRequestException('Percentage commission cannot exceed 100');
  }
}

function toRuleResponse(rule: CommissionRule): CommissionRuleResponseDto {
  return {
    id: rule.id,
    barberId: rule.barberId,
    serviceId: rule.serviceId,
    productId: rule.productId,
    type: rule.type,
    value: toMoneyString(rule.value),
    isActive: rule.isActive,
    createdAt: rule.createdAt,
  };
}

function toCommissionResponse(commission: CommissionWithBarber): CommissionResponseDto {
  return {
    id: commission.id,
    barberId: commission.barberId,
    barberName: commission.barber.name,
    ruleId: commission.ruleId,
    source: commission.source,
    appointmentId: commission.appointmentId,
    saleId: commission.saleId,
    baseAmount: toMoneyString(commission.baseAmount),
    amount: toMoneyString(commission.amount),
    status: commission.status,
    paidAt: commission.paidAt,
    createdAt: commission.createdAt,
  };
}
