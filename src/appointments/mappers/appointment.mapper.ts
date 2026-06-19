import { Appointment, Barber, Barbershop, Customer } from '@prisma/client';
import { AppointmentResponseDto } from '@appointments/dto/appointment-response.dto';
import { joinFullName } from '@customers/utils/name.util';

type AppointmentWithRelations = Appointment & {
  barber: Pick<Barber, 'displayName'>;
  customer: Pick<Customer, 'firstName' | 'lastName'>;
};

export const appointmentInclude = {
  barber: { select: { displayName: true } },
  customer: { select: { firstName: true, lastName: true } },
} as const;

export function mapAppointmentToResponse(
  appointment: AppointmentWithRelations,
): AppointmentResponseDto {
  return {
    id: appointment.id,
    barbershopId: appointment.barbershopId,
    barberId: appointment.barberId,
    barberName: appointment.barber.displayName,
    customerId: appointment.customerId,
    customerName: joinFullName(appointment.customer.firstName, appointment.customer.lastName),
    scheduledAt: appointment.scheduledAt,
    durationMinutes: appointment.durationMinutes,
    status: appointment.status,
    price: appointment.price?.toString() ?? null,
    notes: appointment.notes,
    cancelledAt: appointment.cancelledAt,
    cancellationReason: appointment.cancellationReason,
    createdAt: appointment.createdAt,
    updatedAt: appointment.updatedAt,
  };
}

export type BarbershopScheduleContext = Pick<Barbershop, 'id' | 'timezone' | 'operatingHours'>;

export type BarberScheduleContext = Pick<
  Barber,
  'id' | 'barbershopId' | 'workDays' | 'workStartTime' | 'workEndTime' | 'isActive' | 'deletedAt'
>;
