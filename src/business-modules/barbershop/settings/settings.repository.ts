import { Injectable } from '@nestjs/common';
import { BarbershopSettings, Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { TenantScopedRepository } from '@common/tenancy/tenant-scoped.repository';
import { TenantContext } from '@common/tenancy/tenant-context.service';

@Injectable()
export class BarbershopSettingsRepository extends TenantScopedRepository {
  constructor(prisma: PrismaService, tenantContext: TenantContext) {
    super(prisma, tenantContext);
  }

  find(): Promise<BarbershopSettings | null> {
    return this.prisma.barbershopSettings.findUnique({ where: { tenantId: this.tenantId } });
  }

  upsert(operatingHours: Prisma.InputJsonValue): Promise<BarbershopSettings> {
    return this.prisma.barbershopSettings.upsert({
      where: { tenantId: this.tenantId },
      create: { tenantId: this.tenantId, operatingHours },
      update: { operatingHours },
    });
  }
}
