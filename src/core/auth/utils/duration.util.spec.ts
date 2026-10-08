import { parseDurationToSeconds } from '@core/auth/utils/duration.util';

describe('parseDurationToSeconds', () => {
  it.each([
    ['30s', 30],
    ['15m', 900],
    ['12h', 43200],
    ['7d', 604800],
  ])('parses %s', (input, expected) => {
    expect(parseDurationToSeconds(input)).toBe(expected);
  });

  it.each(['', '15', 'm15', '1w', '1.5h'])('rejects "%s"', (input) => {
    expect(() => parseDurationToSeconds(input)).toThrow();
  });
});
