/** --bloom (0 winter → 1 green season). Single writer so later scroll code and the dev control share it. */
export function setBloom(value: number) {
  const v = Math.min(1, Math.max(0, value));
  document.documentElement.style.setProperty("--bloom", v.toFixed(3));
}

export function getBloom(): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--bloom");
  return parseFloat(raw) || 0;
}

/** Reads ?bloom=0.5 (dev only) */
export function bloomFromQuery(): number | null {
  const raw = new URLSearchParams(window.location.search).get("bloom");
  if (raw === null) return null;
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : null;
}
