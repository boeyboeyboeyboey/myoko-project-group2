# Myoko in Colour — Design Brief

Prototype booking + storytelling site for the IDIS201 final pitch to Patience Capital Group (PCG), 6 Nov 2026.
Audience of the *site*: repeat winter visitors to Myoko (Singapore-based lead segment; also TW/KR/MY/AU).
Audience of the *demo*: PCG executives and the professor. It must feel like a premium product launch, not a student project.

## 1. Core concept — "You've seen Myoko in white."

Repeat winter visitors only know Myoko as snow. The site opens in near-monochrome (snow, fog, ink) and **colour bleeds in as you scroll**, like ink through washi paper, until the page is fully saturated in the green season: forest and paddy greens, lake blues, wildflower accents. The transition *is* the pitch. Source: the team's own field reaction — "like a colourblind person seeing colour for the first time."

Supporting ideas carried through every section:
- **"We handle the journey."** Getting to and around Myoko is the #1 pain point; the site turns 4 transfers into 1 booking.
- **PCG ecosystem.** Stay at PCG properties, ride the PCG shuttle, book vetted local partners.
- **Honest sustainability.** Every claim is specific, sourced and checkable (module requirement: no greenwashing).

## 2. Information architecture

| Route | Purpose |
|---|---|
| `/` | Scroll story (sections below) |
| `/packages` | Compare 3 tiers, pick dates/duration/pax |
| `/packages/:tier` | Itinerary, inclusions, activity picker (Guided/All-inclusive), price |
| `/return` | Winter-guest return pass (enter code → voucher reveal) |
| `/book` | Demo booking review + confirmation (no payment, no personal data) |
| `/about` | Sources, photo credits, methodology, disclaimers |

### Home scroll story
1. **Hero (monochrome).** Full-bleed winter clip/photo, huge serif headline "You've seen Myoko in white." Subtle snowfall particles. Scroll cue.
2. **Bloom.** Pinned section: colour spreads organically across the image as it crossfades winter → the green season. Headline swaps to "Now see it in colour." Page palette transitions from grey tokens to colour tokens.
3. **Why green season.** 3–4 editorial panels (lake, forest, rice terraces, food) with short local quotes from interviews (speaker, role).
4. **The journey.** Pinned, scroll-scrubbed animated map (see §4). Ends: "4 transfers, 2 languages, 0 buses → 1 booking."
5. **Packages teaser.** Three tier cards with hover depth; CTA to `/packages`.
6. **Return pass teaser.** "Skied with us? Your green-season pass is waiting." → `/return`.
7. **Local partners.** Real operators interviewed (zipline, SUP, Myoko Connect, kayaking, Kanzuri, coffee) as "proposed partners" with portraits/footage.
8. **Impact, honestly.** Shuttle vs taxi/rental-car CO₂ per passenger (sourced), small-group caps, spread of visitors off-peak. Footnoted.
9. **Footer.** Prototype disclaimer, sources link.

## 3. Visual system

**Mood:** Japanese editorial magazine × luxury hotel launch. Big type, generous whitespace, asymmetric grids, restraint. Motion is cinematic and purposeful, never decorative noise.

**Type (Google Fonts, OFL):**
- Display: *Instrument Serif* (headlines, numerals, italic accents)
- Text/UI: *Inter* (variable)
- Japanese accents: *Shippori Mincho* (vertical place names, section kanji e.g. 紅葉, 湖, 道)

**Colour tokens** — two states, interpolated by scroll (`--bloom` 0→1):
- Winter: `--snow #F3F2EE`, `--fog #D9D8D3`, `--slate #8A8C8E`, `--ink #16181A`
- Green season (primary accent = moss): `--koke #4C7339` (moss), `--wakaba #7FA33A` (fresh leaf), `--nojiri #2D6A8A` (lake), `--nadeshiko #B8466E` (wildflower pink, highlights only), `--ine #D7A93B` (rice gold), `--washi #FAF6EE`
- Text always `--ink` on light; contrast ≥ 4.5:1.

**Layout:** 12-col grid, max 1440px, 16px gutters on mobile. Section padding clamp(80px, 12vw, 200px).

**Signature details:** film-grain overlay (subtle), thin hairline rules, vertical Japanese labels in margins, numbered sections (01 — 09), custom cursor dot on desktop only.

## 4. Signature interactions

1. **Ink-bleed colour reveal (hero → bloom).** WebGL fragment shader: grayscale and colour versions of the same image, revealed through animated fractal-noise threshold driven by scroll progress. Fallback: CSS `filter: saturate()` + mask. Lightweight (OGL or raw WebGL, no three.js needed).
2. **Journey map.** Stylised SVG of Japan (Natural Earth, public domain). Scroll-scrubbed with GSAP ScrollTrigger + MotionPath + DrawSVG:
   Singapore → (flight arc) → Narita/Haneda → Tokyo Stn → Hokuriku Shinkansen → Nagano → Shinano Railway → Myoko-Kogen Stn → PCG shuttle loop (Lime Resort, Madarao, Suginohara, activity stops).
   Each leg: duration, a pain-point card ("Luggage up 3 flights of stairs", "Last bus 17:10") that gets stamped **HANDLED** with what the package does. Final frame collapses all legs into one booking card.
3. **Return-pass reveal.** Enter demo code (e.g. `MADARAO-2026`) → ticket flips in 3D (CSS 3D transform) revealing personalised voucher, discount and suggested dates; confetti of maple leaves.
4. **Smooth scroll.** Lenis.

**Motion rules:** ease `power3.out`/`expo.out`; 400–900ms UI, scroll-scrubbed for story. `prefers-reduced-motion`: no scrubbing/particles, instant colour state, static map with all legs shown.

## 5. Tech

- Vite + React 19 + TypeScript, react-router (BrowserRouter; `vercel.json` SPA rewrite)
- GSAP 3 (+ ScrollTrigger, MotionPathPlugin, DrawSVGPlugin — free since 2025), Lenis, OGL (or raw WebGL) for the shader
- Plain CSS with custom properties (no Tailwind) — full control for editorial layout
- Ported from old proposal repo: pricing/date/clash logic (`core.js`) + tests, photo-credit structure
- Deploy: Vercel (free Hobby) from GitHub `main`
- State: in-memory + sessionStorage only; no backend, no payment, no personal data
- Performance budget: LCP < 2.5s on desktop; videos ≤ 4MB each, muted, `playsinline`, poster images; lazy-load below fold

## 6. Content rules

- Prices, dates, shuttle timetable, vouchers are **illustrative** and labelled as such.
- PCG properties shown with real status (Lime Resort MGallery — opening winter 2026; Madarao MGallery — reopening 2027; Six Senses — in development).
- Partners labelled "proposed partner"; quotes attributed with role and date.
- Every sustainability number has a footnote link on `/about`.
- All third-party assets recorded in `CREDITS.md` with source + licence; prefer team's own footage/photos.

## 7. Build stages (each reviewed before the next)

1. Scaffold, tokens, fonts, layout shell, routing, Lenis — **pass:** builds, routes render, tokens visible.
2. Hero + bloom shader — **pass:** smooth 60fps scroll on desktop, reduced-motion fallback works.
3. Journey map — **pass:** all legs animate in order, readable on mobile.
4. Packages + package detail + booking (port core logic + tests) — **pass:** tests pass, totals correct.
5. Return pass — **pass:** valid/invalid codes, flip animation, voucher applied in booking.
6. Content: quotes, partners, impact section, about/credits.
7. Visual QA (desktop + mobile), performance pass, deploy.
