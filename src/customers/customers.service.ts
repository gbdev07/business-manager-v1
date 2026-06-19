import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentStatus, Prisma } from '@prisma/client';
import { AuthenticatedUser } from '@auth/interfaces/authenticated-user.interface';
import { PrismaService } from '@prisma/prisma.service';
import { CreateCustomerDto } from '@customers/dto/create-customer.dto';
import {
  CustomerHistoryResponseDto,
  AppointmentHistoryItemDto,
} from '@customers/dto/customer-history-response.dto';
import {
  CustomerResponseDto,
  PaginatedCustomersResponseDto,
} from '@customers/dto/customer-response.dto';
import { QueryCustomersDto } from '@customers/dto/query-customers.dto';
import { UpdateCustomerDto } from '@customers/dto/update-customer.dto';
import { mapCustomerToResponse } from '@customers/mappers/customer.mapper';
import { splitFullName } from '@customers/utils/name.util';

const UPCOMING_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.SCHEDULED,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.IN_PROGRESS,
];

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: CreateCustomerDto,
    currentUser: AuthenticatedUser,
  ): Promise<CustomerResponseDto> {
    this.assertBarbershopWriteAccess(currentUser, dto.barbershopId);
    await this.assertBarbershopExists(dto.barbershopId);

    if (dto.email) {
      await this.assertEmailAvailable(dto.barbershopId, dto.email);
    }

    const { firstName, lastName } = splitFullName(dto.name);

    const customer = await this.prisma.customer.create({
      data: {
        barbershopId: dto.barbershopId,
        firstName,
        lastName,
        phone: dto.phone,
        email: dto.email?.toLowerCase(),
        notes: dto.notes,
      },
    });

    return mapCustomerToResponse(customer);
  }

  async findAll(
    query: QueryCustomersDto,
    currentUser: AuthenticatedUser,
  ): Promise<PaginatedCustomersResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where = this.buildWhereClause(query, currentUser);

    const [customers, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        skip,
        take: limit,
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      data: customers.map(mapCustomerToResponse),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findById(id: string, currentUser: AuthenticatedUser): Promise<CustomerResponseDto> {
    const customer = await this.findCustomerOrThrow(id);
    this.assertBarbershopReadAccess(currentUser, customer.barbershopId);
    return mapCustomerToResponse(customer);
  }

  async update(
    id: string,
    dto: UpdateCustomerDto,
    currentUser: AuthenticatedUser,
  ): Promise<CustomerResponseDto> {
    const existing = await this.findCustomerOrThrow(id);
    this.assertBarbershopWriteAccess(currentUser, existing.barbershopId);

    if (dto.email && dto.email.toLowerCase() !== existing.email?.toLowerCase()) {
      await this.assertEmailAvailable(existing.barbershopId, dto.email, id);
    }

    const nameParts = dto.name ? splitFullName(dto.name) : undefined;

    const customer = await this.prisma.customer.update({
      where: { id },
      data: {
        firstName: nameParts?.firstName,
        lastName: nameParts?.lastName,
        phone: dto.phone,
        email: dto.email?.toLowerCase(),
        notes: dto.notes,
      },
    });

    return mapCustomerToResponse(customer);
  }

  async getHistory(
    id: string,
    currentUser: AuthenticatedUser,
  ): Promise<CustomerHistoryResponseDto> {
    const customer = await this.findCustomerOrThrow(id);
    this.assertBarbershopReadAccess(currentUser, customer.barbershopId);

    const now = new Date();

    const appointments = await this.prisma.appointment.findMany({
      where: {
        customerId: id,
        deletedAt: null,
      },
      include: {
        barber: { select: { displayName: true } },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    const upcoming: AppointmentHistoryItemDto[] = [];
    const past: AppointmentHistoryItemDto[] = [];

    for (const appointment of appointments) {
      const item = this.mapAppointmentHistoryItem(appointment);
      const isUpcoming =
        appointment.scheduledAt >= now && UPCOMING_STATUSES.includes(appointment.status);

      if (isUpcoming) {
        upcoming.push(item);
      } else {
        past.push(item);
      }
    }

    past.sort((a, b) => b.scheduledAt.getTime() - a.scheduledAt.getTime());

    return {
      customerId: id,
      past,
      upcoming,
      totalPast: past.length,
      totalUpcoming: upcoming.length,
    };
  }

  private mapAppointmentHistoryItem(appointment: {
    id: string;
    scheduledAt: Date;
    status: AppointmentStatus;
    durationMinutes: number;
    price: Prisma.Decimal | null;
    notes: string | null;
    barber: { displayName: string };
  }): AppointmentHistoryItemDto {
    return {
      id: appointment.id,
      scheduledAt: appointment.scheduledAt,
      status: appointment.status,
      durationMinutes: appointment.durationMinutes,
      price: appointment.price?.toString() ?? null,
      barberName: appointment.barber.displayName,
      notes: appointment.notes,
    };
  }

  private buildWhereClause(
    query: QueryCustomersDto,
    currentUser: AuthenticatedUser,
  ): Prisma.CustomerWhereInput {
    const where: Prisma.CustomerWhereInput = {
      barbershopId: this.resolveBarbershopFilter(query.barbershopId, currentUser),
    };

    if (!query.includeInactive) {
      where.deletedAt = null;
      where.isActive = true;
    }

    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.email) {
      where.email = { contains: query.email, mode: 'insensitive' };
    }

    if (query.phone) {
      where.phone = { contains: query.phone, mode: 'insensitive' };
    }

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

  private async assertEmailAvailable(
    barbershopId: string,
    email: string,
    excludeCustomerId?: string,
  ): Promise<void> {
    const existing = await this.prisma.customer.findFirst({
      where: {
        barbershopId,
        email: email.toLowerCase(),
        deletedAt: null,
        ...(excludeCustomerId ? { NOT: { id: excludeCustomerId } } : {}),
      },
    });

    if (existing) {
      throw new ConflictException('Email is already registered for this barbershop');
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

    if (!membership || !['owner', 'manager', 'receptionist'].includes(membership.roleSlug)) {
      throw new ForbiddenException(
        'You do not have permission to manage customers in this barbershop',
      );
    }
  }

  private async findCustomerOrThrow(id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, deletedAt: null },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return customer;
  }
}
