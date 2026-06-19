import { createHash, randomBytes } from 'crypto';

export function generateRefreshToken(): string {
  return randomBytes(64).toString('hex');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function parseDurationToSeconds(duration: string): number {
  const match = /^(\d+)([smhd])$/.exec(duration.trim());

  if (!match) {
    return 900;
  }

  const value = Number.parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's':
      return value;
    case 'm':
      return value * 60;
    case 'h':
      return value * 3600;
    case 'd':
      return value * 86400;
    default:
      return 900;
  }
}

export function addDurationToDate(duration: string, from = new Date()): Date {
  const expiresAt = new Date(from);

  const match = /^(\d+)([smhd])$/.exec(duration.trim());
  if (!match) {
    expiresAt.setDate(expiresAt.getDate() + 7);
    return expiresAt;
  }

  const value = Number.parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's':
      expiresAt.setSeconds(expiresAt.getSeconds() + value);
      break;
    case 'm':
      expiresAt.setMinutes(expiresAt.getMinutes() + value);
      break;
    case 'h':
      expiresAt.setHours(expiresAt.getHours() + value);
      break;
    case 'd':
      expiresAt.setDate(expiresAt.getDate() + value);
      break;
    default:
      expiresAt.setDate(expiresAt.getDate() + 7);
  }

  return expiresAt;
}
