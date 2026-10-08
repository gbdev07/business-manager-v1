export const AuditAction = {
  AUTH_LOGIN: 'auth.login',
  AUTH_LOGIN_FAILED: 'auth.login_failed',
  AUTH_LOGOUT: 'auth.logout',
  TENANT_REGISTERED: 'tenant.registered',
  TENANT_UPDATED: 'tenant.updated',
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_ROLE_CHANGED: 'user.role_changed',
  USER_ACTIVATED: 'user.activated',
  USER_DEACTIVATED: 'user.deactivated',
  SALE_CREATED: 'sale.created',
  SALE_CANCELLED: 'sale.cancelled',
  PAYMENT_CREATED: 'payment.created',
  PAYMENT_CONFIRMED: 'payment.confirmed',
  PAYMENT_CANCELLED: 'payment.cancelled',
  SUBSCRIPTION_CREATED: 'subscription.created',
  SUBSCRIPTION_RENEWED: 'subscription.renewed',
  SUBSCRIPTION_CANCELLED: 'subscription.cancelled',
} as const;

export interface AuditEntry {
  action: string;
  entity?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  /** Defaults to the tenant/user of the current request context. */
  tenantId?: string;
  userId?: string;
  ipAddress?: string;
}
