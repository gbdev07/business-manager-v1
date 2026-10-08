import { Injectable } from '@nestjs/common';
import { Prisma, Role, User } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { TenantScopedRepository } from '@common/tenancy/tenant-scoped.repository';
import { TenantContext } from '@common/tenancy/tenant-context.service';
import { QueryUsersDto } from '@core/users/dto/user.dto';
import { RoleDefinition } from '@core/users/system-roles';

export type UserWithRole = User & { role: Role };

const withRole = { role: true } as const;

@Injectable()
export class UsersRepository extends TenantScopedRepository {
  constructor(prisma: PrismaService, tenantContext: TenantContext) {
    super(prisma, tenantContext);
  }

  async findMany(query: QueryUsersDto): Promise<[UserWithRole[], number]> {
    const where: Prisma.UserWhereInput = {
      tenantId: this.tenantId,
      isActive: query.isActive,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    return this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        include: withRole,
        orderBy: { name: 'asc' },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.user.count({ where }),
    ]);
  }

  findById(id: string): Promise<UserWithRole | null> {
    return this.prisma.user.findFirst({
      where: { id, tenantId: this.tenantId },
      include: withRole,
    });
  }

  async emailInUse(email: string): Promise<boolean> {
    return (await this.prisma.user.count({ where: { email } })) > 0;
  }

  create(data: Omit<Prisma.UserUncheckedCreateInput, 'tenantId'>): Promise<UserWithRole> {
    return this.prisma.user.create({
      data: { ...data, tenantId: this.tenantId },
      include: withRole,
    });
  }

  update(id: string, data: Prisma.UserUncheckedUpdateInput): Promise<UserWithRole> {
    return this.prisma.user.update({
      where: { id, tenantId: this.tenantId },
      data,
      include: withRole,
    });
  }

  async revokeRefreshTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null, user: { tenantId: this.tenantId } },
      data: { revokedAt: new Date() },
    });
  }
}

/** Roles are platform-wide (system roles); tenant-specific roles are planned for a later phase. */
@Injectable()
export class RolesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<Role[]> {
    return this.prisma.role.findMany({ orderBy: { name: 'asc' } });
  }

  findByKey(key: string): Promise<Role | null> {
    return this.prisma.role.findUnique({ where: { key } });
  }

  async upsertSystemRoles(roles: RoleDefinition[]): Promise<void> {
    await this.prisma.$transaction(
      roles.map((role) =>
        this.prisma.role.upsert({
          where: { key: role.key },
          create: { ...role, isSystem: true },
          update: {
            name: role.name,
            description: role.description,
            permissions: role.permissions,
          },
        }),
      ),
    );
  }
}
