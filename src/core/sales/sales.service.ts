import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma, Product, SaleItemType, SaleStatus, Service } from '@prisma/client';
import { paginate, Paginated } from '@common/dto/pagination.dto';
import { TenantContext } from '@common/tenancy/tenant-context.service';
import { toMoneyString } from '@common/utils/money.util';
import { AuditAction } from '@core/audit/audit.constants';
import { AuditService } from '@core/audit/audit.service';
import { CustomersService } from '@core/customers/customers.service';
import { CoreEvent, SaleCompletedEvent } from '@core/events/core.events';
import { ProductsService } from '@core/products/products.service';
import { CreateSaleDto, QuerySalesDto, SaleResponseDto } from '@core/sales/dto/sale.dto';
import { SalesRepository, SaleWithItems } from '@core/sales/sales.repository';
import { ServicesService } from '@core/services/services.service';

@Injectable()
export class SalesService {
  constructor(
    private readonly salesRepository: SalesRepository,
    private readonly customersService: CustomersService,
    private readonly productsService: ProductsService,
    private readonly servicesService: ServicesService,
    private readonly auditService: AuditService,
    private readonly tenantContext: TenantContext,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async list(query: QuerySalesDto): Promise<Paginated<SaleResponseDto>> {
    const [sales, total] = await this.salesRepository.findMany(query);
    return paginate(sales.map(toSaleResponse), total, query);
  }

  async findById(id: string): Promise<SaleResponseDto> {
    return toSaleResponse(await this.getOrThrow(id));
  }

  async create(dto: CreateSaleDto): Promise<SaleResponseDto> {
    if (dto.customerId) {
      await this.customersService.ensureActive(dto.customerId);
    }

    const items = await this.buildItems(dto);
    const subtotal = items.reduce(
      (sum, item) => sum.plus(item.total as Prisma.Decimal),
      new Prisma.Decimal(0),
    );
    const discount = new Prisma.Decimal(dto.discount ?? 0);

    if (discount.greaterThan(subtotal)) {
      throw new BadRequestException('Discount cannot be greater than the subtotal');
    }

    const sale = await this.salesRepository.create({
      customerId: dto.customerId,
      userId: this.tenantContext.userId,
      subtotal,
      discount,
      total: subtotal.minus(discount),
      notes: dto.notes,
      items,
    });

    await this.auditService.record({
      action: AuditAction.SALE_CREATED,
      entity: 'sale',
      entityId: sale.id,
      metadata: { total: toMoneyString(sale.total), items: sale.items.length },
    });

    this.eventEmitter.emit(
      CoreEvent.SALE_COMPLETED,
      new SaleCompletedEvent(sale.tenantId, sale.id, sale.userId, toMoneyString(sale.total)),
    );

    return toSaleResponse(sale);
  }

  async cancel(id: string): Promise<SaleResponseDto> {
    const sale = await this.getOrThrow(id);

    if (sale.status === SaleStatus.CANCELLED) {
      throw new BadRequestException('Sale is already cancelled');
    }

    const updated = await this.salesRepository.update(id, {
      status: SaleStatus.CANCELLED,
      cancelledAt: new Date(),
    });

    await this.auditService.record({
      action: AuditAction.SALE_CANCELLED,
      entity: 'sale',
      entityId: id,
    });

    return toSaleResponse(updated);
  }

  private async buildItems(dto: CreateSaleDto): Promise<Prisma.SaleItemCreateWithoutSaleInput[]> {
    const productIds = dto.items.flatMap((item) => (item.productId ? [item.productId] : []));
    const serviceIds = dto.items.flatMap((item) => (item.serviceId ? [item.serviceId] : []));

    const [products, services] = await Promise.all([
      productIds.length
        ? this.productsService.findActiveByIds(productIds)
        : new Map<string, Product>(),
      serviceIds.length
        ? this.servicesService.findActiveByIds(serviceIds)
        : new Map<string, Service>(),
    ]);

    return dto.items.map((item) => {
      const catalogItem: Product | Service | undefined =
        item.type === SaleItemType.PRODUCT
          ? products.get(item.productId!)
          : services.get(item.serviceId!);

      if (!catalogItem) {
        throw new BadRequestException(
          `${item.type === SaleItemType.PRODUCT ? 'Product' : 'Service'} not found or inactive`,
        );
      }

      const unitPrice = new Prisma.Decimal(item.unitPrice ?? catalogItem.price);

      return {
        type: item.type,
        description: catalogItem.name,
        quantity: item.quantity,
        unitPrice,
        total: unitPrice.times(item.quantity),
        ...(item.type === SaleItemType.PRODUCT
          ? { product: { connect: { id: catalogItem.id } } }
          : { service: { connect: { id: catalogItem.id } } }),
      };
    });
  }

  private async getOrThrow(id: string): Promise<SaleWithItems> {
    const sale = await this.salesRepository.findById(id);

    if (!sale) {
      throw new NotFoundException('Sale not found');
    }

    return sale;
  }
}

function toSaleResponse(sale: SaleWithItems): SaleResponseDto {
  return {
    id: sale.id,
    customerId: sale.customerId,
    userId: sale.userId,
    status: sale.status,
    subtotal: toMoneyString(sale.subtotal),
    discount: toMoneyString(sale.discount),
    total: toMoneyString(sale.total),
    notes: sale.notes,
    items: sale.items.map((item) => ({
      id: item.id,
      type: item.type,
      productId: item.productId,
      serviceId: item.serviceId,
      description: item.description,
      quantity: item.quantity,
      unitPrice: toMoneyString(item.unitPrice),
      total: toMoneyString(item.total),
    })),
    completedAt: sale.completedAt,
    cancelledAt: sale.cancelledAt,
    createdAt: sale.createdAt,
  };
}
