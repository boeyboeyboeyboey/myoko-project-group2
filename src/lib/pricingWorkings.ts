// Single source of truth for prices. Costs are in JPY (what the operators charge),
// converted to SGD with the FX rate and a margin below.
// Edit numbers here only; booking.ts derives every price from this file.

export type PackageKey = 'active' | 'slow' | 'best';
export type ActivityKey = 'zipline' | 'ebike' | 'sup' | 'kayak' | 'forest' | 'cruise' | 'winery' | 'trek' | 'arai';
export type Confidence = 'high' | 'medium' | 'low';

export interface Source {
  title: string;
  url: string | null;
  /** ISO date the source was published or last updated, if known. */
  date: string | null;
}

export type CostId = 'stay' | 'guide' | 'van';

export interface CostLine {
  id: CostId;
  item: string;
  /** Amount as quoted, in JPY. */
  jpy: number;
  unit: string;
  /** JPY per person per unit (per trip, per night, or per day, as `unit` says). */
  perPersonJpy: number;
  source: Source;
  confidence: Confidence;
  note: string;
}

export const ASSUMPTIONS = {
  /** JPY per 1 SGD. */
  fxJpyPerSgd: 123.5,
  fxSource: { url: 'https://www.exchange-rates.org/converter/jpy-sgd/2265', date: '2026-10-16' },
  /** Assumption: typical tour-operator markup range. Not sourced. */
  margin: 0.2,
  groupSize: 8,
  /** JPY per person per night, B&B, twin share. Proxy from an Akakura listing; Lime Resort Myoko rate unknown. */
  stayPerPersonNightJpy: 15000,
  /** JPY per day for the whole group. */
  guideDayJpy: 30000,
  vanDayJpy: 21000,
  accessed: '2026-10-21',
} as const;

/** What each package contains. Single source for nights, days and theme activities. */
export const PACKAGE_STRUCTURE: Record<PackageKey, { nights: number; days: number; themeActivities: readonly ActivityKey[] }> = {
  active: { nights: 3, days: 4, themeActivities: ['zipline', 'ebike', 'sup', 'kayak'] },
  slow: { nights: 3, days: 4, themeActivities: ['forest', 'cruise', 'winery'] },
  best: { nights: 6, days: 7, themeActivities: ['zipline', 'ebike', 'sup', 'kayak', 'forest', 'cruise', 'winery'] },
};

/** Per-person activity prices in JPY. Slide-sourced ones are the team rate on the course itinerary (Week 4 p.9), likely discounted. */
export const ACTIVITY_PRICES_JPY: Record<ActivityKey, number> = {
  zipline: 4500,
  ebike: 6000,
  sup: 6600,
  kayak: 6600,
  forest: 5000,
  cruise: 1800,
  winery: 6500,
  trek: 2500,
  arai: 11300,
};

export interface TodayAlternative {
  item: string;
  /** Price as quoted, as text (fares and frequencies vary). */
  price: string;
  source: Source;
  confidence: Confidence;
  note: string;
}

export const COST_LINES: readonly CostLine[] = [
  {
    id: 'stay',
    item: 'Room with breakfast, twin share',
    jpy: ASSUMPTIONS.stayPerPersonNightJpy,
    unit: 'per person per night',
    perPersonJpy: ASSUMPTIONS.stayPerPersonNightJpy,
    source: {
      title: 'Akakura Hotel, Aug 2026 listing JPY 13,281 pp; Akakura Kanko Hotel range JPY 15,120–55,000',
      url: 'https://japanuncharted.com/niigata/hotel',
      date: null,
    },
    confidence: 'low',
    note: 'B&B proxy from an Akakura listing. The Lime Resort Myoko rate is unknown, so a real rate would move every package.',
  },
  {
    id: 'guide',
    item: 'Guide-interpreter, shared across the group',
    jpy: ASSUMPTIONS.guideDayJpy,
    unit: 'per day (group)',
    perPersonJpy: ASSUMPTIONS.guideDayJpy / ASSUMPTIONS.groupSize,
    source: {
      title: 'Freelance 通訳案内士 range JPY 20,000–50,000 per day (no official rate)',
      url: null,
      date: null,
    },
    confidence: 'low',
    note: 'Weakest figure. Charged for each night of the stay.',
  },
  {
    id: 'van',
    item: 'Minivan charter (PROPOSED shuttle), 3 h at JPY 7,000 per hour, shared across the group',
    jpy: ASSUMPTIONS.vanDayJpy,
    unit: 'per day (group)',
    perPersonJpy: ASSUMPTIONS.vanDayJpy / ASSUMPTIONS.groupSize,
    source: {
      title: 'Taxi Jun (English)',
      url: 'https://www.taxi-jun.com/english/',
      date: null,
    },
    confidence: 'low',
    note: 'Proposed shuttle: station transfers plus activity days; one van day for each day of the package. Kanagawa operator, comparable only.',
  },
];

/** Information only: how guests reach the resorts today. Not used in any price formula. */
export const TODAY_ALTERNATIVES: readonly TodayAlternative[] = [
  {
    item: 'Nagaden bus, Iiyama → Madarao',
    price: '¥700 one way, ~30 min, 5 runs/day in the 2026 green season; some runs not on weekends',
    source: { title: 'Madarao green-season access', url: 'https://www.madarao.jp/green/access', date: null },
    confidence: 'low',
    note: 'October operation unconfirmed. Also: https://www.snowmonkeyresorts.com/access/iiyama-station/',
  },
  {
    item: 'Taxi, Iiyama → Madarao',
    price: '¥2,800–3,300, ~20 min',
    source: { title: 'Snow Monkey Resorts, Iiyama station access', url: 'https://www.snowmonkeyresorts.com/access/iiyama-station/', date: null },
    confidence: 'low',
    note: '',
  },
  {
    item: 'Shinkansen, Tokyo → Nagano',
    price: '¥8,340–8,450 reserved (sources conflict)',
    source: { title: 'jr-shinkansen.net, Tokyo to Nagano', url: 'https://jr-shinkansen.net/articles/tokyo-nagano/', date: null },
    confidence: 'low',
    note: '~60 trains/day vs 11 to Iiyama.',
  },
  {
    item: 'Shinano Railway, Nagano → Myoko-Kogen',
    price: '≈¥850, 40–50 min, 17 trains/day',
    source: { title: 'Ekitan, Nagano to Myoko-Kogen fare', url: 'https://ekitan.com/transit/fare/sf-2590/st-3749', date: null },
    confidence: 'low',
    note: '',
  },
  {
    item: 'Lime Resort Myoko station pickup',
    price: 'Conditional; book the day before; ~8 min by car from Myoko-Kogen',
    source: { title: 'Jalan listing, Lime Resort Myoko', url: 'https://www.jalan.net/yad349630/', date: null },
    confidence: 'low',
    note: '',
  },
];

/** Round to the nearest S$10. */
function roundToTenSgd(value: number): number {
  return Math.round(value / 10) * 10;
}

export interface BreakdownLine {
  id: string;
  label: string;
  /** Per-person JPY for this line over the whole package. */
  jpy: number;
}

export interface PackageBreakdown {
  lines: BreakdownLine[];
  totalJpy: number;
  /** Before margin, unrounded. */
  costSgd: number;
  priceSgd: number;
}

/** Per-line per-person JPY for a package, starting at Joetsu-Myoko Station. */
export function derivePackageBreakdown(id: PackageKey): PackageBreakdown {
  const { nights, days, themeActivities } = PACKAGE_STRUCTURE[id];
  const g = ASSUMPTIONS.groupSize;
  const lines: BreakdownLine[] = [
    { id: 'stay', label: `${nights} nights × ¥${ASSUMPTIONS.stayPerPersonNightJpy.toLocaleString('en-US')}`, jpy: nights * ASSUMPTIONS.stayPerPersonNightJpy },
    { id: 'guide', label: `${nights} guide days × ¥${ASSUMPTIONS.guideDayJpy.toLocaleString('en-US')} ÷ ${g}`, jpy: (nights * ASSUMPTIONS.guideDayJpy) / g },
    { id: 'van', label: `${days} van days × ¥${ASSUMPTIONS.vanDayJpy.toLocaleString('en-US')} ÷ ${g}`, jpy: (days * ASSUMPTIONS.vanDayJpy) / g },
    ...themeActivities.map((a) => ({ id: a, label: a, jpy: ACTIVITY_PRICES_JPY[a] })),
  ];
  const totalJpy = lines.reduce((sum, l) => sum + l.jpy, 0);
  const costSgd = totalJpy / ASSUMPTIONS.fxJpyPerSgd;
  return { lines, totalJpy, costSgd, priceSgd: roundToTenSgd(costSgd * (1 + ASSUMPTIONS.margin)) };
}

/**
 * Per-person package price in SGD, from the guest's Shinkansen station (Joetsu-Myoko).
 * jpy = nights x stay + nights x guide / group + days x van / group + sum of theme activities.
 */
export function derivePackagePriceSgd(id: PackageKey): number {
  return derivePackageBreakdown(id).priceSgd;
}

/** Per-person activity price in SGD, nearest S$1. */
export function deriveActivityPriceSgd(jpy: number): number {
  return Math.round(jpy / ASSUMPTIONS.fxJpyPerSgd * (1 + ASSUMPTIONS.margin));
}
