export const WEEKDAY_KEYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

export type WeekdayKey = (typeof WEEKDAY_KEYS)[number];

export interface DayHours {
  open?: string;
  close?: string;
  closed?: boolean;
}

export type OperatingHours = Partial<Record<WeekdayKey, DayHours>>;

export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export const DEFAULT_OPERATING_HOURS: OperatingHours = {
  sunday: { closed: true },
  monday: { open: '09:00', close: '19:00' },
  tuesday: { open: '09:00', close: '19:00' },
  wednesday: { open: '09:00', close: '19:00' },
  thursday: { open: '09:00', close: '19:00' },
  friday: { open: '09:00', close: '19:00' },
  saturday: { open: '09:00', close: '17:00' },
};

export function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

interface LocalParts {
  weekday: WeekdayKey;
  dateKey: string;
  minutes: number;
}

/** Date parts as seen in the tenant timezone. */
export function getLocalParts(date: Date, timeZone: string): LocalParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'long',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';

  return {
    weekday: get('weekday').toLowerCase() as WeekdayKey,
    dateKey: `${get('year')}-${get('month')}-${get('day')}`,
    minutes: Number(get('hour')) * 60 + Number(get('minute')),
  };
}

export interface TimeWindow {
  start: string;
  end: string;
}

/**
 * Returns null when [startsAt, endsAt) fits in the window on a single local day,
 * otherwise a human-readable reason.
 */
export function checkWithinWindow(
  startsAt: Date,
  endsAt: Date,
  window: TimeWindow,
  timeZone: string,
): string | null {
  const start = getLocalParts(startsAt, timeZone);
  const end = getLocalParts(endsAt, timeZone);

  if (start.dateKey !== end.dateKey) {
    return 'must start and end on the same day';
  }

  if (
    start.minutes < parseTimeToMinutes(window.start) ||
    end.minutes > parseTimeToMinutes(window.end)
  ) {
    return `must be between ${window.start} and ${window.end}`;
  }

  return null;
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}
