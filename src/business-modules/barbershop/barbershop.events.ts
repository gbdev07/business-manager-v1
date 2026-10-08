export const BarbershopEvent = {
  APPOINTMENT_CREATED: 'barbershop.appointment.created',
  APPOINTMENT_CONFIRMED: 'barbershop.appointment.confirmed',
  APPOINTMENT_COMPLETED: 'barbershop.appointment.completed',
  APPOINTMENT_CANCELLED: 'barbershop.appointment.cancelled',
} as const;

export class AppointmentEvent {
  constructor(
    readonly tenantId: string,
    readonly appointmentId: string,
    readonly customerId: string,
    readonly barberId: string,
    readonly serviceId: string,
    readonly startsAt: Date,
  ) {}
}
