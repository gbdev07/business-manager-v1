import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Payment, PaymentGateway, PaymentStatus } from '@prisma/client';
import { paginate, Paginated } from '@common/dto/pagination.dto';
import { toMoneyString } from '@common/utils/money.util';
import { AuditAction } from '@core/audit/audit.constants';
import { AuditService } from '@core/audit/audit.service';
import { CustomersService } from '@core/customers/customers.service';
import { CoreEvent, PaymentApprovedEvent } from '@core/events/core.events';
import {
  ConfirmPaymentDto,
  CreatePaymentDto,
  PaymentGatewayStatusDto,
  PaymentResponseDto,
  QueryPaymentsDto,
} from '@core/payments/dto/payment.dto';
import { PaymentsRepository } from '@core/payments/payments.repository';
import { ChargeResult } from '@core/payments/providers/payment-provider.interface';
import { PaymentProviderRegistry } from '@core/payments/providers/payment-provider.registry';

const CANCELLABLE_STATUSES: PaymentStatus[] = [PaymentStatus.PENDING, PaymentStatus.FAILED];

@Injectable()
export class PaymentsService {
  constructor(
    private readonly paymentsRepository: PaymentsRepository,
    private readonly providers: PaymentProviderRegistry,
    private readonly customersService: CustomersService,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  listGateways(): PaymentGatewayStatusDto[] {
    const defaultGateway = this.providers.getDefaultGateway();
    return this.providers
      .list()
      .map((item) => ({ ...item, isDefault: item.gateway === defaultGateway }));
  }

  async list(query: QueryPaymentsDto): Promise<Paginated<PaymentResponseDto>> {
    const [payments, total] = await this.paymentsRepository.findMany(query);
    return paginate(payments.map(toPaymentResponse), total, query);
  }

  async findById(id: string): Promise<PaymentResponseDto> {
    return toPaymentResponse(await this.getOrThrow(id));
  }

  async create(dto: CreatePaymentDto): Promise<PaymentResponseDto> {
    const customer = dto.customerId
      ? await this.customersService.ensureActive(dto.customerId)
      : undefined;
    await this.assertReferences(dto);

    const provider = this.providers.get(dto.gateway);
    const payment = await this.paymentsRepository.create({
      amount: dto.amount,
      gateway: provider.gateway,
      method: dto.method,
      customerId: dto.customerId,
      saleId: dto.saleId,
      subscriptionId: dto.subscriptionId,
      referenceType: dto.referenceType,
      referenceId: dto.referenceId,
      description: dto.description,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
    });

    let charge: ChargeResult;
    try {
      charge = await provider.createCharge({
        paymentId: payment.id,
        tenantId: payment.tenantId,
        amount: toMoneyString(payment.amount),
        currency: payment.currency,
        method: payment.method,
        description: payment.description,
        dueDate: payment.dueDate,
        customer: customer && {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          document: customer.document,
        },
      });
    } catch (error) {
      await this.paymentsRepository.update(payment.id, {
        status: PaymentStatus.FAILED,
        metadata: { error: error instanceof Error ? error.message : 'Gateway error' },
      });
      throw error;
    }

    const updated = await this.applyChargeResult(payment, charge);

    await this.auditService.record({
      action: AuditAction.PAYMENT_CREATED,
      entity: 'payment',
      entityId: payment.id,
      metadata: { amount: toMoneyString(payment.amount), gateway: payment.gateway },
    });

    return toPaymentResponse(updated);
  }

  /** Confirms a manual payment (money received outside a gateway). */
  async confirm(id: string, dto: ConfirmPaymentDto): Promise<PaymentResponseDto> {
    const payment = await this.getOrThrow(id);

    if (payment.gateway !== PaymentGateway.MANUAL) {
      throw new BadRequestException('Only manual payments can be confirmed manually');
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException(`Cannot confirm a payment with status ${payment.status}`);
    }

    const updated = await this.applyChargeResult(
      { ...payment, method: dto.method ?? payment.method },
      {
        externalId: payment.externalId ?? `manual_${payment.id}`,
        status: PaymentStatus.PAID,
        paidAt: new Date(),
      },
    );

    await this.auditService.record({
      action: AuditAction.PAYMENT_CONFIRMED,
      entity: 'payment',
      entityId: id,
      metadata: { amount: toMoneyString(payment.amount) },
    });

    return toPaymentResponse(updated);
  }

  /** Refreshes the status from the gateway. */
  async sync(id: string): Promise<PaymentResponseDto> {
    const payment = await this.getOrThrow(id);

    if (!payment.externalId || payment.gateway === PaymentGateway.MANUAL) {
      return toPaymentResponse(payment);
    }

    const charge = await this.providers.get(payment.gateway).getCharge(payment.externalId);
    return toPaymentResponse(await this.applyChargeResult(payment, charge));
  }

  async cancel(id: string): Promise<PaymentResponseDto> {
    const payment = await this.getOrThrow(id);

    if (!CANCELLABLE_STATUSES.includes(payment.status)) {
      throw new BadRequestException(`Cannot cancel a payment with status ${payment.status}`);
    }

    if (payment.externalId) {
      await this.providers.get(payment.gateway).cancelCharge(payment.externalId);
    }

    const updated = await this.paymentsRepository.update(id, {
      status: PaymentStatus.CANCELLED,
      cancelledAt: new Date(),
    });

    await this.auditService.record({
      action: AuditAction.PAYMENT_CANCELLED,
      entity: 'payment',
      entityId: id,
    });

    return toPaymentResponse(updated);
  }

  private async applyChargeResult(payment: Payment, charge: ChargeResult): Promise<Payment> {
    const becamePaid =
      charge.status === PaymentStatus.PAID && payment.status !== PaymentStatus.PAID;
    const metadata = {
      ...((payment.metadata ?? {}) as Record<string, unknown>),
      ...(charge.checkoutUrl ? { checkoutUrl: charge.checkoutUrl } : {}),
      ...(charge.pixCopyPaste ? { pixCopyPaste: charge.pixCopyPaste } : {}),
    };

    const updated = await this.paymentsRepository.update(payment.id, {
      externalId: charge.externalId,
      status: charge.status,
      method: payment.method,
      paidAt: becamePaid ? (charge.paidAt ?? new Date()) : undefined,
      metadata,
    });

    if (becamePaid) {
      this.eventEmitter.emit(
        CoreEvent.PAYMENT_APPROVED,
        new PaymentApprovedEvent(
          updated.tenantId,
          updated.id,
          updated.customerId,
          toMoneyString(updated.amount),
          updated.currency,
          updated.paidAt!,
        ),
      );
    }

    return updated;
  }

  private async assertReferences(dto: CreatePaymentDto): Promise<void> {
    if (dto.saleId && !(await this.paymentsRepository.saleExists(dto.saleId))) {
      throw new NotFoundException('Sale not found');
    }

    if (
      dto.subscriptionId &&
      !(await this.paymentsRepository.subscriptionExists(dto.subscriptionId))
    ) {
      throw new NotFoundException('Subscription not found');
    }

    if (Boolean(dto.referenceType) !== Boolean(dto.referenceId)) {
      throw new BadRequestException('referenceType and referenceId must be provided together');
    }
  }

  private async getOrThrow(id: string): Promise<Payment> {
    const payment = await this.paymentsRepository.findById(id);

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }
}

function toPaymentResponse(payment: Payment): PaymentResponseDto {
  const metadata = (payment.metadata ?? {}) as { checkoutUrl?: string };

  return {
    id: payment.id,
    amount: toMoneyString(payment.amount),
    currency: payment.currency,
    status: payment.status,
    gateway: payment.gateway,
    method: payment.method,
    customerId: payment.customerId,
    saleId: payment.saleId,
    subscriptionId: payment.subscriptionId,
    referenceType: payment.referenceType,
    referenceId: payment.referenceId,
    externalId: payment.externalId,
    description: payment.description,
    checkoutUrl: metadata.checkoutUrl ?? null,
    dueDate: payment.dueDate,
    paidAt: payment.paidAt,
    cancelledAt: payment.cancelledAt,
    createdAt: payment.createdAt,
  };
}
