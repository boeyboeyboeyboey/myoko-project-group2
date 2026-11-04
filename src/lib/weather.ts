// Live temperatures from Open-Meteo (free, no key; CC BY 4.0, attribution shown in the UI).
export interface PlaceTemp { place: string; tempC: number }

// Order must match the latitude/longitude lists in URL below. Myoko = Lime Resort area.
const PLACES = ["Myoko", "Singapore", "Tokyo"] as const;
const URL =
  "https://api.open-meteo.com/v1/forecast?latitude=36.87,1.35,35.68&longitude=138.17,103.82,139.69&current=temperature_2m&timezone=auto";
const CACHE_KEY = "myoko:weather:v1";
const CACHE_MS = 15 * 60 * 1000;
const TIMEOUT_MS = 4000;

/** Parses the multi-location response (an array); returns null if anything is missing or non-numeric. */
export function parseTemps(json: unknown): PlaceTemp[] | null {
  if (!Array.isArray(json) || json.length !== PLACES.length) return null;
  const out: PlaceTemp[] = [];
  for (let i = 0; i < PLACES.length; i++) {
    const t = (json[i] as { current?: { temperature_2m?: unknown } } | null)?.current?.temperature_2m;
    if (typeof t !== "number" || !Number.isFinite(t)) return null;
    out.push({ place: PLACES[i], tempC: Math.round(t) });
  }
  return out;
}

function readCache(now: number): PlaceTemp[] | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { t, data } = JSON.parse(raw) as { t: number; data: unknown };
    if (typeof t !== "number" || now - t > CACHE_MS || now < t) return null;
    if (!Array.isArray(data) || data.length !== PLACES.length) return null;
    return data as PlaceTemp[];
  } catch { return null; }
}

export async function fetchCurrentTemps(): Promise<PlaceTemp[] | null> {
  const cached = readCache(Date.now());
  if (cached) return cached;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(URL, { signal: ctl.signal });
    if (!res.ok) return null;
    const data = parseTemps(await res.json());
    if (data) {
      try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), data })); } catch { /* storage unavailable */ }
    }
    return data;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
