import { describe, expect, test } from 'vitest';
import { parseTemps } from './weather';

const entry = (t: unknown) => ({ latitude: 0, longitude: 0, current: { time: '2026-10-23T12:00', temperature_2m: t } });

describe('parseTemps', () => {
  test('maps the multi-location array to rounded temps in order', () => {
    expect(parseTemps([entry(16.6), entry(30.2), entry(23.5)])).toEqual([
      { place: 'Myoko', tempC: 17 },
      { place: 'Singapore', tempC: 30 },
      { place: 'Tokyo', tempC: 24 },
    ]);
  });
  test('rejects malformed responses', () => {
    expect(parseTemps(null)).toBeNull();
    expect(parseTemps({ current: { temperature_2m: 5 } })).toBeNull();
    expect(parseTemps([entry(1), entry(2)])).toBeNull();
    expect(parseTemps([entry(1), entry('x'), entry(3)])).toBeNull();
    expect(parseTemps([entry(1), {}, entry(3)])).toBeNull();
  });
});
