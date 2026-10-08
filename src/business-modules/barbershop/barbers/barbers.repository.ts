import { Injectable } from '@nestjs/common';
import { Barber, Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { TenantScopedRepository } from '@common/tenancy/tenant-scoped.repository';
import { TenantContext } from '@common/tenancy/tenant-context.service';
import { QueryBarbersDto } from '@modules/barbershop/barbers/dto/barber.dto';

@Injectable()
export class BarbersRepository extends TenantScopedRepository {
  constructor(prisma: PrismaService, tenantContext: TenantContext) {
    super(prisma, tenantContext);
  }

  findMany(query: QueryBarbersDto): Promise<[Barber[], number]> {
    const where: Prisma.BarberWhereInput = {
      tenantId: this.tenantId,
      isActive: query.isActive,
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
    };

    return this.prisma.$transaction([
      this.prisma.barber.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.barber.count({ where }),
    ]);
  }

  findById(id: string): Promise<Barber | null> {
    return this.prisma.barber.findFirst({ where: { id, tenantId: this.tenantId } });
  }

  create(data: Omit<Prisma.BarberUncheckedCreateInput, 'tenantId'>): Promise<Barber> {
    return this.prisma.barber.create({ data: { ...data, tenantId: this.tenantId } });
  }

  update(id: string, data: Prisma.BarberUncheckedUpdateInput): Promise<Barber> {
    return this.prisma.barber.update({ where: { id, tenantId: this.tenantId }, data });
  }

  countActive(): Promise<number> {
    return this.prisma.barber.count({ where: { tenantId: this.tenantId, isActive: true } });
  }
}
