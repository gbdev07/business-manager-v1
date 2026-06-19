export const BARBER_WRITE_ROLES = ['super_admin', 'owner', 'manager'] as const;

export const BARBER_READ_ROLES = [
  'super_admin',
  'owner',
  'manager',
  'barber',
  'receptionist',
] as const;

export const WEEKDAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

export type Weekday = (typeof WEEKDAYS)[number];
