import { BadRequestException } from '@nestjs/common';

export type DaySchedule = {
  open?: string;
  close?: string;
  closed?: boolean;
};

export type OperatingHours = Record<string, DaySchedule>;

const WEEKDAY_KEYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

export function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function getWeekdayKey(date: Date, timezone: string): string {
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'long',
  }).format(date);

  return weekday.toLowerCase();
}

export function getLocalTimeMinutes(date: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const hour = Number.parseInt(parts.find((part) => part.type === 'hour')?.value ?? '0', 10);
  const minute = Number.parseInt(parts.find((part) => part.type === 'minute')?.value ?? '0', 10);

  return hour * 60 + minute;
}

export function getAppointmentEndMinutes(startMinutes: number, durationMinutes: number): number {
  return startMinutes + durationMinutes;
}

export function appointmentsOverlap(
  startA: Date,
  durationA: number,
  startB: Date,
  durationB: number,
): boolean {
  const endA = startA.getTime() + durationA * 60_000;
  const endB = startB.getTime() + durationB * 60_000;

  return startA.getTime() < endB && endA > startB.getTime();
}

export function assertWithinHours(
  startMinutes: number,
  endMinutes: number,
  openTime: string,
  closeTime: string,
  contextLabel: string,
): void {
  const openMinutes = parseTimeToMinutes(openTime);
  const closeMinutes = parseTimeToMinutes(closeTime);

  if (startMinutes < openMinutes || endMinutes > closeMinutes) {
    throw new BadRequestException(
      `Appointment is outside ${contextLabel} hours (${openTime} - ${closeTime})`,
    );
  }
}

export function resolveDaySchedule(
  operatingHours: OperatingHours,
  weekday: string,
): DaySchedule | undefined {
  return operatingHours[weekday];
}

export function assertWeekdayAllowed(
  weekday: string,
  allowedDays: string[],
  contextLabel: string,
): void {
  if (!allowedDays.includes(weekday)) {
    throw new BadRequestException(`Appointment is not allowed on ${weekday} for ${contextLabel}`);
  }
}

export function assertDayIsOpen(schedule: DaySchedule | undefined, contextLabel: string): void {
  if (!schedule || schedule.closed) {
    throw new BadRequestException(`${contextLabel} is closed on this day`);
  }

  if (!schedule.open || !schedule.close) {
    throw new BadRequestException(`${contextLabel} has no operating hours configured for this day`);
  }
}

export function isValidWeekdayKey(value: string): value is (typeof WEEKDAY_KEYS)[number] {
  return WEEKDAY_KEYS.includes(value as (typeof WEEKDAY_KEYS)[number]);
}
