import { SystemRole, SystemRoleKey } from '@core/users/system-roles';

export const BarbershopPermission = {
  SETTINGS_MANAGE: 'barbershop.settings:manage',
  BARBERS_READ: 'barbershop.barbers:read',
  BARBERS_MANAGE: 'barbershop.barbers:manage',
  APPOINTMENTS_READ: 'barbershop.appointments:read',
  APPOINTMENTS_MANAGE: 'barbershop.appointments:manage',
  COMMISSIONS_READ: 'barbershop.commissions:read',
  COMMISSIONS_MANAGE: 'barbershop.commissions:manage',
} as const;

const P = BarbershopPermission;

/** Merged into the system roles by the seed (OWNER already has `*`). */
export const BARBERSHOP_ROLE_PERMISSIONS: Record<SystemRoleKey, string[]> = {
  [SystemRole.OWNER]: [],
  [SystemRole.ADMIN]: Object.values(P),
  [SystemRole.MANAGER]: [
    P.BARBERS_READ,
    P.BARBERS_MANAGE,
    P.APPOINTMENTS_READ,
    P.APPOINTMENTS_MANAGE,
    P.COMMISSIONS_READ,
  ],
  [SystemRole.EMPLOYEE]: [P.BARBERS_READ, P.APPOINTMENTS_READ, P.APPOINTMENTS_MANAGE],
};
