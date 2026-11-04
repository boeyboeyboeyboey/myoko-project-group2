import { describe, expect, test } from 'vitest';
import { suggestTrip } from './tripFinder';

describe('suggestTrip', () => {
  test('kayaking with party size and September window picks active', () => {
    const r = suggestTrip('4 days in September, 2 of us, love kayaking');
    expect(r.packageId).toBe('active');
    expect(r.travellers).toBe(2);
    expect(r.window).toBe('B');
    expect(r.reasons).toContain('You mentioned kayak');
    expect(r.reasons).toContain('2 travellers');
    expect(r.reasons).toContain('September window');
  });

  test('slow words pick slow', () => {
    expect(suggestTrip('relaxing spa and winery, quiet forest').packageId).toBe('slow');
  });

  test('mixed active and slow words pick best', () => {
    expect(suggestTrip('Zipline and e-bike, then a quiet afternoon').packageId).toBe('best');
  });

  test('full-stay phrases pick best', () => {
    expect(suggestTrip('we want everything').packageId).toBe('best');
    expect(suggestTrip('we have 7 days').packageId).toBe('best');
  });

  test('no keywords falls back to recommended active package', () => {
    const r = suggestTrip('');
    expect(r.packageId).toBe('active');
    expect(r.travellers).toBeNull();
    expect(r.window).toBeNull();
    expect(r.reasons).toContain('No style keywords, so the recommended package');
  });

  test('couple means two, and "a couple of days" does not', () => {
    const couple = suggestTrip('A couple looking to relax in May');
    expect(couple.travellers).toBe(2);
    expect(couple.window).toBe('A');
    expect(couple.packageId).toBe('slow');
    expect(suggestTrip('a couple of days off in June').travellers).toBeNull();
  });

  test('solo and family-of counts; travellers clamp to 1-6', () => {
    expect(suggestTrip('solo hiker, just me in June').travellers).toBe(1);
    expect(suggestTrip('family of 9').travellers).toBe(6);
    expect(suggestTrip('10 people please').travellers).toBe(6);
  });

  test('window matching is case-insensitive', () => {
    expect(suggestTrip('OCTOBER trip for 3 Guests').window).toBe('B');
    expect(suggestTrip('3 guests, KAYAK').travellers).toBe(3);
  });
});
