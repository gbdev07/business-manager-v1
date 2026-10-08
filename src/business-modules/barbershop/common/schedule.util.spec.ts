import {
  checkWithinWindow,
  getLocalParts,
  parseTimeToMinutes,
} from '@modules/barbershop/common/schedule.util';

const TZ = 'America/Sao_Paulo';

describe('schedule utils', () => {
  it('parses HH:mm to minutes', () => {
    expect(parseTimeToMinutes('00:00')).toBe(0);
    expect(parseTimeToMinutes('09:30')).toBe(570);
  });

  it('resolves weekday and time in the tenant timezone', () => {
    // 2026-09-29T02:00Z is Monday 23:00 in São Paulo (UTC-3)
    const parts = getLocalParts(new Date('2026-09-29T02:00:00Z'), TZ);
    expect(parts).toMatchObject({ weekday: 'monday', minutes: 23 * 60, dateKey: '2026-09-28' });
  });

  it('accepts slots inside the window', () => {
    const start = new Date('2026-09-29T13:00:00Z'); // 10:00 local
    const end = new Date('2026-09-29T13:30:00Z');
    expect(checkWithinWindow(start, end, { start: '09:00', end: '19:00' }, TZ)).toBeNull();
  });

  it('rejects slots that end after closing time', () => {
    const start = new Date('2026-09-29T21:45:00Z'); // 18:45 local
    const end = new Date('2026-09-29T22:15:00Z');
    expect(checkWithinWindow(start, end, { start: '09:00', end: '19:00' }, TZ)).toContain(
      'between',
    );
  });

  it('rejects slots crossing midnight', () => {
    const start = new Date('2026-09-30T02:45:00Z'); // 23:45 local
    const end = new Date('2026-09-30T03:15:00Z');
    expect(checkWithinWindow(start, end, { start: '00:00', end: '23:59' }, TZ)).toContain(
      'same day',
    );
  });
});
