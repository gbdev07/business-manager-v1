import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthenticatedUser } from '@auth/interfaces/authenticated-user.interface';
import { PrismaService } from '@prisma/prisma.service';
import { CreateBarberDto } from '@barbers/dto/create-barber.dto';
import {
  BarberResponseDto,
  DeactivateBarberResponseDto,
  PaginatedBarbersResponseDto,
} from '@barbers/dto/barber-response.dto';
import { QueryBarbersDto } from '@barbers/dto/query-barbers.dto';
import { UpdateBarberDto } from '@barbers/dto/update-barber.dto';
import { mapBarberToResponse } from '@barbers/mappers/barber.mapper';

@Injectable()
export class BarbersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBarberDto, currentUser: AuthenticatedUser): Promise<BarberResponseDto> {
    this.assertBarbershopWriteAccess(currentUser, dto.barbershopId);
    await this.assertBarbershopExists(dto.barbershopId);
    this.validateWorkSchedule(dto.workStartTime, dto.workEndTime);

    const barber = await this.prisma.barber.create({
      data: {
        barbershopId: dto.barbershopId,
        displayName: dto.name,
        phone: dto.phone,
        specialty: dto.specialty,
        workDays: dto.workDays,
        workStartTime: dto.workStartTime,
        workEndTime: dto.workEndTime,
      },
    });

    return mapBarberToResponse(barber);
  }

  async findAll(
    query: QueryBarbersDto,
    currentUser: AuthenticatedUser,
  ): Promise<PaginatedBarbersResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where = this.buildWhereClause(query, currentUser);

    const [barbers, total] = await Promise.all([
      this.prisma.barber.findMany({
        where,
        orderBy: { displayName: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.barber.count({ where }),
    ]);

    return {
      data: barbers.map(mapBarberToResponse),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findById(id: string, currentUser: AuthenticatedUser): Promise<BarberResponseDto> {
    const barber = await this.findBarberOrThrow(id);
    this.assertBarbershopReadAccess(currentUser, barber.barbershopId);
    return mapBarberToResponse(barber);
  }

  async update(
    id: string,
    dto: UpdateBarberDto,
    currentUser: AuthenticatedUser,
  ): Promise<BarberResponseDto> {
    const existing = await this.findBarberOrThrow(id);
    this.assertBarbershopWriteAccess(currentUser, existing.barbershopId);

    const workStartTime = dto.workStartTime ?? existing.workStartTime;
    const workEndTime = dto.workEndTime ?? existing.workEndTime;

    if (workStartTime && workEndTime) {
      this.validateWorkSchedule(workStartTime, workEndTime);
    }

    const barber = await this.prisma.barber.update({
      where: { id },
      data: {
        displayName: dto.name,
        phone: dto.phone,
        specialty: dto.specialty,
        workDays: dto.workDays,
        workStartTime: dto.workStartTime,
        workEndTime: dto.workEndTime,
      },
    });

    return mapBarberToResponse(barber);
  }

  async deactivate(
    id: string,
    currentUser: AuthenticatedUser,
  ): Promise<DeactivateBarberResponseDto> {
    const existing = await this.findBarberOrThrow(id);
    this.assertBarbershopWriteAccess(currentUser, existing.barbershopId);

    const barber = await this.prisma.barber.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
    });

    return {
      message: 'Barber deactivated successfully',
      barber: mapBarberToResponse(barber),
    };
  }

  private buildWhereClause(
    query: QueryBarbersDto,
    currentUser: AuthenticatedUser,
  ): Prisma.BarberWhereInput {
    const where: Prisma.BarberWhereInput = {};

    if (!query.includeInactive) {
      where.deletedAt = null;
      where.isActive = true;
    }

    where.barbershopId = this.resolveBarbershopFilter(query.barbershopId, currentUser);

    return where;
  }

  private resolveBarbershopFilter(
    barbershopId: string | undefined,
    currentUser: AuthenticatedUser,
  ): string | Prisma.StringFilter {
    if (currentUser.isSuperAdmin) {
      if (barbershopId) {
        return barbershopId;
      }
      throw new BadRequestException('barbershopId is required');
    }

    const allowedBarbershopIds = currentUser.memberships.map(
      (membership) => membership.barbershopId,
    );

    if (allowedBarbershopIds.length === 0) {
      throw new ForbiddenException('You do not belong to any barbershop');
    }

    if (barbershopId) {
      if (!allowedBarbershopIds.includes(barbershopId)) {
        throw new ForbiddenException('You do not have access to this barbershop');
      }
      return barbershopId;
    }

    if (allowedBarbershopIds.length === 1) {
      return allowedBarbershopIds[0];
    }

    return { in: allowedBarbershopIds };
  }

  private async assertBarbershopExists(barbershopId: string): Promise<void> {
    const barbershop = await this.prisma.barbershop.findFirst({
      where: { id: barbershopId, deletedAt: null, isActive: true },
    });

    if (!barbershop) {
      throw new NotFoundException('Barbershop not found');
    }
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

  private assertBarbershopWriteAccess(currentUser: AuthenticatedUser, barbershopId: string): void {
    if (currentUser.isSuperAdmin) {
      return;
    }

    const membership = currentUser.memberships.find((item) => item.barbershopId === barbershopId);

    if (!membership || !['owner', 'manager'].includes(membership.roleSlug)) {
      throw new ForbiddenException(
        'You do not have permission to manage barbers in this barbershop',
      );
    }
  }

  private validateWorkSchedule(startTime: string, endTime: string): void {
    if (startTime >= endTime) {
      throw new BadRequestException('workStartTime must be before workEndTime');
    }
  }

  private async findBarberOrThrow(id: string) {
    const barber = await this.prisma.barber.findFirst({
      where: { id, deletedAt: null },
    });

    if (!barber) {
      throw new NotFoundException('Barber not found');
    }

    return barber;
  }
}
