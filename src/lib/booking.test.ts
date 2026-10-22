import { describe, expect, test } from 'vitest';
import {
  ACTIVITIES,
  BOOKING_WINDOWS,
  CURRENCY,
  PACKAGES,
  PACKAGE_IDS,
  PACKAGE_PRICES,
  SLOTS,
  activityAvailable,
  activityDate,
  activityDayAllowed,
  bookingDatesValid,
  calculatePrices,
  calculateTotal,
  defaultPicks,
  findActivityClashes,
  getPackage,
  makeItinerary,
  slotClashes,
  DEFAULT_REFERENCE_ARRIVAL,
  type PackageId,
} from './booking';

test('currency is SGD', () => {
  expect(CURRENCY).toBe('SGD');
});

test('activity day bounds exclude arrival and departure per package', () => {
  expect(activityDayAllowed(0, 'active')).toBe(false);
  expect(activityDayAllowed(1, 'active')).toBe(true);
  expect(activityDayAllowed(2, 'active')).toBe(true);
  expect(activityDayAllowed(3, 'active')).toBe(false);
  expect(activityDayAllowed(5, 'best')).toBe(true);
  expect(activityDayAllowed(6, 'best')).toBe(false);
});

test('packages have the intended length and theme activities', () => {
  expect(PACKAGES.map((p) => [p.id, p.days, p.nights])).toEqual([['active', 4, 3], ['slow', 4, 3], ['best', 7, 6]]);
  expect(getPackage('active').themeActivities).toEqual(['zipline', 'ebike', 'sup', 'kayak']);
  expect(getPackage('slow').themeActivities).toEqual(['forest', 'cruise', 'winery']);
  expect(getPackage('best').themeActivities).toHaveLength(7);
});

describe('booking windows', () => {
  const today = new Date(2027, 0, 1);
  test('windows are the two 2027 green-season ranges', () => {
    expect(BOOKING_WINDOWS.map((w) => [w.from, w.to])).toEqual([['2027-05-25', '2027-06-10'], ['2027-09-01', '2027-10-10']]);
  });
  test('stay inside window A or B is valid', () => {
    expect(bookingDatesValid('2027-05-25', 'active', today)).toBe(true);
    expect(bookingDatesValid('2027-06-07', 'slow', today)).toBe(true); // departs 10 Jun
    expect(bookingDatesValid('2027-09-01', 'best', today)).toBe(true);
    expect(bookingDatesValid('2027-10-04', 'best', today)).toBe(true); // departs 10 Oct
  });
  test('stay straddling the end of a window is invalid', () => {
    expect(bookingDatesValid('2027-06-08', 'active', today)).toBe(false);
    expect(bookingDatesValid('2027-10-05', 'best', today)).toBe(false);
    expect(bookingDatesValid('2027-05-24', 'active', today)).toBe(false);
  });
  test('July and other out-of-window dates are invalid', () => {
    expect(bookingDatesValid('2027-07-15', 'active', today)).toBe(false);
    expect(bookingDatesValid('', 'active', today)).toBe(false);
    expect(bookingDatesValid('not-a-date', 'active', today)).toBe(false);
  });
  test('a past arrival is invalid even inside a window', () => {
    expect(bookingDatesValid('2027-05-30', 'active', new Date(2027, 5, 1))).toBe(false);
    expect(bookingDatesValid('2027-05-30', 'active', new Date(2027, 4, 30))).toBe(true);
  });
});

test('30-minute buffer catches overlap and boundary contact, but permits exact buffer', () => {
  expect(slotClashes({ date: '2030-06-02', start: 540, end: 660 }, { date: '2030-06-02', start: 680, end: 750 })).toBe(true);
  expect(slotClashes({ date: '2030-06-02', start: 540, end: 660 }, { date: '2030-06-02', start: 690, end: 750 })).toBe(false);
  expect(slotClashes({ date: '2030-06-02', start: 540, end: 660 }, { date: '2030-06-03', start: 540, end: 660 })).toBe(false);
});

test('clash list reports all conflicting pairs with the configured buffer', () => {
  const entries = [
    { id: 'a', date: '2030-06-02', start: 540, end: 660 },
    { id: 'b', date: '2030-06-02', start: 680, end: 750 },
    { id: 'c', date: '2030-06-02', start: 720, end: 800 },
  ];
  expect(findActivityClashes(entries)).toEqual([['a', 'b'], ['b', 'c']]);
});

describe('package prices (SGD per person, from pricingWorkings)', () => {
  test.each<[PackageId, number]>([
    ['active', 880],
    ['slow', 780],
    ['best', 1630],
  ])('%s = S$%i', (packageId, expected) => {
    expect(PACKAGE_PRICES[packageId]).toBe(expected);
    expect(calculatePrices({ packageId }).perPerson).toBe(expected);
  });
});

describe('activity prices (SGD per person)', () => {
  const price = (id: string) => ACTIVITIES.find((a) => a.id === id)?.priceSgd;
  test('derived from JPY at the pinned FX rate and margin', () => {
    expect(price('zipline')).toBe(44);
    expect(price('ebike')).toBe(58);
    expect(price('sup')).toBe(64);
    expect(price('kayak')).toBe(64);
    expect(price('forest')).toBe(49);
    expect(price('cruise')).toBe(17);
    expect(price('winery')).toBe(63);
    expect(price('trek')).toBe(24);
    expect(price('arai')).toBe(110);
  });
});

describe('package price totals', () => {
  test('theme activities are included in the base price', () => {
    const result = calculatePrices({ packageId: 'active', activityIds: ['zipline', 'ebike', 'sup', 'kayak'] });
    expect(result.perPerson).toBe(880);
    expect(result.extraActivityTotal).toBe(0);
    expect(result.includedCount).toBe(4);
  });

  test('activities outside the theme are charged per traveller as extras', () => {
    const one = calculatePrices({ packageId: 'active', activityIds: ['zipline', 'trek', 'arai'], travellers: 1 });
    expect(one.extraActivityTotal).toBe(24 + 110);
    expect(one.partyTotal).toBe(880 + 134);
    expect(calculatePrices({ packageId: 'active', activityIds: ['trek'], travellers: 3 }).partyTotal).toBe((880 + 24) * 3);
    expect(calculatePrices({ packageId: 'slow', activityIds: ['zipline'], travellers: 2 }).partyTotal).toBe((780 + 44) * 2);
  });

  test('removing a theme activity does not lower the price', () => {
    const full = calculatePrices({ packageId: 'active', activityIds: ['zipline', 'ebike', 'sup', 'kayak'] });
    const fewer = calculatePrices({ packageId: 'active', activityIds: ['zipline'] });
    const none = calculatePrices({ packageId: 'active', activityIds: [] });
    expect(fewer.perPerson).toBe(full.perPerson);
    expect(none.perPerson).toBe(full.perPerson);
  });

  test('traveller count multiplies the per-person price; invalid counts give null', () => {
    expect(calculatePrices({ packageId: 'active', travellers: 1 }).partyTotal).toBe(880);
    expect(calculatePrices({ packageId: 'active', travellers: 6 }).partyTotal).toBe(5280);
    expect(calculatePrices({ packageId: 'best' }).partyTotal).toBe(3260);
    expect(calculatePrices({ packageId: 'slow', travellers: 1.5 }).partyTotal).toBeNull();
    expect(calculatePrices({ packageId: 'slow', travellers: 0 }).partyTotal).toBeNull();
  });
});

describe('activity availability', () => {
  test('SUP runs through both sales windows but not before 20 May', () => {
    expect(activityAvailable('sup', '2027-05-19')).toBe(false);
    expect(activityAvailable('sup', '2027-06-10')).toBe(true);
    expect(activityAvailable('sup', '2027-10-07')).toBe(true);
  });

  test('zipline is closed Tue/Wed outside the July–August exception window', () => {
    expect(activityAvailable('zipline', '2027-06-08')).toBe(false); // Tuesday
    expect(activityAvailable('zipline', '2027-06-09')).toBe(false); // Wednesday
    expect(activityAvailable('zipline', '2027-06-10')).toBe(true); // Thursday
  });

  test('zipline runs on a Tuesday inside the exception window', () => {
    expect(activityAvailable('zipline', '2027-07-20')).toBe(true); // Tuesday
  });

  test('zipline is out of season after 1 November', () => {
    expect(activityAvailable('zipline', '2027-11-02')).toBe(false);
  });

  test('malformed date is unavailable', () => {
    expect(activityAvailable('kayak', 'not-a-date')).toBe(false);
  });
});

describe('voucher discount', () => {
  test('valid voucher applies a fractional discount to the party total', () => {
    const result = calculateTotal({
      packageId: 'active',
      activityIds: ['trek'],
      voucher: { code: 'SUMMER10', discount: 0.1 },
    });
    expect(result.partyTotal).toBe(1808);
    expect(result.discountAmount).toBe(180.8);
    expect(result.payableTotal).toBe(1627.2);
    expect(result.perPerson).toBe(904);
  });

  test('no voucher (undefined or null) leaves the total unchanged', () => {
    const none = calculateTotal({ packageId: 'best' });
    expect(none.discountAmount).toBe(0);
    expect(none.payableTotal).toBe(3260);
    expect(calculateTotal({ packageId: 'best', voucher: null }).payableTotal).toBe(3260);
  });

  test('voucher with an invalid traveller count yields no payable total', () => {
    const result = calculateTotal({ packageId: 'slow', travellers: 0, voucher: { code: 'X', discount: 0.5 } });
    expect(result.partyTotal).toBeNull();
    expect(result.payableTotal).toBeNull();
    expect(result.discountAmount).toBe(0);
  });

  test('out-of-range discount throws', () => {
    expect(() => calculateTotal({ packageId: 'slow', voucher: { code: 'BAD', discount: 0 } })).toThrow(RangeError);
    expect(() => calculateTotal({ packageId: 'slow', voucher: { code: 'BAD', discount: 1.5 } })).toThrow(RangeError);
  });
});

describe('default picks', () => {
  test.each(PACKAGE_IDS)('%s: every theme activity placed once, on an allowed day, with no clashes', (packageId) => {
    const picks = defaultPicks(packageId);
    expect(picks.map((p) => p.activityId).sort()).toEqual([...getPackage(packageId).themeActivities].sort());
    for (const p of picks) expect(activityDayAllowed(p.dayIndex, packageId)).toBe(true);
    const slots = picks.map((p) => {
      const slot = SLOTS.find((s) => s.id === p.slot)!;
      return { id: p.activityId, date: activityDate(DEFAULT_REFERENCE_ARRIVAL, p.dayIndex), start: slot.start, end: slot.end };
    });
    expect(findActivityClashes(slots)).toEqual([]);
  });

  test.each(PACKAGE_IDS)('%s: picks run on their date in window B', (packageId) => {
    for (const p of defaultPicks(packageId)) {
      expect(activityAvailable(p.activityId, activityDate(DEFAULT_REFERENCE_ARRIVAL, p.dayIndex))).toBe(true);
    }
  });
});

describe('itinerary', () => {
  test('lengths follow the package', () => {
    expect(makeItinerary('active')).toHaveLength(4);
    expect(makeItinerary('slow')).toHaveLength(4);
    expect(makeItinerary('best')).toHaveLength(7);
    expect(makeItinerary('best').at(-1)?.[0]).toBe('Day 7');
  });

  test('picked activities appear on their day', () => {
    const rows = makeItinerary('active', [{ activityId: 'zipline', dayIndex: 2 }]);
    expect(rows[2][1]).toBe('Activity day');
    expect(rows[2][2]).toContain('Forest zipline, Madarao');
    expect(rows[1][1]).toBe('Open day');
  });

  test('default picks fill the activity days', () => {
    const rows = makeItinerary('best', defaultPicks('best'));
    expect(rows.slice(1, -1).every((r) => r[1] === 'Activity day')).toBe(true);
  });

  test('no coach wording remains', () => {
    const text = JSON.stringify(makeItinerary('best', [{ activityId: 'sup', dayIndex: 3 }]));
    for (const word of ['coach', 'soba']) {
      expect(text.toLowerCase()).not.toContain(word);
    }
  });
});

describe('defaultPicks for a real arrival', () => {
  for (const packageId of PACKAGE_IDS) {
    for (const w of BOOKING_WINDOWS) {
      test(`${packageId} from ${w.from} has no stale picks or clashes`, () => {
        const picks = defaultPicks(packageId, w.from);
        expect(picks).toHaveLength(getPackage(packageId).themeActivities.length);
        for (const p of picks) {
          expect(activityDayAllowed(p.dayIndex, packageId)).toBe(true);
          expect(activityAvailable(p.activityId, activityDate(w.from, p.dayIndex))).toBe(true);
        }
        const slots = picks.map((p) => {
          const a = ACTIVITIES.find((x) => x.id === p.activityId)!;
          const sl = SLOTS.find((x) => x.id === p.slot)!;
          return { id: p.activityId, date: activityDate(w.from, p.dayIndex), start: sl.start, end: sl.start + a.duration };
        });
        expect(findActivityClashes(slots)).toEqual([]);
      });
    }
  }
});
