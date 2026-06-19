export const APPOINTMENT_WRITE_ROLES = [
  'super_admin',
  'owner',
  'manager',
  'receptionist',
  'barber',
] as const;

export const APPOINTMENT_READ_ROLES = [
  'super_admin',
  'owner',
  'manager',
  'barber',
  'receptionist',
] as const;

export const BLOCKING_APPOINTMENT_STATUSES = ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'] as const;

export const CANCELLABLE_STATUSES = ['SCHEDULED', 'CONFIRMED'] as const;

export const COMPLETABLE_STATUSES = ['SCHEDULED', 'CONFIRMED'] as const;

export const RESCHEDULABLE_STATUSES = ['SCHEDULED', 'CONFIRMED'] as const;

export const CONFIRMABLE_STATUSES = ['SCHEDULED'] as const;

export const NO_SHOW_STATUSES = ['SCHEDULED', 'CONFIRMED'] as const;
