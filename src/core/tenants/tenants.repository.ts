import { Injectable } from '@nestjs/common';
import { Prisma, Role, Tenant, User } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { TenantContext } from '@common/tenancy/tenant-context.service';

export interface CreateTenantWithOwnerInput {
  tenant: Prisma.TenantCreateWithoutUsersInput;
  owner: { name: string; email: string; passwordHash: string; roleId: string };
}

@Injectable()
export class TenantsRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
  ) {}

  findCurrent(): Promise<Tenant | null> {
    return this.prisma.tenant.findUnique({ where: { id: this.tenantContext.tenantId } });
  }

  updateCurrent(data: Prisma.TenantUpdateInput): Promise<Tenant> {
    return this.prisma.tenant.update({ where: { id: this.tenantContext.tenantId }, data });
  }

  async slugExists(slug: string): Promise<boolean> {
    const count = await this.prisma.tenant.count({ where: { slug } });
    return count > 0;
  }

  async emailInUse(email: string): Promise<boolean> {
    const count = await this.prisma.user.count({ where: { email } });
    return count > 0;
  }

  findRoleByKey(key: string): Promise<Role | null> {
    return this.prisma.role.findUnique({ where: { key } });
  }

  createWithOwner(input: CreateTenantWithOwnerInput): Promise<{ tenant: Tenant; owner: User }> {
    return this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({ data: input.tenant });
      const owner = await tx.user.create({
        data: {
          tenantId: tenant.id,
          roleId: input.owner.roleId,
          name: input.owner.name,
          email: input.owner.email,
          passwordHash: input.owner.passwordHash,
        },
      });
      await tx.tenantMembership.create({
        data: { userId: owner.id, tenantId: tenant.id, roleId: input.owner.roleId },
      });
      return { tenant, owner };
    });
  }
}
