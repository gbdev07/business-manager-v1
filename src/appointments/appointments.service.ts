import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AppointmentStatus, Prisma } from '@prisma/client';
import { AuthenticatedUser } from '@auth/interfaces/authenticated-user.interface';
import { joinFullName } from '@customers/utils/name.util';
import {
  AppointmentConfirmedEvent,
  AppointmentCreatedEvent,
} from '@notifications/events/notification.events';
import { PrismaService } from '@prisma/prisma.service';
import { AppointmentsScheduleValidator } from '@appointments/appointments-schedule.validator';
import {
  CANCELLABLE_STATUSES,
  COMPLETABLE_STATUSES,
  CONFIRMABLE_STATUSES,
  NO_SHOW_STATUSES,
  RESCHEDULABLE_STATUSES,
} from '@appointments/constants/appointment.constants';
import {
  CancelAppointmentDto,
  CompleteAppointmentDto,
} from '@appointments/dto/appointment-actions.dto';
import {
  AppointmentResponseDto,
  PaginatedAppointmentsResponseDto,
} from '@appointments/dto/appointment-response.dto';
import { CreateAppointmentDto } from '@appointments/dto/create-appointment.dto';
import { QueryAppointmentsDto } from '@appointments/dto/query-appointments.dto';
import { RescheduleAppointmentDto } from '@appointments/dto/reschedule-appointment.dto';
import {
  appointmentInclude,
  mapAppointmentToResponse,
} from '@appointments/mappers/appointment.mapper';

type AppointmentWithRelations = Prisma.AppointmentGetPayload<{
  include: typeof appointmentInclude;
}>;

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scheduleValidator: AppointmentsScheduleValidator,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(
    dto: CreateAppointmentDto,
    currentUser: AuthenticatedUser,
  ): Promise<AppointmentResponseDto> {
    this.assertBarbershopWriteAccess(currentUser, dto.barbershopId);

    const [barbershop, barber] = await this.loadSchedulingEntities(
      dto.barbershopId,
      dto.barberId,
      dto.customerId,
    );

    const scheduledAt = new Date(dto.scheduledAt);
    const durationMinutes = dto.durationMinutes ?? 30;

    await this.scheduleValidator.validateSlot({
      barbershop,
      barber,
      scheduledAt,
      durationMinutes,
    });

    const appointment = await this.prisma.appointment.create({
      data: {
        barbershopId: dto.barbershopId,
        barberId: dto.barberId,
        customerId: dto.customerId,
        scheduledAt,
        durationMinutes,
        status: AppointmentStatus.SCHEDULED,
        price: dto.price,
        notes: dto.notes,
      },
      include: appointmentInclude,
    });

    this.emitAppointmentCreated(appointment);

    return mapAppointmentToResponse(appointment);
  }

  async findAll(
    query: QueryAppointmentsDto,
    currentUser: AuthenticatedUser,
  ): Promise<PaginatedAppointmentsResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where = this.buildWhereClause(query, currentUser);

    const [appointments, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        include: appointmentInclude,
        orderBy: { scheduledAt: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.appointment.count({ where }),
    ]);

    return {
      data: appointments.map(mapAppointmentToResponse),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findById(id: string, currentUser: AuthenticatedUser): Promise<AppointmentResponseDto> {
    const appointment = await this.findAppointmentOrThrow(id);
    this.assertBarbershopReadAccess(currentUser, appointment.barbershopId);
    return mapAppointmentToResponse(appointment);
  }

  async confirm(id: string, currentUser: AuthenticatedUser): Promise<AppointmentResponseDto> {
    const appointment = await this.findAppointmentOrThrow(id);
    this.assertBarbershopWriteAccess(currentUser, appointment.barbershopId);
    this.assertStatusTransition(appointment.status, CONFIRMABLE_STATUSES, 'confirm');

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: { status: AppointmentStatus.CONFIRMED },
      include: appointmentInclude,
    });

    this.emitAppointmentConfirmed(updated);

    return mapAppointmentToResponse(updated);
  }

  async reschedule(
    id: string,
    dto: RescheduleAppointmentDto,
    currentUser: AuthenticatedUser,
  ): Promise<AppointmentResponseDto> {
    const appointment = await this.findAppointmentOrThrow(id);
    this.assertBarbershopWriteAccess(currentUser, appointment.barbershopId);
    this.assertStatusTransition(appointment.status, RESCHEDULABLE_STATUSES, 'reschedule');

    const barberId = dto.barberId ?? appointment.barberId;
    const durationMinutes = dto.durationMinutes ?? appointment.durationMinutes;
    const scheduledAt = new Date(dto.scheduledAt);

    const [barbershop, barber] = await this.loadBarbershopAndBarber(
      appointment.barbershopId,
      barberId,
    );

    await this.assertCustomerInBarbershop(appointment.customerId, appointment.barbershopId);

    await this.scheduleValidator.validateSlot({
      barbershop,
      barber,
      scheduledAt,
      durationMinutes,
      excludeAppointmentId: id,
    });

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: {
        barberId,
        scheduledAt,
        durationMinutes,
      },
      include: appointmentInclude,
    });

    return mapAppointmentToResponse(updated);
  }

  async cancel(
    id: string,
    dto: CancelAppointmentDto,
    currentUser: AuthenticatedUser,
  ): Promise<AppointmentResponseDto> {
    const appointment = await this.findAppointmentOrThrow(id);
    this.assertBarbershopWriteAccess(currentUser, appointment.barbershopId);
    this.assertStatusTransition(appointment.status, CANCELLABLE_STATUSES, 'cancel');

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: {
        status: AppointmentStatus.CANCELLED,
        cancelledAt: new Date(),
        cancellationReason: dto.cancellationReason,
      },
      include: appointmentInclude,
    });

    return mapAppointmentToResponse(updated);
  }

  async complete(
    id: string,
    dto: CompleteAppointmentDto,
    currentUser: AuthenticatedUser,
  ): Promise<AppointmentResponseDto> {
    const appointment = await this.findAppointmentOrThrow(id);
    this.assertBarbershopWriteAccess(currentUser, appointment.barbershopId);
    this.assertStatusTransition(appointment.status, COMPLETABLE_STATUSES, 'complete');

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: {
        status: AppointmentStatus.COMPLETED,
        ...(dto.price !== undefined ? { price: dto.price } : {}),
      },
      include: appointmentInclude,
    });

    return mapAppointmentToResponse(updated);
  }

  async markNoShow(id: string, currentUser: AuthenticatedUser): Promise<AppointmentResponseDto> {
    const appointment = await this.findAppointmentOrThrow(id);
    this.assertBarbershopWriteAccess(currentUser, appointment.barbershopId);
    this.assertStatusTransition(appointment.status, NO_SHOW_STATUSES, 'mark as no-show');

    if (appointment.scheduledAt.getTime() > Date.now()) {
      throw new BadRequestException('Cannot mark no-show before scheduled time');
    }

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: { status: AppointmentStatus.NO_SHOW },
      include: appointmentInclude,
    });

    return mapAppointmentToResponse(updated);
  }

  private buildWhereClause(
    query: QueryAppointmentsDto,
    currentUser: AuthenticatedUser,
  ): Prisma.AppointmentWhereInput {
    const where: Prisma.AppointmentWhereInput = {
      deletedAt: null,
      barbershopId: this.resolveBarbershopFilter(query.barbershopId, currentUser),
    };

    if (query.barberId) {
      where.barberId = query.barberId;
    }

    if (query.customerId) {
      where.customerId = query.customerId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.from || query.to) {
      where.scheduledAt = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
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

  private async loadSchedulingEntities(barbershopId: string, barberId: string, customerId: string) {
    const [barbershop, barber, customer] = await Promise.all([
      this.prisma.barbershop.findFirst({
        where: { id: barbershopId, deletedAt: null, isActive: true },
        select: { id: true, timezone: true, operatingHours: true },
      }),
      this.prisma.barber.findFirst({
        where: { id: barberId, barbershopId, deletedAt: null, isActive: true },
        select: {
          id: true,
          barbershopId: true,
          workDays: true,
          workStartTime: true,
          workEndTime: true,
          isActive: true,
          deletedAt: true,
        },
      }),
      this.prisma.customer.findFirst({
        where: { id: customerId, barbershopId, deletedAt: null, isActive: true },
      }),
    ]);

    if (!barbershop) {
      throw new NotFoundException('Barbershop not found');
    }

    if (!barber) {
      throw new NotFoundException('Barber not found in this barbershop');
    }

    if (!customer) {
      throw new NotFoundException('Customer not found in this barbershop');
    }

    return [barbershop, barber, customer] as const;
  }

  private async loadBarbershopAndBarber(barbershopId: string, barberId: string) {
    const [barbershop, barber] = await Promise.all([
      this.prisma.barbershop.findFirst({
        where: { id: barbershopId, deletedAt: null, isActive: true },
        select: { id: true, timezone: true, operatingHours: true },
      }),
      this.prisma.barber.findFirst({
        where: { id: barberId, barbershopId, deletedAt: null, isActive: true },
        select: {
          id: true,
          barbershopId: true,
          workDays: true,
          workStartTime: true,
          workEndTime: true,
          isActive: true,
          deletedAt: true,
        },
      }),
    ]);

    if (!barbershop) {
      throw new NotFoundException('Barbershop not found');
    }

    if (!barber) {
      throw new NotFoundException('Barber not found in this barbershop');
    }

    return [barbershop, barber] as const;
  }

  private async assertCustomerInBarbershop(
    customerId: string,
    barbershopId: string,
  ): Promise<void> {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, barbershopId, deletedAt: null, isActive: true },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found in this barbershop');
    }
  }

  private assertStatusTransition(
    currentStatus: AppointmentStatus,
    allowedStatuses: readonly string[],
    action: string,
  ): void {
    if (!allowedStatuses.includes(currentStatus)) {
      throw new BadRequestException(`Cannot ${action} appointment with status ${currentStatus}`);
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

    if (
      !membership ||
      !['owner', 'manager', 'receptionist', 'barber'].includes(membership.roleSlug)
    ) {
      throw new ForbiddenException(
        'You do not have permission to manage appointments in this barbershop',
      );
    }
  }

  private async findAppointmentOrThrow(id: string) {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id, deletedAt: null },
      include: appointmentInclude,
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    return appointment;
  }

  private emitAppointmentCreated(appointment: AppointmentWithRelations): void {
    this.eventEmitter.emit(
      AppointmentCreatedEvent.eventName,
      new AppointmentCreatedEvent(this.buildAppointmentNotificationPayload(appointment)),
    );
  }

  private emitAppointmentConfirmed(appointment: AppointmentWithRelations): void {
    this.eventEmitter.emit(
      AppointmentConfirmedEvent.eventName,
      new AppointmentConfirmedEvent(this.buildAppointmentNotificationPayload(appointment)),
    );
  }

  private buildAppointmentNotificationPayload(appointment: AppointmentWithRelations) {
    return {
      appointmentId: appointment.id,
      barbershopId: appointment.barbershopId,
      customerId: appointment.customerId,
      customerName: joinFullName(appointment.customer.firstName, appointment.customer.lastName),
      customerEmail: appointment.customer.email,
      customerPhone: appointment.customer.phone,
      barberName: appointment.barber.displayName,
      scheduledAt: appointment.scheduledAt,
      durationMinutes: appointment.durationMinutes,
    };
  }
}
