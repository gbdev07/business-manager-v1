import { Injectable, NotFoundException } from '@nestjs/common';
import { Customer } from '@prisma/client';
import { paginate, Paginated } from '@common/dto/pagination.dto';
import { toMoneyString } from '@common/utils/money.util';
import { CustomersRepository } from '@core/customers/customers.repository';
import {
  CreateCustomerDto,
  CustomerHistoryEntryDto,
  CustomerHistoryResponseDto,
  CustomerResponseDto,
  QueryCustomersDto,
  UpdateCustomerDto,
} from '@core/customers/dto/customer.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly customersRepository: CustomersRepository) {}

  async list(query: QueryCustomersDto): Promise<Paginated<CustomerResponseDto>> {
    const [customers, total] = await this.customersRepository.findMany(query);
    return paginate(customers.map(toCustomerResponse), total, query);
  }

  async findById(id: string): Promise<CustomerResponseDto> {
    return toCustomerResponse(await this.getOrThrow(id));
  }

  async create(dto: CreateCustomerDto): Promise<CustomerResponseDto> {
    const customer = await this.customersRepository.create({
      ...dto,
      email: dto.email?.toLowerCase(),
      birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
    });
    return toCustomerResponse(customer);
  }

  async update(id: string, dto: UpdateCustomerDto): Promise<CustomerResponseDto> {
    const customer = await this.customersRepository.update(id, {
      ...dto,
      email: dto.email?.toLowerCase(),
      birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
    });
    return toCustomerResponse(customer);
  }

  async setActive(id: string, isActive: boolean): Promise<CustomerResponseDto> {
    return toCustomerResponse(await this.customersRepository.update(id, { isActive }));
  }

  /** Generic history (sales, payments, subscriptions). Segment modules expose their own history. */
  async history(id: string): Promise<CustomerHistoryResponseDto> {
    const customer = await this.getOrThrow(id);
    const [sales, payments, subscriptions] = await this.customersRepository.findHistory(id);

    const entries: CustomerHistoryEntryDto[] = [
      ...sales.map((sale) => ({
        type: 'sale' as const,
        id: sale.id,
        status: sale.status,
        amount: toMoneyString(sale.total),
        description: sale.notes,
        occurredAt: sale.completedAt,
      })),
      ...payments.map((payment) => ({
        type: 'payment' as const,
        id: payment.id,
        status: payment.status,
        amount: toMoneyString(payment.amount),
        description: payment.description,
        occurredAt: payment.createdAt,
      })),
      ...subscriptions.map((subscription) => ({
        type: 'subscription' as const,
        id: subscription.id,
        status: subscription.status,
        amount: toMoneyString(subscription.price),
        description: subscription.plan.name,
        occurredAt: subscription.startDate,
      })),
    ].sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());

    return { customer: toCustomerResponse(customer), entries };
  }

  /** Used by other modules to validate references within the current tenant. */
  async ensureActive(id: string): Promise<Customer> {
    const customer = await this.customersRepository.findById(id);

    if (!customer || !customer.isActive) {
      throw new NotFoundException('Customer not found or inactive');
    }

    return customer;
  }

  private async getOrThrow(id: string): Promise<Customer> {
    const customer = await this.customersRepository.findById(id);

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return customer;
  }
}

function toCustomerResponse(customer: Customer): CustomerResponseDto {
  return {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    document: customer.document,
    birthDate: customer.birthDate,
    notes: customer.notes,
    isActive: customer.isActive,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
  };
}
