// Winter-guest return pass: pure code lookup, no personal data.
// PROTOTYPE: no real codes or programme exist. The 10% rate is an illustrative assumption.

export interface ReturnPass {
  code: string;
  /** Fraction in (0, 1]. */
  discount: number;
  /** What the winter ticket was (shown on the ticket front). */
  winterTicket: string;
  resort: string;
}

export const DEMO_PASSES: readonly ReturnPass[] = [
  { code: 'MADARAO-2026', discount: 0.1, resort: 'Madarao Mountain Resort', winterTicket: 'Winter 2026–27 season ticket' },
  { code: 'SUGINOHARA-2026', discount: 0.1, resort: 'Suginohara', winterTicket: 'Winter 2026–27 season ticket' },
  { code: 'MADARAO-4827', discount: 0.1, resort: 'Madarao Mountain Resort', winterTicket: 'Winter 2026–27 season ticket' },
];

export type RedeemResult =
  | { ok: true; pass: ReturnPass }
  | { ok: false; reason: 'empty' | 'format' | 'unknown' };

/** Uppercases; treats whitespace, dashes and underscores as one separator. */
export function normaliseCode(input: string): string {
  return input.trim().toUpperCase().replace(/[\s\-_‐-―−]+/g, '-');
}

export function redeemPass(input: string): RedeemResult {
  const code = normaliseCode(input);
  if (!code) return { ok: false, reason: 'empty' };
  if (!/^[A-Z]{3,20}-\d{4}$/.test(code)) return { ok: false, reason: 'format' };
  const pass = DEMO_PASSES.find((p) => p.code === code);
  return pass ? { ok: true, pass } : { ok: false, reason: 'unknown' };
}
