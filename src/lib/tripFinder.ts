import type { PackageId } from './booking';

export interface TripSuggestion {
  packageId: PackageId;
  travellers: number | null;
  window: 'A' | 'B' | null;
  reasons: string[];
}

type Term = [label: string, pattern: RegExp];

const ACTIVE_TERMS: readonly Term[] = [
  ['zipline', /\bzip-?lin/i],
  ['kayak', /\bkayak/i],
  ['SUP', /\bsup\b/i],
  ['paddle', /\bpaddl/i],
  ['e-bike', /\be-bike/i],
  // Negative lookbehind so "e-bike" counts once, under its own term.
  ['bike', /(?<![\w-])bik/i],
  ['cycling', /\bcycl/i],
  ['adventure', /\badventur/i],
  ['active', /\bactive\b/i],
  ['sport', /\bsport/i],
  ['hike', /\bhik/i],
];

const SLOW_TERMS: readonly Term[] = [
  ['relax', /\brelax/i],
  ['slow', /\bslow/i],
  ['wine', /\bwines?\b/i],
  ['winery', /\bwiner(y|ies)\b/i],
  ['forest', /\bforest/i],
  ['therapy', /\btherap/i],
  ['cruise', /\bcruis/i],
  ['quiet', /\bquiet/i],
  ['chill', /\bchill/i],
  ['calm', /\bcalm/i],
  ['spa', /\bspa\b/i],
];

/** Phrases that mean "give me the full stay". */
const BEST_PHRASE = /\bweeks?\b|\b7 days\b|\b6 nights\b|\beverything\b|\bboth\b|\bbest\b/i;

function matchedLabels(text: string, terms: readonly Term[]): string[] {
  return terms.filter(([, re]) => re.test(text)).map(([label]) => label);
}

function parseTravellers(text: string): number | null {
  let n: number | null = null;
  const numbered = /\b(\d+)\s*(?:people|of us|adults?|guests?|pax)\b/i.exec(text);
  const family = /\bfamily of (\d+)\b/i.exec(text);
  if (numbered) n = parseInt(numbered[1], 10);
  else if (family) n = parseInt(family[1], 10);
  // "a couple of days" is a duration, not a party of two.
  else if (/\bcouple\b(?!\s+of\s+(?:days|nights|weeks|hours)\b)/i.test(text)) n = 2;
  else if (/\bsolo\b|\bjust me\b/i.test(text)) n = 1;
  if (n === null || Number.isNaN(n)) return null;
  return Math.min(6, Math.max(1, n));
}

function parseWindow(text: string): 'A' | 'B' | null {
  const a = /\b(?:(?:in|during|early|late|mid|end of|this|next) may|june|jun)\b/i.exec(text);
  const b = /\b(sep|sept|september|oct|october|autumn|fall)\b/i.exec(text);
  if (!a && !b) return null;
  if (a && b) return a.index < b.index ? 'A' : 'B';
  return a ? 'A' : 'B';
}

/** Rule-based placeholder for an AI concierge. Pure: no network, no state. */
export function suggestTrip(text: string): TripSuggestion {
  const active = matchedLabels(text, ACTIVE_TERMS);
  const slow = matchedLabels(text, SLOW_TERMS);
  const bestPhrase = BEST_PHRASE.test(text);
  const mixed = active.length > 0 && slow.length > 0;

  let packageId: PackageId;
  if (bestPhrase || mixed) packageId = 'best';
  else if (slow.length > active.length) packageId = 'slow';
  else packageId = 'active';

  const travellers = parseTravellers(text);
  const window = parseWindow(text);

  const reasons: string[] = [];
  if (bestPhrase) reasons.push('You asked for the full stay');
  else if (mixed) reasons.push('Mix of active and slow activities');
  if (active.length + slow.length === 0 && !bestPhrase) {
    reasons.push('No style keywords, so the recommended package');
  }
  for (const label of [...active, ...slow].slice(0, 3)) reasons.push(`You mentioned ${label}`);
  if (travellers !== null) reasons.push(`${travellers} ${travellers === 1 ? 'traveller' : 'travellers'}`);
  if (window === 'A') reasons.push('May–June window');
  if (window === 'B') reasons.push('September window');

  return { packageId, travellers, window, reasons };
}
