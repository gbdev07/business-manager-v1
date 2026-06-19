export interface DashboardPeriod {
  month: number;
  year: number;
}

export interface DashboardContext {
  barbershopId: string;
  timezone: string;
  period: DashboardPeriod;
}

export function resolveDashboardPeriod(
  month?: number,
  year?: number,
  timezone = 'UTC',
): DashboardPeriod {
  if (month !== undefined && year !== undefined) {
    return { month, year };
  }

  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    month: 'numeric',
    year: 'numeric',
  }).formatToParts(now);

  const resolvedMonth = month ?? Number(parts.find((part) => part.type === 'month')?.value ?? 1);
  const resolvedYear =
    year ?? Number(parts.find((part) => part.type === 'year')?.value ?? now.getUTCFullYear());

  return { month: resolvedMonth, year: resolvedYear };
}

export function formatTodayInTimezone(timezone: string, reference = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(reference);
}
