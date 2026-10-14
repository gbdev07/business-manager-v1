const configuration = () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  apiPrefix: process.env.API_PREFIX ?? 'api/v1',
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
  passwordReset: {
    url: process.env.PASSWORD_RESET_URL || undefined,
    tokenTtlMinutes: parseInt(process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES || '30', 10),
    requestCooldownSeconds: parseInt(process.env.PASSWORD_RESET_COOLDOWN_SECONDS || '60', 10),
    rateLimit: {
      ttlSeconds: parseInt(process.env.PASSWORD_RATE_LIMIT_TTL_SECONDS || '900', 10),
      max: parseInt(process.env.PASSWORD_RATE_LIMIT_MAX || '5', 10),
    },
  },
  swagger: {
    enabled: process.env.SWAGGER_ENABLED !== 'false',
    path: process.env.SWAGGER_PATH ?? 'docs',
  },
  payments: {
    defaultProvider: process.env.PAYMENT_DEFAULT_PROVIDER ?? 'MANUAL',
  },
  notifications: {
    devLogEnabled: process.env.NOTIFICATION_DEV_LOG !== 'false',
  },
  email: {
    from: process.env.EMAIL_FROM || undefined,
    smtp: {
      host: process.env.SMTP_HOST || undefined,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER || undefined,
      password: process.env.SMTP_PASSWORD || undefined,
    },
  },
});

/** Express `trust proxy` setting: hop count, boolean or a list of trusted addresses. */
function parseTrustProxy(value: string | undefined): boolean | number | string {
  if (!value || value === 'false') return false;
  if (value === 'true') return true;
  return /^\d+$/.test(value) ? parseInt(value, 10) : value;
}

export default configuration;

export type AppConfig = ReturnType<typeof configuration>;
