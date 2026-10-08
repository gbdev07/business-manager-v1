import { Injectable } from '@nestjs/common';
import { Prisma, Service } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { TenantScopedRepository } from '@common/tenancy/tenant-scoped.repository';
import { TenantContext } from '@common/tenancy/tenant-context.service';
import { QueryServicesDto } from '@core/services/dto/service.dto';

@Injectable()
export class ServicesRepository extends TenantScopedRepository {
  constructor(prisma: PrismaService, tenantContext: TenantContext) {
    super(prisma, tenantContext);
  }

  findMany(query: QueryServicesDto): Promise<[Service[], number]> {
    const where: Prisma.ServiceWhereInput = {
      tenantId: this.tenantId,
      isActive: query.isActive,
      name: query.search ? { contains: query.search, mode: 'insensitive' } : undefined,
    };

    return this.prisma.$transaction([
      this.prisma.service.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.service.count({ where }),
    ]);
  }

  findById(id: string): Promise<Service | null> {
    return this.prisma.service.findFirst({ where: { id, tenantId: this.tenantId } });
  }

  findManyByIds(ids: string[]): Promise<Service[]> {
    return this.prisma.service.findMany({ where: { id: { in: ids }, tenantId: this.tenantId } });
  }

  create(data: Omit<Prisma.ServiceUncheckedCreateInput, 'tenantId'>): Promise<Service> {
    return this.prisma.service.create({ data: { ...data, tenantId: this.tenantId } });
  }

  update(id: string, data: Prisma.ServiceUpdateInput): Promise<Service> {
    return this.prisma.service.update({ where: { id, tenantId: this.tenantId }, data });
  }
}
