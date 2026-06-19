/** Platform super admin and barbershop owner (ADMIN). */
export const USER_ADMIN_ROLES = ['super_admin', 'owner'] as const;

/** ADMIN + MANAGER — create, update, deactivate users. */
export const USER_WRITE_ROLES = ['super_admin', 'owner', 'manager'] as const;

/** ADMIN + MANAGER + BARBER — list and read users. */
export const USER_READ_ROLES = ['super_admin', 'owner', 'manager', 'barber'] as const;
