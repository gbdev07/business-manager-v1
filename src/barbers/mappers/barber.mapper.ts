import { Barber } from '@prisma/client';
import { BarberResponseDto } from '@barbers/dto/barber-response.dto';

export function mapBarberToResponse(barber: Barber): BarberResponseDto {
  return {
    id: barber.id,
    barbershopId: barber.barbershopId,
    name: barber.displayName,
    phone: barber.phone,
    specialty: barber.specialty,
    workDays: Array.isArray(barber.workDays) ? (barber.workDays as string[]) : [],
    workStartTime: barber.workStartTime,
    workEndTime: barber.workEndTime,
    isActive: barber.isActive,
    createdAt: barber.createdAt,
    updatedAt: barber.updatedAt,
  };
}
