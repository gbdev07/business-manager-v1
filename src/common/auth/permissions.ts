/** Core permissions. Business modules declare their own permission sets next to their code. */
export const CorePermission = {
  ALL: '*',
  TENANT_READ: 'tenant:read',
  TENANT_MANAGE: 'tenant:manage',
  USERS_READ: 'users:read',
  USERS_MANAGE: 'users:manage',
  CUSTOMERS_READ: 'customers:read',
  CUSTOMERS_MANAGE: 'customers:manage',
  CATALOG_READ: 'catalog:read',
  CATALOG_MANAGE: 'catalog:manage',
  SALES_READ: 'sales:read',
  SALES_MANAGE: 'sales:manage',
  PAYMENTS_READ: 'payments:read',
  PAYMENTS_MANAGE: 'payments:manage',
  SUBSCRIPTIONS_READ: 'subscriptions:read',
  SUBSCRIPTIONS_MANAGE: 'subscriptions:manage',
  DASHBOARD_READ: 'dashboard:read',
  AUDIT_READ: 'audit:read',
} as const;

/**
 * Supports exact matches, the global wildcard `*` and resource wildcards (`customers:*`).
 */
export function hasPermission(granted: readonly string[], required: string): boolean {
  if (granted.includes(CorePermission.ALL) || granted.includes(required)) {
    return true;
  }

  const separatorIndex = required.lastIndexOf(':');
  if (separatorIndex === -1) {
    return false;
  }

  return granted.includes(`${required.slice(0, separatorIndex)}:*`);
}
