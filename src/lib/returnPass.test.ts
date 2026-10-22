import { describe, expect, test } from 'vitest';
import { DEMO_PASSES, redeemPass } from './returnPass';

describe('redeemPass', () => {
  test('valid codes redeem for 10%', () => {
    for (const p of DEMO_PASSES) {
      const r = redeemPass(p.code);
      expect(r.ok && r.pass.discount).toBe(0.1);
    }
  });
  test('normalises case, whitespace and dashes', () => {
    for (const s of ['madarao 2026', '  Madarao-2026 ', 'MADARAO--2026', 'madarao_2026', 'madarao–2026']) {
      const r = redeemPass(s);
      expect(r.ok && r.pass.code).toBe('MADARAO-2026');
    }
  });
  test('unknown but well-formed code', () => {
    expect(redeemPass('HAKUBA-2026')).toEqual({ ok: false, reason: 'unknown' });
  });
  test('empty input', () => {
    expect(redeemPass('')).toEqual({ ok: false, reason: 'empty' });
    expect(redeemPass('  - ')).toEqual({ ok: false, reason: 'format' });
    expect(redeemPass('   ')).toEqual({ ok: false, reason: 'empty' });
  });
  test('malformed input', () => {
    for (const s of ['MADARAO', '2026', 'MADARAO-26', '<script>', 'MADARAO-2026-X']) {
      expect(redeemPass(s)).toEqual({ ok: false, reason: 'format' });
    }
  });
});
