/**
 * Runs before each e2e file is loaded (jest `setupFiles`), i.e. before ConfigModule reads
 * the environment. Values already present in the shell environment take precedence.
 */
process.env.PASSWORD_RESET_URL ??= 'http://localhost:3001/reset-password';
// Each suite exercises the password endpoints many times from the same IP; the rate
// limit itself is covered by password-rate-limit.e2e-spec.ts with a small limit.
process.env.PASSWORD_RATE_LIMIT_MAX ??= '1000';
