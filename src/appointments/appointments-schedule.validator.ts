import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { AppointmentStatus } from '@prisma/client';
import { PrismaService } from '@prisma/prisma.service';
import { BLOCKING_APPOINTMENT_STATUSES } from '@appointments/constants/appointment.constants';
import {
  BarberScheduleContext,
  BarbershopScheduleContext,
} from '@appointments/mappers/appointment.mapper';
import {
  appointmentsOverlap,
  assertDayIsOpen,
  assertWeekdayAllowed,
  assertWithinHours,
  getAppointmentEndMinutes,
  getLocalTimeMinutes,
  getWeekdayKey,
  OperatingHours,
  resolveDaySchedule,
} from '@appointments/utils/schedule.util';

@Injectable()
export class AppointmentsScheduleValidator {
  constructor(private readonly prisma: PrismaService) {}

  async validateSlot(params: {
    barbershop: BarbershopScheduleContext;
    barber: BarberScheduleContext;
    scheduledAt: Date;
    durationMinutes: number;
    excludeAppointmentId?: string;
  }): Promise<void> {
    const { barbershop, barber, scheduledAt, durationMinutes, excludeAppointmentId } = params;

    if (barber.barbershopId !== barbershop.id) {
      throw new BadRequestException('Barber does not belong to this barbershop');
    }

    if (!barber.isActive || barber.deletedAt) {
      throw new BadRequestException('Barber is not available');
    }

    if (scheduledAt.getTime() <= Date.now()) {
      throw new BadRequestException('Appointment must be scheduled in the future');
    }

    const timezone = barbershop.timezone;
    const weekday = getWeekdayKey(scheduledAt, timezone);
    const startMinutes = getLocalTimeMinutes(scheduledAt, timezone);
    const endMinutes = getAppointmentEndMinutes(startMinutes, durationMinutes);

    const barberWorkDays = Array.isArray(barber.workDays) ? (barber.workDays as string[]) : [];

    assertWeekdayAllowed(weekday, barberWorkDays, 'barber');

    if (!barber.workStartTime || !barber.workEndTime) {
      throw new BadRequestException('Barber work schedule is not configured');
    }

    assertWithinHours(startMinutes, endMinutes, barber.workStartTime, barber.workEndTime, 'barber');

    const operatingHours = (barbershop.operatingHours ?? {}) as OperatingHours;
    const shopDaySchedule = resolveDaySchedule(operatingHours, weekday);

    assertDayIsOpen(shopDaySchedule, 'Barbershop');
    assertWithinHours(
      startMinutes,
      endMinutes,
      shopDaySchedule!.open!,
      shopDaySchedule!.close!,
      'barbershop',
    );

    await this.assertNoBarberOverlap({
      barberId: barber.id,
      scheduledAt,
      durationMinutes,
      excludeAppointmentId,
    });
  }

  private async assertNoBarberOverlap(params: {
    barberId: string;
    scheduledAt: Date;
    durationMinutes: number;
    excludeAppointmentId?: string;
  }): Promise<void> {
    const { barberId, scheduledAt, durationMinutes, excludeAppointmentId } = params;

    const windowStart = new Date(scheduledAt.getTime() - 24 * 60 * 60 * 1000);
    const windowEnd = new Date(scheduledAt.getTime() + 24 * 60 * 60 * 1000);

    const existingAppointments = await this.prisma.appointment.findMany({
      where: {
        barberId,
        deletedAt: null,
        status: { in: [...BLOCKING_APPOINTMENT_STATUSES] as AppointmentStatus[] },
        scheduledAt: { gte: windowStart, lte: windowEnd },
        ...(excludeAppointmentId ? { NOT: { id: excludeAppointmentId } } : {}),
      },
      select: {
        id: true,
        scheduledAt: true,
        durationMinutes: true,
      },
    });

    const hasOverlap = existingAppointments.some((appointment) =>
      appointmentsOverlap(
        scheduledAt,
        durationMinutes,
        appointment.scheduledAt,
        appointment.durationMinutes,
      ),
    );

    if (hasOverlap) {
      throw new ConflictException('Barber already has an appointment in this time slot');
    }
  }
}
