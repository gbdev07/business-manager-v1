import { CorePermission as P } from '@common/auth/permissions';

export const SystemRole = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  EMPLOYEE: 'EMPLOYEE',
} as const;

export type SystemRoleKey = (typeof SystemRole)[keyof typeof SystemRole];

export interface RoleDefinition {
  key: SystemRoleKey;
  name: string;
  description: string;
  permissions: string[];
}

export type RolePermissionContribution = Partial<Record<SystemRoleKey, string[]>>;

/** Core permissions per system role. Business modules contribute their own (SystemRolesService). */
export const CORE_ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    key: SystemRole.OWNER,
    name: 'Owner',
    description: 'Business owner with full access',
    permissions: [P.ALL],
  },
  {
    key: SystemRole.ADMIN,
    name: 'Administrator',
    description: 'Manages the business except ownership-level settings',
    permissions: [
      P.TENANT_READ,
      P.USERS_READ,
      P.USERS_MANAGE,
      P.CUSTOMERS_READ,
      P.CUSTOMERS_MANAGE,
      P.CATALOG_READ,
      P.CATALOG_MANAGE,
      P.SALES_READ,
      P.SALES_MANAGE,
      P.PAYMENTS_READ,
      P.PAYMENTS_MANAGE,
      P.SUBSCRIPTIONS_READ,
      P.SUBSCRIPTIONS_MANAGE,
      P.DASHBOARD_READ,
      P.AUDIT_READ,
    ],
  },
  {
    key: SystemRole.MANAGER,
    name: 'Manager',
    description: 'Runs daily operations',
    permissions: [
      P.TENANT_READ,
      P.USERS_READ,
      P.CUSTOMERS_READ,
      P.CUSTOMERS_MANAGE,
      P.CATALOG_READ,
      P.CATALOG_MANAGE,
      P.SALES_READ,
      P.SALES_MANAGE,
      P.PAYMENTS_READ,
      P.PAYMENTS_MANAGE,
      P.SUBSCRIPTIONS_READ,
      P.SUBSCRIPTIONS_MANAGE,
      P.DASHBOARD_READ,
    ],
  },
  {
    key: SystemRole.EMPLOYEE,
    name: 'Employee',
    description: 'Front-line staff',
    permissions: [
      P.TENANT_READ,
      P.CUSTOMERS_READ,
      P.CUSTOMERS_MANAGE,
      P.CATALOG_READ,
      P.SALES_READ,
      P.SALES_MANAGE,
      P.SUBSCRIPTIONS_READ,
    ],
  },
];

/** Core definitions merged with business-module contributions (deduplicated). */
export function buildSystemRoles(contributions: RolePermissionContribution[]): RoleDefinition[] {
  return CORE_ROLE_DEFINITIONS.map((role) => ({
    ...role,
    permissions: [
      ...new Set([
        ...role.permissions,
        ...contributions.flatMap((contribution) => contribution[role.key] ?? []),
      ]),
    ],
  }));
}
