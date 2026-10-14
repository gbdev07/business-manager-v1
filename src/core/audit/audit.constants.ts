export const AuditAction = {
  AUTH_LOGIN: 'auth.login',
  AUTH_LOGIN_FAILED: 'auth.login_failed',
  AUTH_LOGOUT: 'auth.logout',
  AUTH_PASSWORD_RESET_REQUESTED: 'auth.password_reset_requested',
  AUTH_PASSWORD_RESET_COMPLETED: 'auth.password_reset_completed',
  AUTH_PASSWORD_RESET_FAILED: 'auth.password_reset_failed',
  AUTH_PASSWORD_CHANGED: 'auth.password_changed',
  AUTH_PASSWORD_CHANGE_FAILED: 'auth.password_change_failed',
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
