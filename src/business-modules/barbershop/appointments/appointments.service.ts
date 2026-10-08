import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AppointmentStatus, Barber } from '@prisma/client';
import { paginate, Paginated } from '@common/dto/pagination.dto';
import { toNullableMoneyString } from '@common/utils/money.util';
import { CustomersService } from '@core/customers/customers.service';
import { ServicesService } from '@core/services/services.service';
import { TenantsService } from '@core/tenants/tenants.service';
import {
  AppointmentsRepository,
  AppointmentWithRefs,
} from '@modules/barbershop/appointments/appointments.repository';
import {
  AppointmentResponseDto,
  CancelAppointmentDto,
  CreateAppointmentDto,
  QueryAppointmentsDto,
  RescheduleAppointmentDto,
} from '@modules/barbershop/appointments/dto/appointment.dto';
import { AppointmentEvent, BarbershopEvent } from '@modules/barbershop/barbershop.events';
import { BarbersService } from '@modules/barbershop/barbers/barbers.service';
import {
  addMinutes,
  checkWithinWindow,
  getLocalParts,
} from '@modules/barbershop/common/schedule.util';
import { BarbershopSettingsService } from '@modules/barbershop/settings/settings.service';

const DEFAULT_DURATION_MINUTES = 30;
const OPEN_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.SCHEDULED,
  AppointmentStatus.CONFIRMED,
];

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly repository: AppointmentsRepository,
    private readonly barbersService: BarbersService,
    private readonly settingsService: BarbershopSettingsService,
    private readonly customersService: CustomersService,
    private readonly servicesService: ServicesService,
    private readonly tenantsService: TenantsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async list(query: QueryAppointmentsDto): Promise<Paginated<AppointmentResponseDto>> {
    const [appointments, total] = await this.repository.findMany(query);
    return paginate(appointments.map(toAppointmentResponse), total, query);
  }

  async listForCustomer(
    customerId: string,
    query: QueryAppointmentsDto,
  ): Promise<Paginated<AppointmentResponseDto>> {
    await this.customersService.findById(customerId);
    return this.list(Object.assign(query, { customerId }));
  }

  async findById(id: string): Promise<AppointmentResponseDto> {
    return toAppointmentResponse(await this.getOrThrow(id));
  }

  async create(dto: CreateAppointmentDto): Promise<AppointmentResponseDto> {
    await this.customersService.ensureActive(dto.customerId);
    const barber = await this.getActiveBarber(dto.barberId);
    const service = await this.servicesService.ensureActive(dto.serviceId);

    const startsAt = new Date(dto.startsAt);
    const endsAt = addMinutes(startsAt, service.durationMinutes ?? DEFAULT_DURATION_MINUTES);
    await this.assertBookable(barber, startsAt, endsAt);

    const appointment = await this.repository.createIfSlotFree({
      customerId: dto.customerId,
      barberId: barber.id,
      serviceId: service.id,
      startsAt,
      endsAt,
      price: service.price,
      notes: dto.notes,
    });

    if (!appointment) {
      throw new ConflictException('The barber already has an appointment in this time slot');
    }

    this.publish(BarbershopEvent.APPOINTMENT_CREATED, appointment);
    return toAppointmentResponse(appointment);
  }

  async reschedule(id: string, dto: RescheduleAppointmentDto): Promise<AppointmentResponseDto> {
    const current = await this.getOrThrow(id);
    this.assertStatus(current, OPEN_STATUSES, 'reschedule');

    const barber = await this.getActiveBarber(dto.barberId ?? current.barberId);
    const durationMs = current.endsAt.getTime() - current.startsAt.getTime();
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(startsAt.getTime() + durationMs);
    await this.assertBookable(barber, startsAt, endsAt);

    const appointment = await this.repository.rescheduleIfSlotFree(id, {
      barberId: barber.id,
      startsAt,
      endsAt,
    });

    if (!appointment) {
      throw new ConflictException('The barber already has an appointment in this time slot');
    }

    return toAppointmentResponse(appointment);
  }

  async confirm(id: string): Promise<AppointmentResponseDto> {
    const current = await this.getOrThrow(id);
    this.assertStatus(current, [AppointmentStatus.SCHEDULED], 'confirm');

    const appointment = await this.repository.update(id, {
      status: AppointmentStatus.CONFIRMED,
      confirmedAt: new Date(),
    });

    this.publish(BarbershopEvent.APPOINTMENT_CONFIRMED, appointment);
    return toAppointmentResponse(appointment);
  }

  async complete(id: string): Promise<AppointmentResponseDto> {
    const current = await this.getOrThrow(id);
    this.assertStatus(current, OPEN_STATUSES, 'complete');

    const appointment = await this.repository.update(id, {
      status: AppointmentStatus.COMPLETED,
      completedAt: new Date(),
    });

    await this.publishAndWait(BarbershopEvent.APPOINTMENT_COMPLETED, appointment);
    return toAppointmentResponse(appointment);
  }

  async cancel(id: string, dto: CancelAppointmentDto): Promise<AppointmentResponseDto> {
    const current = await this.getOrThrow(id);
    this.assertStatus(current, OPEN_STATUSES, 'cancel');

    const appointment = await this.repository.update(id, {
      status: AppointmentStatus.CANCELLED,
      cancelledAt: new Date(),
      cancellationReason: dto.reason,
    });

    this.publish(BarbershopEvent.APPOINTMENT_CANCELLED, appointment);
    return toAppointmentResponse(appointment);
  }

  async markNoShow(id: string): Promise<AppointmentResponseDto> {
    const current = await this.getOrThrow(id);
    this.assertStatus(current, OPEN_STATUSES, 'mark as no-show');

    if (current.startsAt > new Date()) {
      throw new BadRequestException('Cannot mark a future appointment as no-show');
    }

    return toAppointmentResponse(
      await this.repository.update(id, { status: AppointmentStatus.NO_SHOW }),
    );
  }

  private async getOrThrow(id: string): Promise<AppointmentWithRefs> {
    const appointment = await this.repository.findById(id);

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    return appointment;
  }

  private async getActiveBarber(id: string): Promise<Barber> {
    const barber = await this.barbersService.getOrThrow(id);

    if (!barber.isActive) {
      throw new BadRequestException('Barber is inactive');
    }

    return barber;
  }

  private assertStatus(
    appointment: AppointmentWithRefs,
    allowed: AppointmentStatus[],
    action: string,
  ): void {
    if (!allowed.includes(appointment.status)) {
      throw new BadRequestException(
        `Cannot ${action} an appointment with status ${appointment.status}`,
      );
    }
  }

  /** Business hours and barber availability. Slot overlap is checked atomically on write. */
  private async assertBookable(barber: Barber, startsAt: Date, endsAt: Date): Promise<void> {
    if (startsAt <= new Date()) {
      throw new BadRequestException('Appointments must be scheduled in the future');
    }

    const [{ timezone }, operatingHours] = await Promise.all([
      this.tenantsService.getCurrent(),
      this.settingsService.getOperatingHours(),
    ]);

    const { weekday } = getLocalParts(startsAt, timezone);
    const day = operatingHours[weekday];

    if (!day || day.closed || !day.open || !day.close) {
      throw new BadRequestException(`The barbershop is closed on ${weekday}`);
    }

    const outsideHours = checkWithinWindow(
      startsAt,
      endsAt,
      { start: day.open, end: day.close },
      timezone,
    );
    if (outsideHours) {
      throw new BadRequestException(`Appointment ${outsideHours} (operating hours)`);
    }

    if (barber.workDays.length > 0 && !barber.workDays.includes(weekday)) {
      throw new BadRequestException(`${barber.name} does not work on ${weekday}`);
    }

    if (barber.workStartTime && barber.workEndTime) {
      const outsideShift = checkWithinWindow(
        startsAt,
        endsAt,
        { start: barber.workStartTime, end: barber.workEndTime },
        timezone,
      );
      if (outsideShift) {
        throw new BadRequestException(`Appointment ${outsideShift} (${barber.name}'s shift)`);
      }
    }
  }

  private toEvent(appointment: AppointmentWithRefs): AppointmentEvent {
    return new AppointmentEvent(
      appointment.tenantId,
      appointment.id,
      appointment.customerId,
      appointment.barberId,
      appointment.serviceId,
      appointment.startsAt,
    );
  }

  private publish(event: string, appointment: AppointmentWithRefs): void {
    this.eventEmitter.emit(event, this.toEvent(appointment));
  }

  private async publishAndWait(event: string, appointment: AppointmentWithRefs): Promise<void> {
    await this.eventEmitter.emitAsync(event, this.toEvent(appointment));
  }
}

function toAppointmentResponse(appointment: AppointmentWithRefs): AppointmentResponseDto {
  return {
    id: appointment.id,
    customer: appointment.customer,
    barber: appointment.barber,
    service: appointment.service,
    startsAt: appointment.startsAt,
    endsAt: appointment.endsAt,
    status: appointment.status,
    price: toNullableMoneyString(appointment.price),
    notes: appointment.notes,
    confirmedAt: appointment.confirmedAt,
    completedAt: appointment.completedAt,
    cancelledAt: appointment.cancelledAt,
    cancellationReason: appointment.cancellationReason,
    createdAt: appointment.createdAt,
  };
}
