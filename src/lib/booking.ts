// Typed port of proposal_website/src/core.js (booking rules, pricing, itinerary).
// Pure logic only: no UI, no DOM. All prices are SGD per person unless noted.
// Price numbers come from ./pricingWorkings (single source of truth).

import {
  ACTIVITY_PRICES_JPY,
  PACKAGE_STRUCTURE,
  deriveActivityPriceSgd,
  derivePackagePriceSgd,
  type Confidence,
} from './pricingWorkings';

// ---------------------------------------------------------------------------
// Currency and packages
// ---------------------------------------------------------------------------

export const CURRENCY = 'SGD' as const;

/** Three themed packages, each priced from Joetsu-Myoko Station. */
export type PackageId = 'active' | 'slow' | 'best';

export interface PackageMeta {
  id: PackageId;
  name: string;
  nights: number;
  days: number;
  /** Activities included in the package price. */
  themeActivities: readonly ActivityId[];
}

export const PACKAGE_IDS: readonly PackageId[] = ['active', 'slow', 'best'];

const PACKAGE_NAMES: Record<PackageId, string> = { active: 'Active', slow: 'Slow', best: 'Best of Myoko' };

export const PACKAGES: readonly PackageMeta[] = PACKAGE_IDS.map((id) => ({
  id,
  name: PACKAGE_NAMES[id],
  ...PACKAGE_STRUCTURE[id],
}));

/** Per-person package prices in SGD, derived from pricingWorkings. */
export const PACKAGE_PRICES: Record<PackageId, number> = {
  active: derivePackagePriceSgd('active'),
  slow: derivePackagePriceSgd('slow'),
  best: derivePackagePriceSgd('best'),
};

export function getPackage(id: PackageId): PackageMeta {
  return PACKAGES.find((p) => p.id === id) ?? PACKAGES[0];
}

/** Booking party size limits. */
export const MIN_TRAVELLERS = 1;
export const MAX_TRAVELLERS = 6;

// ---------------------------------------------------------------------------
// Activities and slots
// ---------------------------------------------------------------------------

export type ActivityId = 'zipline' | 'ebike' | 'sup' | 'kayak' | 'forest' | 'cruise' | 'winery' | 'trek' | 'arai';

/** MM-DD, inclusive on both ends. */
export interface SeasonWindow {
  from: string;
  to: string;
}

export interface Activity {
  id: ActivityId;
  name: string;
  area: string;
  /** Per-person price in JPY as quoted by the comparable/partner. */
  priceJpy: number;
  /** Per-person price in SGD (derived). */
  priceSgd: number;
  /** Minutes. */
  duration: number;
  /** Operating months/days in MM-DD. */
  season: SeasonWindow;
  /** 0 = Sunday ... 6 = Saturday (JS Date.getDay convention). */
  closedWeekdays?: readonly number[];
  /** Windows in which `closedWeekdays` do NOT apply (activity runs every day). */
  weekdayClosureExceptions?: readonly SeasonWindow[];
  partnerLabel: string;
  priceBasis: {
    operator: string;
    url: string;
    year: number | null;
    confidence: Confidence;
  };
  description: string;
}

export const ACTIVITIES: readonly Activity[] = [
  {
    id: 'zipline',
    name: 'Forest zipline, Madarao',
    area: 'Madarao',
    priceJpy: ACTIVITY_PRICES_JPY.zipline,
    priceSgd: deriveActivityPriceSgd(ACTIVITY_PRICES_JPY.zipline),
    duration: 120,
    season: { from: '04-25', to: '11-01' },
    closedWeekdays: [2, 3],
    weekdayClosureExceptions: [{ from: '07-16', to: '08-31' }],
    partnerLabel: 'Proposed partner · Madarao Forest Zipline',
    priceBasis: {
      operator: 'Course itinerary slide (Week 4 p.9), team rate 2026 — likely discounted',
      url: '',
      year: 2026,
      confidence: 'low',
    },
    description: 'A canopy course in the Madarao area.',
  },
  {
    id: 'sup',
    name: 'Stand-up paddle, Lake Nojiri',
    area: 'Lake Nojiri',
    priceJpy: ACTIVITY_PRICES_JPY.sup,
    priceSgd: deriveActivityPriceSgd(ACTIVITY_PRICES_JPY.sup),
    duration: 150,
    // Team paddled on Lake Nojiri on 7 Oct 2026 (course itinerary), so the season runs past August.
    season: { from: '05-20', to: '10-31' },
    partnerLabel: 'Proposed partner · local SUP trainer, Shinanomachi',
    priceBasis: {
      operator: 'Course itinerary slide (Week 4 p.9), team rate 2026 — likely discounted',
      url: '',
      year: 2026,
      confidence: 'low',
    },
    description: 'Glide across Lake Nojiri on a stand-up paddleboard, with a trainer.',
  },
  {
    id: 'kayak',
    name: 'Kayak, Lake Nojiri',
    area: 'Lake Nojiri',
    priceJpy: ACTIVITY_PRICES_JPY.kayak,
    priceSgd: deriveActivityPriceSgd(ACTIVITY_PRICES_JPY.kayak),
    duration: 120,
    season: { from: '05-01', to: '10-31' },
    partnerLabel: 'Local operator · to be confirmed',
    priceBasis: {
      operator: 'Course itinerary slide (Week 4 p.9), team rate 2026 — likely discounted',
      url: '',
      year: 2026,
      confidence: 'low',
    },
    description: 'Paddle on nearby Lake Nojiri, weather permitting.',
  },
  {
    id: 'ebike',
    name: 'E-bike ride, Myoko Kogen',
    area: 'Myoko Kogen',
    priceJpy: ACTIVITY_PRICES_JPY.ebike,
    priceSgd: deriveActivityPriceSgd(ACTIVITY_PRICES_JPY.ebike),
    duration: 180,
    season: { from: '05-20', to: '10-31' },
    partnerLabel: 'Local operator (proposed)',
    priceBasis: {
      operator: 'Course itinerary slide (Week 4 p.9), team rate 2026 — likely discounted',
      url: '',
      year: 2026,
      confidence: 'low',
    },
    description: 'A guided e-bike ride through the Myoko Kogen countryside.',
  },
  {
    id: 'forest',
    name: 'Forest walk, Myoko Kogen',
    area: 'Myoko Kogen',
    priceJpy: ACTIVITY_PRICES_JPY.forest,
    priceSgd: deriveActivityPriceSgd(ACTIVITY_PRICES_JPY.forest),
    duration: 150,
    season: { from: '05-20', to: '10-31' },
    partnerLabel: 'Local operator (proposed)',
    priceBasis: {
      operator: 'Course itinerary slide (Week 4 p.9), team rate 2026 — likely discounted',
      url: '',
      year: 2026,
      confidence: 'low',
    },
    description: 'A guided walk through the forests of Myoko Kogen.',
  },
  {
    id: 'cruise',
    name: 'Lake cruise and Benten Island, Lake Nojiri',
    area: 'Lake Nojiri',
    priceJpy: ACTIVITY_PRICES_JPY.cruise,
    priceSgd: deriveActivityPriceSgd(ACTIVITY_PRICES_JPY.cruise),
    duration: 60,
    season: { from: '05-20', to: '10-31' },
    partnerLabel: 'Local operator (proposed)',
    priceBasis: {
      operator: 'Course itinerary slide (Week 4 p.9), team rate 2026 — likely discounted',
      url: '',
      year: 2026,
      confidence: 'low',
    },
    description: 'A boat cruise on Lake Nojiri with a stop at Benten Island.',
  },
  {
    id: 'winery',
    name: 'St. Cousair winery, Iizuna',
    area: 'Iizuna',
    priceJpy: ACTIVITY_PRICES_JPY.winery,
    priceSgd: deriveActivityPriceSgd(ACTIVITY_PRICES_JPY.winery),
    duration: 120,
    season: { from: '05-20', to: '10-31' },
    partnerLabel: 'Local operator (proposed)',
    priceBasis: {
      operator: 'Course itinerary slide (Week 4 p.9), team rate 2026 — likely discounted',
      url: '',
      year: 2026,
      confidence: 'low',
    },
    description: 'A visit to the St. Cousair winery in Iizuna.',
  },
  {
    id: 'trek',
    name: 'Guided nature trek, Myoko Kogen',
    area: 'Myoko Kogen',
    priceJpy: ACTIVITY_PRICES_JPY.trek,
    priceSgd: deriveActivityPriceSgd(ACTIVITY_PRICES_JPY.trek),
    duration: 150,
    season: { from: '05-01', to: '10-31' },
    partnerLabel: 'Proposed partner · Myoko Kogen Visitor Center',
    priceBasis: {
      operator: 'Myoko Nature Academy (comparable)',
      url: 'http://niigata-kankou.or.jp/spot/detail_15556.html',
      year: 2019,
      confidence: 'low',
    },
    description: 'An easy-paced guided walk on local highland trails.',
  },
  {
    id: 'arai',
    name: 'Arai food & sake walk, incl. Kanzuri',
    area: 'Arai',
    priceJpy: ACTIVITY_PRICES_JPY.arai,
    priceSgd: deriveActivityPriceSgd(ACTIVITY_PRICES_JPY.arai),
    duration: 360,
    season: { from: '05-01', to: '10-31' },
    partnerLabel: 'Proposed partner · Kanzuri (walk-in shop, weekdays)',
    priceBasis: {
      operator: 'Heartland Japan Arai street food & sake tour (comparable)',
      url: 'https://heartlandjapan.com/?p=13366',
      year: null,
      confidence: 'medium',
    },
    // Walk-in/weekday detail: team's own visit (5 Oct 2026), not an interview.
    description: 'A half-day food and sake walk in Arai, including a tasting of kanzuri. Sake tasting is for guests aged 20 and over. Kanzuri\'s shop takes walk-in visitors on weekdays; no booking needed.',
  },
];

export type SlotId = 'morning' | 'midday' | 'afternoon';

export interface Slot {
  id: SlotId;
  label: string;
  /** Minutes from midnight. */
  start: number;
  /** Minutes from midnight. */
  end: number;
}

export const SLOTS: readonly Slot[] = [
  { id: 'morning', label: 'Morning', start: 9 * 60, end: 11 * 60 + 30 },
  { id: 'midday', label: 'Midday', start: 12 * 60 + 30, end: 15 * 60 },
  { id: 'afternoon', label: 'Afternoon', start: 15 * 60 + 30, end: 18 * 60 },
];

export const BUFFER_MINUTES = 30;

export interface BookingSlot {
  id: string;
  /** ISO date, YYYY-MM-DD. */
  date: string;
  /** Minutes from midnight. */
  start: number;
  /** Minutes from midnight. */
  end: number;
}

// ---------------------------------------------------------------------------
// Date rules
// ---------------------------------------------------------------------------

export interface BookingWindow {
  id: string;
  /** ISO dates, inclusive. */
  from: string;
  to: string;
}

/** Green-season windows in which packages run (2027). */
export const BOOKING_WINDOWS: readonly BookingWindow[] = [
  { id: 'A', from: '2027-05-25', to: '2027-06-10' },
  { id: 'B', from: '2027-09-01', to: '2027-10-10' },
];

/** ISO date `n` days after `iso`, computed in UTC so it never shifts with the local time zone. */
function addDaysIso(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/**
 * Arrival must be today or later, and the whole stay (arrival through
 * arrival + nights, the departure day) must lie inside one booking window.
 */
export function bookingDatesValid(arrival: string, packageId: PackageId, today: Date = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(arrival)) return false;
  if (Number.isNaN(new Date(`${arrival}T12:00:00`).getTime())) return false;
  const todayIso = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-');
  if (arrival < todayIso) return false;
  const departure = addDaysIso(arrival, getPackage(packageId).nights);
  return BOOKING_WINDOWS.some((w) => arrival >= w.from && departure <= w.to);
}

/** ISO date (YYYY-MM-DD) of the `dayIndex`-th day after arrival. */
export function activityDate(arrival: string, dayIndex: number): string {
  const date = new Date(`${arrival}T12:00:00`);
  date.setDate(date.getDate() + dayIndex);
  return date.toISOString().slice(0, 10);
}

/** Outings are allowed on any day strictly between arrival (0) and departure. */
export function activityDayAllowed(dayIndex: number, packageId: PackageId): boolean {
  const days = getPackage(packageId).days;
  return Number.isInteger(dayIndex) && dayIndex > 0 && dayIndex < days - 1;
}

/**
 * True when the activity runs on `isoDate` (YYYY-MM-DD): the date must fall in
 * the season window and must not be a closed weekday unless it is inside a
 * closure-exception window.
 */
export function activityAvailable(activityId: ActivityId, isoDate: string): boolean {
  const activity = ACTIVITIES.find((a) => a.id === activityId);
  if (!activity) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return false;
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return false;
  const mmdd = isoDate.slice(5);
  if (mmdd < activity.season.from || mmdd > activity.season.to) return false;
  const closed = activity.closedWeekdays?.includes(date.getDay()) ?? false;
  if (!closed) return true;
  const excepted = (activity.weekdayClosureExceptions ?? []).some((w) => mmdd >= w.from && mmdd <= w.to);
  return excepted;
}

// ---------------------------------------------------------------------------
// Clash detection
// ---------------------------------------------------------------------------

/** True when two slots on the same date overlap once `buffer` minutes are added around them. */
export function slotClashes(
  a: Pick<BookingSlot, 'date' | 'start' | 'end'>,
  b: Pick<BookingSlot, 'date' | 'start' | 'end'>,
  buffer: number = BUFFER_MINUTES,
): boolean {
  if (a.date !== b.date) return false;
  return a.start < b.end + buffer && b.start < a.end + buffer;
}

/** Every pair of clashing booking ids, in input order. */
export function findActivityClashes(bookings: readonly BookingSlot[], buffer: number = BUFFER_MINUTES): [string, string][] {
  const clashes: [string, string][] = [];
  for (let i = 0; i < bookings.length; i++) {
    for (let j = i + 1; j < bookings.length; j++) {
      if (slotClashes(bookings[i], bookings[j], buffer)) clashes.push([bookings[i].id, bookings[j].id]);
    }
  }
  return clashes;
}

// ---------------------------------------------------------------------------
// Pricing
// ---------------------------------------------------------------------------

export interface PriceInput {
  packageId: PackageId;
  /**
   * Activities the traveller picked. Those in the package's theme are already in
   * the base price (removing one gives no refund); any others are charged as extras.
   */
  activityIds?: readonly ActivityId[];
  /** Party size; must be a positive safe integer, otherwise `partyTotal` is null. */
  travellers?: number;
}

export interface PriceBreakdown {
  /** Base price plus extra activity charges, per person. */
  perPerson: number;
  /** perPerson x travellers, or null when the traveller count is invalid. */
  partyTotal: number | null;
  /** Package base price, per person. */
  base: number;
  /** Sum of priceSgd for every picked activity, per person. */
  activityTotal: number;
  /** Picked activities that are part of the package theme (no extra charge). */
  includedCount: number;
  /** Amount charged on top of the base for non-theme activities, per person. */
  extraActivityTotal: number;
}

/**
 * Voucher discount.
 * `discount` is a FRACTION of the party total: 0.1 = 10% off, 1 = 100% off.
 * Must satisfy 0 < discount <= 1; anything else throws RangeError.
 * The code is carried through for display/logging only; this function does
 * not check it against a list of valid codes.
 */
export interface Voucher {
  code: string;
  discount: number;
}

export interface TotalBreakdown extends PriceBreakdown {
  /** Voucher discount in SGD, rounded to cents (0 when no voucher). */
  discountAmount: number;
  /** partyTotal minus discountAmount, rounded to cents; null when partyTotal is null. */
  payableTotal: number | null;
}

function activityPriceSgd(id: ActivityId): number {
  const activity = ACTIVITIES.find((a) => a.id === id);
  if (!activity) throw new Error(`Unknown activity: ${id}`);
  return activity.priceSgd;
}

export function calculatePrices({ packageId, activityIds = [], travellers = 2 }: PriceInput): PriceBreakdown {
  const base = PACKAGE_PRICES[packageId];
  const theme = getPackage(packageId).themeActivities;
  const unique = [...new Set(activityIds)];
  const extras = unique.filter((id) => !theme.includes(id));
  const activityTotal = unique.reduce((sum, id) => sum + activityPriceSgd(id), 0);
  const extraActivityTotal = extras.reduce((sum, id) => sum + activityPriceSgd(id), 0);
  const perPerson = base + extraActivityTotal;
  const validTravellers = Number.isSafeInteger(travellers) && travellers >= 1;
  return {
    perPerson,
    partyTotal: validTravellers ? perPerson * travellers : null,
    base,
    activityTotal,
    includedCount: unique.length - extras.length,
    extraActivityTotal,
  };
}

/** Pure total calculation: prices plus an optional voucher. */
export function calculateTotal(input: PriceInput & { voucher?: Voucher | null }): TotalBreakdown {
  const { voucher, ...priceInput } = input;
  const prices = calculatePrices(priceInput);
  if (voucher == null) {
    return { ...prices, discountAmount: 0, payableTotal: prices.partyTotal };
  }
  if (!(Number.isFinite(voucher.discount) && voucher.discount > 0 && voucher.discount <= 1)) {
    throw new RangeError(`Voucher discount must be a fraction in (0, 1], got ${voucher.discount}`);
  }
  if (prices.partyTotal === null) {
    return { ...prices, discountAmount: 0, payableTotal: null };
  }
  const discountAmount = Math.round(prices.partyTotal * voucher.discount * 100) / 100;
  const payableTotal = Math.round((prices.partyTotal - discountAmount) * 100) / 100;
  return { ...prices, discountAmount, payableTotal };
}

// ---------------------------------------------------------------------------
// Itinerary
// ---------------------------------------------------------------------------

/** [day label, title, detail, timing] */
export type ItineraryRow = [day: string, title: string, detail: string, timing: string];

export interface ItineraryPick {
  activityId: ActivityId;
  /** 1 .. days-2 (see activityDayAllowed). */
  dayIndex: number;
  slot?: SlotId;
}

export interface ActivityPick {
  activityId: ActivityId;
  /** 1 .. days-2 */
  dayIndex: number;
  slot: SlotId;
}

/** Fill order for default picks: morning and afternoon first, midday last. */
const DEFAULT_SLOT_ORDER: readonly SlotId[] = ['morning', 'afternoon', 'midday'];

/** Reference arrival (a Wednesday inside window B) used to check availability for default picks. */
export const DEFAULT_REFERENCE_ARRIVAL = '2027-09-08';

/**
 * Gives every theme activity a day and slot with no clashes, spread over the
 * activity days, preferring dates on which the activity runs (checked against
 * DEFAULT_REFERENCE_ARRIVAL). An activity that runs on no free date is still placed.
 */
export function defaultPicks(packageId: PackageId, arrival: string = DEFAULT_REFERENCE_ARRIVAL): ActivityPick[] {
  const { days, themeActivities } = getPackage(packageId);
  const dayCount = days - 2;
  const picks: ActivityPick[] = [];
  const toSlot = (p: ActivityPick): BookingSlot => {
    const slot = SLOTS.find((s) => s.id === p.slot) as Slot;
    return { id: `${p.activityId}`, date: activityDate(arrival, p.dayIndex), start: slot.start, end: slot.end };
  };
  const free = (c: ActivityPick) => findActivityClashes([...picks, c].map(toSlot)).length === 0;
  themeActivities.forEach((activityId, i) => {
    const candidates: ActivityPick[] = [];
    for (let k = 0; k < dayCount; k++) {
      const dayIndex = 1 + ((i + k) % dayCount);
      for (const slot of DEFAULT_SLOT_ORDER) candidates.push({ activityId, dayIndex, slot });
    }
    const open = candidates.filter(free);
    const pick = open.find((c) => activityAvailable(activityId, activityDate(arrival, c.dayIndex))) ?? open[0];
    if (pick) picks.push(pick);
  });
  return picks;
}

export function makeItinerary(packageId: PackageId, picks: readonly ItineraryPick[] = []): ItineraryRow[] {
  const days = getPackage(packageId).days;
  const slotOrder = (p: ItineraryPick) => SLOTS.findIndex((s) => s.id === p.slot);
  const rows: ItineraryRow[] = [
    ['Arrival', 'Joetsu-Myoko to Myoko', 'Meet your guide at Joetsu-Myoko Station; shuttle (proposed) to Lime Resort Myoko.', 'Afternoon · illustrative'],
  ];
  for (let dayIndex = 1; dayIndex <= days - 2; dayIndex++) {
    const dayPicks = picks
      .filter((p) => p.dayIndex === dayIndex && activityDayAllowed(p.dayIndex, packageId))
      .sort((a, b) => slotOrder(a) - slotOrder(b));
    if (dayPicks.length === 0) {
      rows.push([`Day ${dayIndex + 1}`, 'Open day', 'Open day, with the guide and shuttle on call.', 'Open · illustrative']);
    } else {
      const names = dayPicks
        .map((p) => ACTIVITIES.find((a) => a.id === p.activityId)?.name ?? p.activityId)
        .join('; ');
      rows.push([`Day ${dayIndex + 1}`, 'Activity day', names, 'Times confirmed with operators · illustrative']);
    }
  }
  rows.push([`Day ${days}`, 'Myoko to Joetsu-Myoko', 'Shuttle (proposed) from Lime Resort Myoko to Joetsu-Myoko Station; departure day kept activity-free.', 'Morning · illustrative']);
  return rows;
}
