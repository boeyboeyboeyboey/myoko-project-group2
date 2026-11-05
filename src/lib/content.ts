import { ACTIVITIES, PACKAGES, type PackageId } from "./booking";

export const NAV_LINKS = [
  { to: "/why", label: "Why Myoko", jp: "夏" },
  { to: "/packages", label: "Packages", jp: "旅" },
  { to: "/return", label: "Winter voucher", jp: "再会" },
  { to: "/about", label: "About", jp: "道" },
] as const;

/** Home page sections, in order (hero is InkBleedHero; the rest live in pages/Home.tsx). */
export const HOME_SECTIONS = [
  { id: "hero", label: "Hero" },
  { id: "return-pass", label: "Winter voucher" },
  { id: "packages", label: "Packages" },
] as const;

export interface PackagePhotoInfo {
  /** Public folder and file stem; files are <dir>/<name>-{480,800,1200}.{webp,jpg}. */
  dir: string;
  name: string;
  w: number;
  h: number;
  alt: string;
  credit: string;
}

export const SHINANO_ALT = "Coming via Nagano? Take the Shinano Railway to Myoko-Kogen; we pick you up there (proposed).";

const PHOTOS: Record<PackageId, PackagePhotoInfo> = {
  active: { dir: "home", name: "nojiri-kayaks", w: 1200, h: 900, alt: "Kayaks on Lake Nojiri", credit: "Photo: Myoko in Colour team" },
  slow: { dir: "packages", name: "slow", w: 2816, h: 2112, alt: "Lake Nojiri in summer", credit: "Photo: RESPITE, public domain" },
  best: { dir: "packages", name: "best", w: 3840, h: 2560, alt: "Imori-ike pond with Mt Myoko", credit: "Photo: TANAKA Juuyoh, CC BY 2.0" },
};

/** Day-card photos by activity id. Add a real photo for an activity as one entry here. */
export const ACTIVITY_PHOTOS: Partial<Record<string, PackagePhotoInfo>> = {
  kayak: PHOTOS.active,
  sup: PHOTOS.slow, // Lake Nojiri, where the paddle runs
  cruise: PHOTOS.slow,
  forest: PHOTOS.best,
  trek: PHOTOS.best,
};

const STATION_PHOTO: PackagePhotoInfo = {
  dir: "itinerary", name: "station", w: 1920, h: 1440,
  alt: "Hokuriku Shinkansen at Joetsu-Myoko Station", credit: "Photo: Rebirth10, CC BY-SA 4.0",
};
const STATION_OUT_PHOTO: PackagePhotoInfo = {
  dir: "itinerary", name: "station-out", w: 1600, h: 1067,
  alt: "Joetsu-Myoko Station from the forecourt", credit: "Photo: くろふね, CC BY 4.0",
};
const NAENA_PHOTO: PackagePhotoInfo = {
  dir: "home", name: "naena-falls", w: 1200, h: 1600, alt: "Naena Falls in the forest", credit: "Photo: Myoko in Colour team",
};
const PHOTO_POOL = [PHOTOS.active, PHOTOS.slow, PHOTOS.best, NAENA_PHOTO, STATION_PHOTO];

/**
 * One photo per itinerary day, never repeating while unused photos remain.
 * Arrival shows the Shinkansen platform, departure the station building; activity days use their first picked activity's photo.
 * `days[i]` holds that day's activity ids in slot order.
 */
export function dayPhotos(slug: PackageId, days: string[][]): PackagePhotoInfo[] {
  const used = new Set<string>();
  return days.map((ids, i) => {
    const wanted = ids.length > 0
      ? [...ids.map((id) => ACTIVITY_PHOTOS[id]).filter((x): x is PackagePhotoInfo => !!x), PHOTOS[slug]]
      : [i === 0 ? STATION_PHOTO : STATION_OUT_PHOTO];
    const pick = [...wanted, ...PHOTO_POOL].find((ph) => !used.has(ph.name)) ?? wanted[0];
    used.add(pick.name);
    return pick;
  });
}

export interface PackageContent {
  slug: PackageId;
  name: string;
  jp: string;
  inclusions: string[];
  /** Short inclusions for cards. */
  card: string[];
  photo: PackagePhotoInfo;
  stay: { property: string; status: string; note: string };
}

const JP: Record<PackageId, string> = { active: "動", slow: "静", best: "極" };

const STAY = {
  property: "Lime Resort Myoko",
  status: "Proposed stay; green-season rate not yet published",
  note: "Priced from a comparable Akakura room rate until Lime Resort Myoko publishes its own.",
};

/** Presentation content for the three packages. Prices and activity logic come from lib/booking only. */
export const PACKAGE_CONTENT: PackageContent[] = PACKAGES.map((p) => ({
  slug: p.id,
  name: p.name,
  jp: JP[p.id],
  card: ["English guide", "Shuttle (proposed)", "Lime Resort stay"],
  photo: PHOTOS[p.id],
  inclusions: [
    "English lead guide, every day",
    "Shuttle from Joetsu-Myoko Station (proposed)",
    `${p.nights} nights at Lime Resort Myoko, breakfast`,
    ...p.themeActivities.map((id) => ACTIVITIES.find((a) => a.id === id)?.name ?? id),
  ],
  stay: STAY,
}));

export const DISCLAIMER =
  "Prototype for an SMU IDIS201 student proposal to Patience Capital Group. Prices are illustrative; partners and the station shuttle are proposed.";
