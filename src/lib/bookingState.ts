// Demo booking selection, persisted in sessionStorage under one key.
// No personal data, no payment. /book reuses this hook later.

import { useSyncExternalStore } from 'react';
import {
  ACTIVITIES,
  MAX_TRAVELLERS as MAX_PARTY,
  PACKAGE_IDS,
  SLOTS,
  defaultPicks,
  type ActivityPick,
  type PackageId,
} from './booking';

export type { ActivityPick };

export const BOOKING_STORAGE_KEY = 'myoko.booking.v2';
export const MAX_TRAVELLERS = MAX_PARTY;

export interface BookingSelection {
  packageId: PackageId;
  /** ISO date YYYY-MM-DD, or '' when not chosen. */
  arrival: string;
  travellers: number;
  picks: ActivityPick[];
  /** Return-pass voucher (set by /return). discount is a fraction in (0, 1]. */
  voucher: { code: string; discount: number } | null;
  /** Demo confirmation reference once "Confirm demo booking" was pressed, else null. */
  confirmation: string | null;
  contact: { name: string; email: string };
}

export const DEFAULT_SELECTION: BookingSelection = {
  packageId: 'active',
  arrival: '',
  travellers: 2,
  picks: defaultPicks('active'),
  voucher: null,
  confirmation: null,
  contact: { name: '', email: '' },
};

function sanitise(raw: unknown): BookingSelection {
  const d = DEFAULT_SELECTION;
  if (!raw || typeof raw !== 'object') return d;
  const r = raw as Record<string, unknown>;
  const packageId = PACKAGE_IDS.find((x) => x === r.packageId) ?? d.packageId;
  const arrival = typeof r.arrival === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.arrival) ? r.arrival : '';
  const n = Number(r.travellers);
  const travellers = Number.isInteger(n) ? Math.min(MAX_TRAVELLERS, Math.max(1, n)) : d.travellers;
  const seen = new Set<string>();
  const picks: ActivityPick[] = [];
  if (!Array.isArray(r.picks)) {
    picks.push(...defaultPicks(packageId));
  } else {
    for (const p of r.picks) {
      const q = p as Partial<ActivityPick> | null;
      if (!q || seen.has(String(q.activityId))) continue;
      const activity = ACTIVITIES.find((a) => a.id === q.activityId);
      const slot = SLOTS.find((s) => s.id === q.slot);
      if (!activity || !slot || !Number.isInteger(q.dayIndex)) continue;
      seen.add(activity.id);
      picks.push({ activityId: activity.id, dayIndex: q.dayIndex as number, slot: slot.id });
    }
  }
  const v = r.voucher as { code?: unknown; discount?: unknown } | null | undefined;
  const discount = Number(v?.discount);
  const voucher = v && typeof v.code === 'string' && v.code.trim() && typeof v.discount === 'number' && Number.isFinite(discount) && discount > 0 && discount <= 1
    ? { code: v.code.trim().slice(0, 40), discount }
    : null;
  const confirmation = typeof r.confirmation === 'string' && /^MYK-[A-Z0-9]{6}$/.test(r.confirmation) ? r.confirmation : null;
  const c = r.contact as { name?: unknown; email?: unknown } | null | undefined;
  const contact = {
    name: typeof c?.name === 'string' ? c.name.slice(0, 100) : '',
    email: typeof c?.email === 'string' ? c.email.slice(0, 200) : '',
  };
  return { packageId, arrival, travellers, picks, voucher, confirmation, contact };
}

function load(): BookingSelection {
  try {
    const text = window.sessionStorage.getItem(BOOKING_STORAGE_KEY);
    return text ? sanitise(JSON.parse(text)) : DEFAULT_SELECTION;
  } catch {
    return DEFAULT_SELECTION;
  }
}

let current: BookingSelection | null = null;
const listeners = new Set<() => void>();

function snapshot(): BookingSelection {
  if (current === null) current = load();
  return current;
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Merge a partial update, persist, and notify subscribers. */
export function updateBooking(patch: Partial<BookingSelection>): void {
  current = sanitise({ ...snapshot(), ...patch });
  try {
    window.sessionStorage.setItem(BOOKING_STORAGE_KEY, JSON.stringify(current));
  } catch {
    /* storage unavailable: keep in memory only */
  }
  listeners.forEach((fn) => fn());
}

export function resetBooking(): void {
  updateBooking({ ...DEFAULT_SELECTION });
}

/** `const [booking, update] = useBooking()` */
export function useBooking(): [BookingSelection, typeof updateBooking] {
  const state = useSyncExternalStore(subscribe, snapshot, () => DEFAULT_SELECTION);
  return [state, updateBooking];
}
