import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentProviderName, PaymentStatus, Prisma } from '@prisma/client';
import { AuthenticatedUser } from '@auth/interfaces/authenticated-user.interface';
import { PrismaService } from '@prisma/prisma.service';
import { CANCELLABLE_PAYMENT_STATUSES } from '@payments/constants/payment.constants';
import { CancelChargeDto, CreateChargeDto } from '@payments/dto/create-charge.dto';
import {
  ChargeResponseDto,
  PaginatedChargesResponseDto,
  PaymentProvidersResponseDto,
} from '@payments/dto/charge-response.dto';
import { QueryChargesDto } from '@payments/dto/query-charges.dto';
import { mapPaymentToChargeResponse } from '@payments/mappers/payment.mapper';
import { PaymentProviderFactory } from '@payments/providers/payment-provider.factory';
import { ProviderChargeResult } from '@payments/providers/payment-provider.interface';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly providerFactory: PaymentProviderFactory,
    private readonly configService: ConfigService,
  ) {}

  listProviders(): PaymentProvidersResponseDto {
    return {
      available: this.providerFactory.listProviders(),
      defaultProvider: this.resolveDefaultProvider(),
      note: 'ASAAS and MERCADO_PAGO providers are registered as stubs — implement gateway clients when ready.',
    };
  }

  async createCharge(
    dto: CreateChargeDto,
    currentUser: AuthenticatedUser,
  ): Promise<ChargeResponseDto> {
    this.assertBarbershopWriteAccess(currentUser, dto.barbershopId);
    await this.assertBarbershopExists(dto.barbershopId);
    await this.assertRelatedEntities(dto);

    const providerName = dto.provider ?? this.resolveDefaultProvider();
    const provider = this.providerFactory.getProvider(providerName);

    const payment = await this.prisma.payment.create({
      data: {
        barbershopId: dto.barbershopId,
        customerId: dto.customerId,
        appointmentId: dto.appointmentId,
        subscriptionId: dto.subscriptionId,
        type: dto.type,
        amount: dto.amount,
        currency: dto.currency ?? 'BRL',
        status: PaymentStatus.PENDING,
        provider: providerName,
        method: dto.method,
        description: dto.description,
      },
    });

    try {
      const providerResult = await provider.createCharge({
        barbershopId: dto.barbershopId,
        customerId: dto.customerId,
        amount: dto.amount,
        currency: dto.currency ?? 'BRL',
        description: dto.description,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        metadata: {
          paymentId: payment.id,
          appointmentId: dto.appointmentId,
          subscriptionId: dto.subscriptionId,
        },
      });

      const updated = await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          externalId: providerResult.externalId,
          status: providerResult.status,
          paidAt: providerResult.paidAt,
          metadata: (providerResult.providerPayload ?? {}) as Prisma.InputJsonValue,
        },
      });

      return mapPaymentToChargeResponse(updated, {
        checkoutUrl: providerResult.checkoutUrl,
        barcode: providerResult.barcode,
        pixCopyPaste: providerResult.pixCopyPaste,
      });
    } catch (error) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          metadata: {
            error: error instanceof Error ? error.message : 'Provider charge creation failed',
          },
        },
      });
      throw error;
    }
  }

  async getCharge(id: string, currentUser: AuthenticatedUser): Promise<ChargeResponseDto> {
    const payment = await this.findPaymentOrThrow(id);
    this.assertBarbershopReadAccess(currentUser, payment.barbershopId);

    if (!payment.externalId) {
      return mapPaymentToChargeResponse(payment);
    }

    const provider = this.providerFactory.getProvider(payment.provider);

    try {
      const providerResult = await provider.getCharge(payment.externalId);

      const synced = await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: providerResult.status,
          paidAt: providerResult.paidAt ?? payment.paidAt,
          metadata: (providerResult.providerPayload ?? payment.metadata) as Prisma.InputJsonValue,
        },
      });

      return mapPaymentToChargeResponse(synced, {
        checkoutUrl: providerResult.checkoutUrl,
        barcode: providerResult.barcode,
        pixCopyPaste: providerResult.pixCopyPaste,
      });
    } catch {
      return mapPaymentToChargeResponse(payment);
    }
  }

  async cancelCharge(
    id: string,
    dto: CancelChargeDto,
    currentUser: AuthenticatedUser,
  ): Promise<ChargeResponseDto> {
    const payment = await this.findPaymentOrThrow(id);
    this.assertBarbershopWriteAccess(currentUser, payment.barbershopId);

    if (!CANCELLABLE_PAYMENT_STATUSES.includes(payment.status)) {
      throw new BadRequestException(`Cannot cancel payment with status ${payment.status}`);
    }

    let providerResult: ProviderChargeResult = {
      externalId: payment.externalId ?? payment.id,
      status: PaymentStatus.CANCELLED,
      providerPayload: { cancelledLocally: true, reason: dto.reason },
    };

    if (payment.externalId) {
      const provider = this.providerFactory.getProvider(payment.provider);
      providerResult = await provider.cancelCharge(payment.externalId);
    }

    const updated = await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: providerResult.status,
        description: dto.reason
          ? [payment.description, `Cancelled: ${dto.reason}`].filter(Boolean).join(' | ')
          : payment.description,
        metadata: (providerResult.providerPayload ?? {}) as Prisma.InputJsonValue,
      },
    });

    return mapPaymentToChargeResponse(updated);
  }

  async findAllCharges(
    query: QueryChargesDto,
    currentUser: AuthenticatedUser,
  ): Promise<PaginatedChargesResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.PaymentWhereInput = {
      barbershopId: this.resolveBarbershopFilter(query.barbershopId, currentUser),
    };

    if (query.customerId) {
      where.customerId = query.customerId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.provider) {
      where.provider = query.provider;
    }

    if (query.type) {
      where.type = query.type;
    }

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      data: payments.map((payment) => mapPaymentToChargeResponse(payment)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  private resolveDefaultProvider(): PaymentProviderName {
    const configured = this.configService.get<string>('payments.defaultProvider') ?? 'MANUAL';

    if (
      configured === PaymentProviderName.ASAAS ||
      configured === PaymentProviderName.MERCADO_PAGO ||
      configured === PaymentProviderName.MANUAL
    ) {
      return configured;
    }

    return PaymentProviderName.MANUAL;
  }

  private async assertRelatedEntities(dto: CreateChargeDto): Promise<void> {
    if (dto.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: {
          id: dto.customerId,
          barbershopId: dto.barbershopId,
          deletedAt: null,
        },
      });
      if (!customer) {
        throw new NotFoundException('Customer not found in this barbershop');
      }
    }

    if (dto.appointmentId) {
      const appointment = await this.prisma.appointment.findFirst({
        where: {
          id: dto.appointmentId,
          barbershopId: dto.barbershopId,
          deletedAt: null,
        },
      });
      if (!appointment) {
        throw new NotFoundException('Appointment not found in this barbershop');
      }
    }

    if (dto.subscriptionId) {
      const subscription = await this.prisma.subscription.findFirst({
        where: {
          id: dto.subscriptionId,
          barbershopId: dto.barbershopId,
          deletedAt: null,
        },
      });
      if (!subscription) {
        throw new NotFoundException('Subscription not found in this barbershop');
      }
    }
  }

  private resolveBarbershopFilter(
    barbershopId: string | undefined,
    currentUser: AuthenticatedUser,
  ): string | Prisma.StringFilter {
    if (currentUser.isSuperAdmin) {
      if (barbershopId) {
        return barbershopId;
      }
      throw new BadRequestException('barbershopId is required');
    }

    const allowedBarbershopIds = currentUser.memberships.map(
      (membership) => membership.barbershopId,
    );

    if (allowedBarbershopIds.length === 0) {
      throw new ForbiddenException('You do not belong to any barbershop');
    }

    if (barbershopId) {
      if (!allowedBarbershopIds.includes(barbershopId)) {
        throw new ForbiddenException('You do not have access to this barbershop');
      }
      return barbershopId;
    }

    if (allowedBarbershopIds.length === 1) {
      return allowedBarbershopIds[0];
    }

    return { in: allowedBarbershopIds };
  }

  private async assertBarbershopExists(barbershopId: string): Promise<void> {
    const barbershop = await this.prisma.barbershop.findFirst({
      where: { id: barbershopId, deletedAt: null, isActive: true },
    });

    if (!barbershop) {
      throw new NotFoundException('Barbershop not found');
    }
  }

  private assertBarbershopReadAccess(currentUser: AuthenticatedUser, barbershopId: string): void {
    if (currentUser.isSuperAdmin) {
      return;
    }

    const hasAccess = currentUser.memberships.some(
      (membership) => membership.barbershopId === barbershopId,
    );

    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this barbershop');
    }
  }

  private assertBarbershopWriteAccess(currentUser: AuthenticatedUser, barbershopId: string): void {
    if (currentUser.isSuperAdmin) {
      return;
    }

    const membership = currentUser.memberships.find((item) => item.barbershopId === barbershopId);

    if (!membership || !['owner', 'manager', 'receptionist'].includes(membership.roleSlug)) {
      throw new ForbiddenException(
        'You do not have permission to manage payments in this barbershop',
      );
    }
  }

  private async findPaymentOrThrow(id: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }
}
