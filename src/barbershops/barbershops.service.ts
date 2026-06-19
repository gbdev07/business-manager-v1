import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthenticatedUser } from '@auth/interfaces/authenticated-user.interface';
import { PrismaService } from '@prisma/prisma.service';
import { DEFAULT_OPERATING_HOURS } from '@barbershops/constants/barbershop-roles.constants';
import { CreateBarbershopDto } from '@barbershops/dto/create-barbershop.dto';
import {
  BarbershopResponseDto,
  BarbershopSettingsResponseDto,
} from '@barbershops/dto/barbershop-response.dto';
import { PatchBarbershopSettingsDto } from '@barbershops/dto/patch-barbershop-settings.dto';
import { UpdateBarbershopDto } from '@barbershops/dto/update-barbershop.dto';
import {
  mapAddressToPrisma,
  mapBarbershopToResponse,
  mapBarbershopToSettingsResponse,
} from '@barbershops/mappers/barbershop.mapper';
import { generateUniqueSlug } from '@barbershops/utils/slug.util';

@Injectable()
export class BarbershopsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: CreateBarbershopDto,
    currentUser: AuthenticatedUser,
  ): Promise<BarbershopResponseDto> {
    const slug = await generateUniqueSlug(dto.name, async (candidate) => {
      const existing = await this.prisma.barbershop.findUnique({
        where: { slug: candidate },
      });
      return Boolean(existing);
    });

    const ownerRole = await this.prisma.role.findUnique({
      where: { slug: 'owner' },
    });

    if (!ownerRole) {
      throw new NotFoundException('Owner role not found');
    }

    const addressData = mapAddressToPrisma(dto.address);

    const barbershop = await this.prisma.$transaction(async (tx) => {
      const created = await tx.barbershop.create({
        data: {
          slug,
          name: dto.name,
          phone: dto.phone,
          email: dto.email?.toLowerCase(),
          document: dto.document,
          logoUrl: dto.logo,
          operatingHours: DEFAULT_OPERATING_HOURS as object,
          ...addressData,
          members: {
            create: {
              userId: currentUser.id,
              roleId: ownerRole.id,
            },
          },
        },
      });

      return created;
    });

    return mapBarbershopToResponse(barbershop);
  }

  async findAll(currentUser: AuthenticatedUser): Promise<BarbershopResponseDto[]> {
    const where = this.buildTenantWhere(currentUser);

    const barbershops = await this.prisma.barbershop.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return barbershops.map(mapBarbershopToResponse);
  }

  async findById(id: string, currentUser: AuthenticatedUser): Promise<BarbershopResponseDto> {
    const barbershop = await this.findActiveBarbershopOrThrow(id);
    this.assertBarbershopReadAccess(currentUser, id);
    return mapBarbershopToResponse(barbershop);
  }

  async update(
    id: string,
    dto: UpdateBarbershopDto,
    currentUser: AuthenticatedUser,
  ): Promise<BarbershopResponseDto> {
    await this.findActiveBarbershopOrThrow(id);
    this.assertBarbershopWriteAccess(currentUser, id);

    const addressData = dto.address ? mapAddressToPrisma(dto.address) : {};

    const barbershop = await this.prisma.barbershop.update({
      where: { id },
      data: {
        name: dto.name,
        phone: dto.phone,
        email: dto.email?.toLowerCase(),
        document: dto.document,
        isActive: dto.isActive,
        ...addressData,
      },
    });

    return mapBarbershopToResponse(barbershop);
  }

  async getSettings(
    id: string,
    currentUser: AuthenticatedUser,
  ): Promise<BarbershopSettingsResponseDto> {
    const barbershop = await this.findActiveBarbershopOrThrow(id);
    this.assertBarbershopReadAccess(currentUser, id);
    return mapBarbershopToSettingsResponse(barbershop);
  }

  async updateSettings(
    id: string,
    dto: PatchBarbershopSettingsDto,
    currentUser: AuthenticatedUser,
  ): Promise<BarbershopSettingsResponseDto> {
    await this.findActiveBarbershopOrThrow(id);
    this.assertBarbershopWriteAccess(currentUser, id);

    const data: Prisma.BarbershopUpdateInput = {
      logoUrl: dto.logo,
      timezone: dto.timezone,
    };

    if (dto.operatingHours) {
      const current = await this.prisma.barbershop.findUnique({ where: { id } });
      const currentHours =
        (current?.operatingHours as Record<string, unknown> | null) ?? DEFAULT_OPERATING_HOURS;

      data.operatingHours = {
        ...currentHours,
        ...dto.operatingHours,
      } as Prisma.InputJsonValue;
    }

    const barbershop = await this.prisma.barbershop.update({
      where: { id },
      data,
    });

    return mapBarbershopToSettingsResponse(barbershop);
  }

  async deactivate(
    id: string,
    currentUser: AuthenticatedUser,
  ): Promise<{ message: string; barbershop: BarbershopResponseDto }> {
    await this.findActiveBarbershopOrThrow(id);
    this.assertBarbershopWriteAccess(currentUser, id, ['super_admin', 'owner']);

    const barbershop = await this.prisma.barbershop.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
    });

    return {
      message: 'Barbershop deactivated successfully',
      barbershop: mapBarbershopToResponse(barbershop),
    };
  }

  private buildTenantWhere(currentUser: AuthenticatedUser): Prisma.BarbershopWhereInput {
    if (currentUser.isSuperAdmin) {
      return { deletedAt: null };
    }

    const barbershopIds = currentUser.memberships.map((membership) => membership.barbershopId);

    if (barbershopIds.length === 0) {
      throw new ForbiddenException('You do not belong to any barbershop');
    }

    return {
      deletedAt: null,
      id: { in: barbershopIds },
    };
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

  private assertBarbershopWriteAccess(
    currentUser: AuthenticatedUser,
    barbershopId: string,
    allowedRoles: string[] = ['super_admin', 'owner', 'manager'],
  ): void {
    if (currentUser.isSuperAdmin) {
      return;
    }

    const membership = currentUser.memberships.find((item) => item.barbershopId === barbershopId);

    if (!membership || !allowedRoles.includes(membership.roleSlug)) {
      throw new ForbiddenException('You do not have permission to modify this barbershop');
    }
  }

  private async findActiveBarbershopOrThrow(id: string) {
    const barbershop = await this.prisma.barbershop.findFirst({
      where: { id, deletedAt: null },
    });

    if (!barbershop) {
      throw new NotFoundException('Barbershop not found');
    }

    return barbershop;
  }
}
