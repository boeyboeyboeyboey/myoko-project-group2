import { ACTIVITIES, PACKAGES, type PackageId } from "./booking";

export const NAV_LINKS = [
  { to: "/packages", label: "Packages", jp: "旅" },
  { to: "/return", label: "Return pass", jp: "再会" },
  { to: "/about", label: "About", jp: "道" },
] as const;

/** Home page sections, in order (hero is InkBleedHero; the rest live in pages/Home.tsx). */
export const HOME_SECTIONS = [
  { id: "hero", label: "Hero" },
  { id: "why", label: "Why Myoko in summer" },
  { id: "packages", label: "Packages" },
  { id: "return-pass", label: "Return pass" },
  { id: "trust", label: "How it works" },
  { id: "notes", label: "Notes" },
] as const;

export interface PackageContent {
  slug: PackageId;
  name: string;
  jp: string;
  inclusions: string[];
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
