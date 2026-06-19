import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuthenticatedUser } from '@auth/interfaces/authenticated-user.interface';
import { PrismaService } from '@prisma/prisma.service';
import { CreateUserDto } from '@users/dto/create-user.dto';
import { DeactivateUserResponseDto } from '@users/dto/deactivate-user-response.dto';
import { PaginatedUsersResponseDto } from '@users/dto/paginated-users-response.dto';
import { QueryUsersDto } from '@users/dto/query-users.dto';
import { UpdateUserDto } from '@users/dto/update-user.dto';
import { UserResponseDto } from '@users/dto/user-response.dto';
import { mapUserToResponse, userInclude } from '@users/mappers/user.mapper';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  getStatus(): { module: string; status: string } {
    return { module: 'users', status: 'ready' };
  }

  async create(dto: CreateUserDto, currentUser: AuthenticatedUser): Promise<UserResponseDto> {
    this.assertBarbershopAccess(currentUser, dto.barbershopId);

    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser && !existingUser.deletedAt) {
      throw new ConflictException('Email is already in use');
    }

    const role = await this.prisma.role.findUnique({
      where: { slug: dto.roleSlug },
    });

    if (!role) {
      throw new NotFoundException(`Role "${dto.roleSlug}" not found`);
    }

    const barbershop = await this.prisma.barbershop.findFirst({
      where: { id: dto.barbershopId, deletedAt: null, isActive: true },
    });

    if (!barbershop) {
      throw new NotFoundException('Barbershop not found');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        memberships: {
          create: {
            barbershopId: dto.barbershopId,
            roleId: role.id,
          },
        },
      },
      include: userInclude,
    });

    return mapUserToResponse(user);
  }

  async findAll(
    query: QueryUsersDto,
    currentUser: AuthenticatedUser,
  ): Promise<PaginatedUsersResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where = this.buildWhereClause(query, currentUser);

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: userInclude,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users.map(mapUserToResponse),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findById(id: string, currentUser: AuthenticatedUser): Promise<UserResponseDto> {
    const user = await this.findActiveUserOrThrow(id);
    this.assertUserAccess(currentUser, user);
    return mapUserToResponse(user);
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    currentUser: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    const existing = await this.findActiveUserOrThrow(id);
    this.assertUserAccess(currentUser, existing);

    if (dto.email && dto.email.toLowerCase() !== existing.email) {
      const emailTaken = await this.prisma.user.findFirst({
        where: {
          email: dto.email.toLowerCase(),
          deletedAt: null,
          NOT: { id },
        },
      });

      if (emailTaken) {
        throw new ConflictException('Email is already in use');
      }
    }

    const data: Prisma.UserUpdateInput = {
      email: dto.email?.toLowerCase(),
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      isActive: dto.isActive,
    };

    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 12);
    }

    const user = await this.prisma.user.update({
      where: { id },
      data,
      include: userInclude,
    });

    return mapUserToResponse(user);
  }

  async deactivate(id: string, currentUser: AuthenticatedUser): Promise<DeactivateUserResponseDto> {
    if (currentUser.id === id) {
      throw new ForbiddenException('You cannot deactivate your own account');
    }

    const existing = await this.findActiveUserOrThrow(id);
    this.assertUserAccess(currentUser, existing);

    const user = await this.prisma.$transaction(async (tx) => {
      await tx.barbershopMember.updateMany({
        where: { userId: id, deletedAt: null },
        data: { isActive: false, deletedAt: new Date() },
      });

      await tx.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      return tx.user.update({
        where: { id },
        data: {
          isActive: false,
          deletedAt: new Date(),
        },
        include: userInclude,
      });
    });

    return {
      message: 'User deactivated successfully',
      user: mapUserToResponse(user),
    };
  }

  private buildWhereClause(
    query: QueryUsersDto,
    currentUser: AuthenticatedUser,
  ): Prisma.UserWhereInput {
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
    };

    const membershipFilter = this.resolveMembershipFilter(query.barbershopId, currentUser);

    if (membershipFilter) {
      where.memberships = {
        some: {
          deletedAt: null,
          ...membershipFilter,
        },
      };
    }

    if (query.email) {
      where.email = { contains: query.email, mode: 'insensitive' };
    }

    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  private resolveMembershipFilter(
    barbershopId: string | undefined,
    currentUser: AuthenticatedUser,
  ): { barbershopId: string | Prisma.StringFilter } | null {
    if (currentUser.isSuperAdmin) {
      if (barbershopId) {
        return { barbershopId };
      }
      return null;
    }

    const allowedBarbershopIds = currentUser.memberships.map(
      (membership) => membership.barbershopId,
    );

    if (allowedBarbershopIds.length === 0) {
      throw new ForbiddenException('You do not have access to any barbershop');
    }

    if (barbershopId) {
      if (!allowedBarbershopIds.includes(barbershopId)) {
        throw new ForbiddenException('You do not have access to this barbershop');
      }
      return { barbershopId };
    }

    return { barbershopId: { in: allowedBarbershopIds } };
  }

  private assertBarbershopAccess(currentUser: AuthenticatedUser, barbershopId: string): void {
    if (currentUser.isSuperAdmin) {
      return;
    }

    const hasAccess = currentUser.memberships.some(
      (membership) =>
        membership.barbershopId === barbershopId &&
        ['owner', 'manager'].includes(membership.roleSlug),
    );

    if (!hasAccess) {
      throw new ForbiddenException('You do not have permission to manage users in this barbershop');
    }
  }

  private assertUserAccess(
    currentUser: AuthenticatedUser,
    targetUser: {
      id: string;
      isSuperAdmin: boolean;
      memberships: { barbershop: { id: string } }[];
    },
  ): void {
    if (currentUser.isSuperAdmin) {
      return;
    }

    if (targetUser.isSuperAdmin) {
      throw new ForbiddenException('You do not have permission to access this user');
    }

    const allowedBarbershopIds = new Set(
      currentUser.memberships
        .filter((membership) => ['owner', 'manager', 'barber'].includes(membership.roleSlug))
        .map((membership) => membership.barbershopId),
    );

    const targetBarbershopIds = targetUser.memberships.map(
      (membership) => membership.barbershop.id,
    );

    const hasSharedBarbershop = targetBarbershopIds.some((id) => allowedBarbershopIds.has(id));

    if (!hasSharedBarbershop) {
      throw new ForbiddenException('You do not have permission to access this user');
    }
  }

  private async findActiveUserOrThrow(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: userInclude,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
}
