/** Journey section data (DESIGN.md §4.2). Edit copy here. All times are approximate. */
import { MAP_H, MAP_W, MERC } from "./journeyMapData";

export type LatLon = [lat: number, lon: number];

/** Lat/lon → map units (same Mercator as the generated land paths). */
export function proj([lat, lon]: LatLon): [number, number] {
  const r = Math.PI / 180;
  return [MERC.tx + MERC.k * lon * r, MERC.ty - MERC.k * Math.log(Math.tan(Math.PI / 4 + (lat * r) / 2))];
}

/** Catmull-Rom through points → cubic bezier path string (closed loops supported). */
export function smoothPath(pts: LatLon[], closed = false): string {
  const p = pts.map(proj);
  const n = p.length;
  const at = (i: number) => (closed ? p[(i + n) % n] : p[Math.min(n - 1, Math.max(0, i))]);
  let d = `M${p[0][0].toFixed(1)} ${p[0][1].toFixed(1)}`;
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d + (closed ? "Z" : "");
}

export type LabelSide = "r" | "l" | "t" | "b";

export interface Station {
  id: string;
  en: string;
  jp?: string;
  at: LatLon;
  side: LabelSide;
  /** minor stops get a number badge; their text label is hidden on narrow screens */
  stop?: number;
  /** hollow dot (alternative airport) */
  alt?: boolean;
  /** coordinates are approximate */
  approx?: boolean;
}

// Lime Resort is nudged slightly west of Akakura so it does not sit on top of Imori Pond (approx. position).
export const STATIONS: Station[] = [
  { id: "narita", en: "Narita", jp: "成田", at: [35.773, 140.387], side: "r" },
  { id: "haneda", en: "Haneda", jp: "羽田", at: [35.549, 139.78], side: "r", alt: true },
  { id: "tokyo", en: "Tokyo", jp: "東京", at: [35.681, 139.767], side: "l" },
  { id: "nagano", en: "Nagano", jp: "長野", at: [36.643, 138.189], side: "l" },
  { id: "myoko", en: "Myoko-Kogen", jp: "妙高高原", at: [36.88, 138.204], side: "b" },
  { id: "madarao", en: "Madarao", at: [36.857, 138.3], side: "t", stop: 1, approx: true },
  { id: "nojiri", en: "Lake Nojiri", at: [36.826, 138.214], side: "r", stop: 2 },
  { id: "suginohara", en: "Suginohara", at: [36.866, 138.13], side: "b", stop: 3, approx: true },
  { id: "lime", en: "Lime Resort Myoko", at: [36.886, 138.158], side: "l", stop: 4, approx: true },
  { id: "imori", en: "Imori Pond", at: [36.888, 138.172], side: "t", stop: 5 },
];
export const stationById = (id: string) => STATIONS.find((s) => s.id === id)!;

/** Where the camera looks. cx/cy in map units, w = visible width in map units. */
export interface Cam { cx: number; cy: number; w: number }
export const CAM_WIDE: Cam = { cx: 560, cy: MAP_H / 2, w: MAP_W };
const myokoC = proj([36.857, 138.215]);
export const CAM_MYOKO: Cam = { cx: myokoC[0], cy: myokoC[1], w: 0.25 * (Math.PI / 180) * MERC.k };

export type Mode = "plane" | "train" | "shinkansen" | "local" | "bus";

export interface Leg {
  n: string;
  mode: Mode;
  modeLabel: string;
  duration: string;
  minutes: number;
  route: string;
  pain: string;
  painSource?: string;
  fix: string;
  /** map path (pre-computed from lat/lon) */
  d: string;
  dashed?: boolean;
  closed?: boolean;
}

const SIN_ENTRY: LatLon = [33.9, 136.45];

export const LEGS: Leg[] = [
  {
    n: "01", mode: "plane", modeLabel: "Flight", duration: "approx. 7 h", minutes: 420,
    route: "Singapore (SIN) → Tokyo, Narita or Haneda",
    pain: "Which airport? Which ticket?",
    fix: "Flights matched to your package dates.",
    d: smoothPath([SIN_ENTRY, [34.25, 137.8], [34.8, 139.25], [35.773, 140.387]]),
    dashed: true,
  },
  {
    n: "02", mode: "train", modeLabel: "Narita Express", duration: "approx. 1 h", minutes: 60,
    route: "Narita → Tokyo Station (Haneda → Tokyo approx. 30 min)",
    pain: "Luggage through Tokyo Station at rush hour.",
    fix: "Luggage forwarded ahead to your hotel (takkyubin).",
    d: smoothPath([[35.773, 140.387], [35.76, 140.2], [35.65, 140.03], [35.665, 139.88], [35.681, 139.767]]),
  },
  {
    n: "03", mode: "shinkansen", modeLabel: "Hokuriku Shinkansen", duration: "approx. 1 h 20", minutes: 80,
    route: "Tokyo → Nagano",
    pain: "Reserved seats sell out in peak weeks.",
    fix: "Seats reserved for you.",
    d: smoothPath([[35.681, 139.767], [35.906, 139.624], [36.322, 139.012], [36.343, 138.634], [36.396, 138.255], [36.643, 138.189]]),
  },
  {
    n: "04", mode: "local", modeLabel: "Shinano Railway", duration: "approx. 45 min", minutes: 45,
    route: "Nagano → Myoko-Kogen (Kita-Shinano Line)",
    pain: "Infrequent local trains; signage mostly Japanese.",
    fix: "Step-by-step guide in English, plus a host who meets you.",
    d: smoothPath([[36.643, 138.189], [36.73, 138.222], [36.81, 138.213], [36.88, 138.204]]),
  },
  {
    n: "05", mode: "bus", modeLabel: "Proposed PCG shuttle", duration: "approx. 15–30 min", minutes: 20,
    route: "Myoko-Kogen Stn → 1 Madarao · 2 Lake Nojiri · 3 Suginohara · 4 Lime Resort · 5 Imori Pond",
    pain: "Few buses, no evening service, taxis scarce.",
    painSource: "From our local interviews",
    fix: "PCG shuttle on a fixed loop: hotels, lake, trails.",
    d: smoothPath(
      [[36.88, 138.204], [36.857, 138.3], [36.826, 138.214], [36.866, 138.13], [36.886, 138.158], [36.888, 138.172]],
      true,
    ),
  },
];

export const TOTAL_MINUTES = LEGS.reduce((a, l) => a + l.minutes, 0);

export const FINALE = {
  stats: [
    { n: "4", label: "transfers" },
    { n: "2", label: "languages" },
    { n: "10 h", label: "door to door" },
  ],
  result: "1 booking",
  note: "Times are approximate and exclude waiting between legs. The shuttle is a proposal; schedules are illustrative.",
  cta: { label: "See packages", to: "/packages" },
};

export const JOURNEY_COPY = {
  eyebrow: "04 —",
  title: "The journey, handled",
  counterLabel: "In transit, approx.",
  friction: "The friction",
  handled: "Handled",
  singapore: { en: "Singapore", sub: "SIN · flying in" },
  seas: [
    { id: "sea-japan", text: "Sea of Japan", at: [37.55, 137.0] as LatLon },
    { id: "sea-pacific", text: "Pacific Ocean", at: [34.5, 140.9] as LatLon },
  ],
  lakeNojiri: [36.826, 138.214] as LatLon,
};

export const SINGAPORE_POINT = proj(SIN_ENTRY);

export function formatMinutes(m: number): string {
  const r = Math.round(m);
  return `${Math.floor(r / 60)} h ${String(r % 60).padStart(2, "0")} min`;
}
