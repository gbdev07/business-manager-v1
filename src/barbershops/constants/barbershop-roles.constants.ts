/** Full management — create, update, settings. */
export const BARBERSHOP_WRITE_ROLES = ['super_admin', 'owner', 'manager'] as const;

/** Read barbershop data. */
export const BARBERSHOP_READ_ROLES = [
  'super_admin',
  'owner',
  'manager',
  'barber',
  'receptionist',
] as const;

/** Create new barbershop (onboarding). */
export const BARBERSHOP_CREATE_ROLES = ['super_admin', 'owner'] as const;

export const DEFAULT_OPERATING_HOURS = {
  monday: { open: '09:00', close: '18:00', closed: false },
  tuesday: { open: '09:00', close: '18:00', closed: false },
  wednesday: { open: '09:00', close: '18:00', closed: false },
  thursday: { open: '09:00', close: '18:00', closed: false },
  friday: { open: '09:00', close: '18:00', closed: false },
  saturday: { open: '09:00', close: '14:00', closed: false },
  sunday: { open: '09:00', close: '14:00', closed: true },
} as const;
