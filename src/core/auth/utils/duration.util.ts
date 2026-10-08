const UNIT_SECONDS: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };

/** Parses durations such as "15m", "7d", "3600s" into seconds. */
export function parseDurationToSeconds(duration: string): number {
  const match = /^(\d+)([smhd])$/.exec(duration.trim());

  if (!match) {
    throw new Error(`Invalid duration "${duration}". Use formats like 30s, 15m, 12h or 7d.`);
  }

  return Number.parseInt(match[1], 10) * UNIT_SECONDS[match[2]];
}
