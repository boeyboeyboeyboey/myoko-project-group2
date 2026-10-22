import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { prefersReducedMotion } from "../../lib/smoothScroll";
import { MAP_H, MAP_W, MERC, PREFECTURES } from "../../lib/journeyMapData";
import {
  CAM_MYOKO, CAM_WIDE, FINALE, JOURNEY_COPY, LEGS, SINGAPORE_POINT, STATIONS, TOTAL_MINUTES,
  formatMinutes, proj, type Cam, type Leg, type Mode, type Station,
} from "../../lib/journey";

gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin, MotionPathPlugin);

const SCROLL_UNIT_VH = 0.8; // one timeline unit = 80vh of scroll → 6 units ≈ 480vh
const TOTAL_UNITS = 6;

/* ---------- vehicle glyphs (24px grid, 1.5 stroke) ---------- */
function Glyph({ mode }: { mode: Mode }) {
  switch (mode) {
    case "plane":
      return <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />;
    case "train":
      return (
        <>
          <rect x="5" y="3" width="14" height="15" rx="3" />
          <path d="M8 7h8v5H8zM8 18l-2 3M16 18l2 3" />
          <circle cx="9" cy="15" r=".6" /><circle cx="15" cy="15" r=".6" />
        </>
      );
    case "shinkansen":
      return (
        <>
          <path d="M12 2.5c4 0 7 2.4 7 6.5v7.5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9c0-4.100 3-6.500 7-6.500z" />
          <path d="M8.500 7.500h7M8 18.500l-2 2.500M16 18.500l2 2.500" />
          <circle cx="9" cy="14.500" r=".6" /><circle cx="15" cy="14.500" r=".6" />
        </>
      );
    case "local":
      return (
        <>
          <rect x="4" y="4" width="16" height="14" rx="2" />
          <path d="M4 11h16M12 4v7M8 18l-2 3M16 18l2 3" />
          <circle cx="8" cy="14.500" r=".6" /><circle cx="16" cy="14.500" r=".6" />
        </>
      );
    case "bus":
      return (
        <>
          <rect x="4" y="3" width="16" height="15" rx="2.500" />
          <path d="M4 12h16M4 8h16M7 18v2.500M17 18v2.500" />
          <circle cx="8" cy="15" r=".6" /><circle cx="16" cy="15" r=".6" />
        </>
      );
  }
}

/* ---------- map station marker ---------- */
function StationMark({ s, id = s.id }: { s: Station; id?: string }) {
  const [x, y] = proj(s.at);
  const badge = s.stop !== undefined;
  const off = badge ? 18 : 12;
  const pos =
    s.side === "r" ? { x: off, y: 5, a: "start" } :
    s.side === "l" ? { x: -off, y: 5, a: "end" } :
    s.side === "t" ? { x: 0, y: -off - 3, a: "middle" } :
    { x: 0, y: off + 14, a: "middle" };
  return (
    <g className={`jm-st${badge ? " jm-st--stop" : ""}`} data-st={id} data-at={`${x.toFixed(1)},${y.toFixed(1)}`}>
      {badge ? (
        <>
          <circle className="jm-st__badge" r="11" />
          <text className="jm-st__num" y="5" textAnchor="middle">{s.stop}</text>
        </>
      ) : (
        <circle className={`jm-st__dot${s.alt ? " jm-st__dot--alt" : ""}`} r={s.alt ? 4 : 5} />
      )}
      <text className="jm-st__label" x={pos.x} y={pos.y} textAnchor={pos.a as "start" | "end" | "middle"}>
        {s.en}
        {s.jp && <tspan className="jm-st__jp" dx="7">{s.jp}</tspan>}
      </text>
    </g>
  );
}

/* ---------- cards ---------- */
function Stamp({ big = false }: { big?: boolean }) {
  return (
    <div className={`jc__stamp${big ? " jc__stamp--big" : ""}`} aria-hidden="true">
      <span className="jc__stamp-jp">済</span>
      <span className="jc__stamp-en">{JOURNEY_COPY.handled.toUpperCase()}</span>
    </div>
  );
}

function LegCard({ leg, i, isStatic }: { leg: Leg; i: number; isStatic: boolean }) {
  return (
    <article className={`jc${isStatic ? " jc--static" : ""}`} data-card={i}>
      <header className="jc__head">
        <span className="jc__num">{leg.n}</span>
        <span className="jc__mode">{leg.modeLabel}</span>
        <span className="jc__dur">{leg.duration}</span>
      </header>
      <p className="jc__route">{leg.route}</p>
      <div className="jc__body">
        <div className="jc__pain">
          <span className="jc__tag">{JOURNEY_COPY.friction}</span>
          <p className="jc__text">&ldquo;{leg.pain}&rdquo;</p>
          {leg.painSource && <span className="jc__src">{leg.painSource}</span>}
        </div>
        <div className="jc__fix">
          <span className="jc__tag jc__tag--ok">{JOURNEY_COPY.handled}</span>
          <p className="jc__text">{leg.fix}</p>
        </div>
      </div>
      <Stamp />
    </article>
  );
}

function BookingCard({ isStatic }: { isStatic: boolean }) {
  return (
    <article className={`jc jc--final${isStatic ? " jc--static" : ""}`} data-card="5">
      <p className="jc__tag">One booking</p>
      <ul className="jb__stats">
        {FINALE.stats.map((s) => (
          <li key={s.label} className="jb__stat">
            <span className="jb__n">{s.n}</span> <span className="jb__l">{s.label}</span>
          </li>
        ))}
      </ul>
      <p className="jb__result"><span aria-hidden="true">→ </span>{FINALE.result}</p>
      <Link to={FINALE.cta.to} className="jb__cta">{FINALE.cta.label} <span aria-hidden="true">→</span></Link>
      <p className="jb__note">{FINALE.note}</p>
    </article>
  );
}

/* ---------- main ---------- */
export default function Journey() {
  const [reduced] = useState(prefersReducedMotion);
  const rootRef = useRef<HTMLElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = rootRef.current, svg = svgRef.current;
    if (!root || !svg) return;

    const cam: Cam = { ...CAM_WIDE };
    let u = 1;
    const veh = { x: 0, y: 0 };
    const vehEl = svg.querySelector<SVGGElement>("[data-veh]");
    const marks = Array.from(svg.querySelectorAll<SVGGElement>("[data-at]"));

    const apply = () => {
      const h = (cam.w * MAP_H) / MAP_W;
      svg.setAttribute("viewBox", `${cam.cx - cam.w / 2} ${cam.cy - h / 2} ${cam.w} ${h}`);
      const r = svg.getBoundingClientRect();
      const scale = Math.min(r.width / cam.w, r.height / h) || 1;
      u = 1 / scale;
      svg.style.setProperty("--u", u.toFixed(5));
      for (const m of marks) {
        const [x, y] = (m.dataset.at as string).split(",");
        m.setAttribute("transform", `translate(${x} ${y}) scale(${u.toFixed(5)})`);
      }
      vehEl?.setAttribute("transform", `translate(${veh.x} ${veh.y}) scale(${u.toFixed(5)})`);
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(svg);

    if (reduced) {
      return () => ro.disconnect();
    }

    const KOKE = getComputedStyle(document.documentElement).getPropertyValue("--koke").trim() || "#4c7339";
    const PINK = getComputedStyle(document.documentElement).getPropertyValue("--nadeshiko").trim() || "#b8466e";
    const q = <T extends Element>(sel: string) => root.querySelector<T>(sel)!;
    const qa = <T extends Element>(sel: string) => Array.from(root.querySelectorAll<T>(sel));

    const ctx = gsap.context(() => {
      const stage = q<HTMLElement>(".journey__stage");
      const cards = LEGS.map((_, i) => q<HTMLElement>(`[data-card="${i}"]`));
      const finalCard = q<HTMLElement>('[data-card="5"]');
      const draw = LEGS.map((_, i) => q<SVGPathElement>(`[data-draw="${i}"]`));
      const shown = LEGS.map((_, i) => q<SVGPathElement>(`[data-route="${i}"]`));
      const raw = shown.map((p) => MotionPathPlugin.getRawPath(p));
      const glyphs = LEGS.map((_, i) => q<SVGGElement>(`[data-glyph="${i}"]`));
      const st = (id: string) => q<SVGGElement>(`[data-st="${id}"]`);
      const ticks = qa<HTMLElement>(".jstep__i");
      const seas = qa<SVGGElement>(".jm-sea");
      const stops = qa<SVGGElement>(".jm-st--stop");

      gsap.set(draw, { drawSVG: "0%" });
      gsap.set(cards.slice(1).concat(finalCard), { autoAlpha: 0 });
      gsap.set(qa(".jc__fix"), { opacity: 0 });
      gsap.set(qa(".jc__stamp"), { autoAlpha: 0 });
      gsap.set(vehEl, { opacity: 0 });
      gsap.set(glyphs, { opacity: 0 });
      gsap.set(qa(".jm-st:not([data-st='sin'])"), { opacity: 0 });
      gsap.set(qa(".jb__stat, .jb__result, .jb__cta, .jb__note"), { opacity: 0, y: 14 });

      const placeVeh = (i: number, p: number) => {
        const pt = MotionPathPlugin.getPositionOnPath(raw[i], p);
        veh.x = pt.x; veh.y = pt.y;
        vehEl?.setAttribute("transform", `translate(${veh.x} ${veh.y}) scale(${u.toFixed(5)})`);
      };

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: stage,
          start: "top top",
          end: () => `+=${window.innerHeight * SCROLL_UNIT_VH * TOTAL_UNITS}`,
          pin: true,
          scrub: 0.6,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      // Clock is derived from timeline time (not tweened) so it stays correct however the scrubber jumps.
      const paintClock = () => {
        const t = tl.time();
        let m = 0;
        LEGS.forEach((l, i) => { m += l.minutes * Math.min(1, Math.max(0, (t - (i + 0.2)) / 0.45)); });
        if (counterRef.current) counterRef.current.textContent = formatMinutes(m);
      };
      tl.eventCallback("onUpdate", paintClock);
      paintClock();

      const camTo = (from: Cam, to: Cam, at: number, dur: number) =>
        tl.fromTo(cam, { ...from }, { ...to, duration: dur, ease: "power2.inOut", onUpdate: apply, immediateRender: false }, at);

      tl.fromTo(st("sin"), { opacity: 0 }, { opacity: 1, duration: 0.08 }, 0);

      LEGS.forEach((_leg, i) => {
        const s = i;
        const proxy = { p: 0 };

        // card swap
        if (i > 0) {
          tl.fromTo(cards[i], { autoAlpha: 0, y: 22 }, { autoAlpha: 1, y: 0, duration: 0.12, ease: "power3.out" }, s + 0.04);
        }

        // route + vehicle
        tl.fromTo(draw[i], { drawSVG: "0%" }, { drawSVG: "100%", duration: 0.45 }, s + 0.2);
        tl.fromTo(proxy, { p: 0 }, { p: 1, duration: 0.45, onUpdate: () => placeVeh(i, proxy.p) }, s + 0.2);
        tl.to(glyphs[i], { opacity: 1, duration: 0.02 }, s + 0.18);
        if (i > 0) tl.fromTo(glyphs[i - 1], { opacity: 1 }, { opacity: 0, duration: 0.02, immediateRender: false }, s + 0.18);
        if (i === 0) tl.fromTo(vehEl, { opacity: 0 }, { opacity: 1, duration: 0.02, immediateRender: false }, s + 0.18);

        // stamp + swap pain -> fix
        tl.fromTo(
          qa<HTMLElement>(".jc__stamp")[i],
          { autoAlpha: 0, scale: 2.5, rotation: -26 },
          { autoAlpha: 1, scale: 1, rotation: -7, duration: 0.06, ease: "power4.in" },
          s + 0.7,
        );
        tl.fromTo(cards[i], { scale: 1 }, { scale: 0.985, duration: 0.025, ease: "power2.out", immediateRender: false }, s + 0.76);
        tl.fromTo(cards[i], { scale: 0.985 }, { scale: 1, duration: 0.07, ease: "power2.out", immediateRender: false }, s + 0.785);
        tl.to(cards[i].querySelector(".jc__pain"), { opacity: 0, duration: 0.08 }, s + 0.74);
        tl.to(cards[i].querySelector(".jc__fix"), { opacity: 1, duration: 0.1 }, s + 0.76);
        tl.to(shown[i], { stroke: KOKE, duration: 0.08 }, s + 0.72);
        tl.to(ticks[i], { backgroundColor: KOKE, borderColor: KOKE, duration: 0.05 }, s + 0.72);

        // card out (except last leg, which hands to the finale)
        tl.fromTo(cards[i], { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y: -16, duration: 0.07, ease: "power2.in", immediateRender: false }, s + 0.93);
      });

      // station reveals (destination appears as the vehicle arrives)
      const reveal = (id: string, at: number) => tl.fromTo(st(id), { opacity: 0 }, { opacity: 1, duration: 0.06 }, at);
      reveal("narita", 0.62);
      reveal("haneda", 1.2);
      reveal("tokyo", 1.62);
      reveal("nagano", 2.62);
      reveal("myoko", 3.62);
      tl.fromTo(stops, { opacity: 0 }, { opacity: 1, duration: 0.05, stagger: 0.06 }, 4.2);

      // camera: wide → Myoko close-up for the shuttle loop
      camTo(CAM_WIDE, CAM_MYOKO, 3.82, 0.5);
      tl.fromTo(seas, { opacity: 1 }, { opacity: 0, duration: 0.2, immediateRender: false }, 3.82);

      // finale: back out, legs unify into one thread, one booking card
      tl.fromTo(vehEl, { opacity: 1 }, { opacity: 0, duration: 0.05, immediateRender: false }, 4.98);
      tl.to(stops, { opacity: 0, duration: 0.1 }, 4.95);
      camTo(CAM_MYOKO, CAM_WIDE, 5.0, 0.6);
      tl.fromTo(seas, { opacity: 0 }, { opacity: 1, duration: 0.2, immediateRender: false }, 5.4);
      tl.fromTo(shown, { stroke: KOKE }, { stroke: PINK, duration: 0.25, immediateRender: false }, 5.05);
      tl.fromTo(svg, { "--rw": 1 }, { "--rw": 2.2, duration: 0.25, immediateRender: false }, 5.05);
      tl.fromTo(ticks, { backgroundColor: KOKE, borderColor: KOKE }, { backgroundColor: PINK, borderColor: PINK, duration: 0.1, immediateRender: false }, 5.05);
      
      tl.fromTo(finalCard, { autoAlpha: 0, y: 22 }, { autoAlpha: 1, y: 0, duration: 0.12, ease: "power3.out" }, 5.1);
      tl.to(qa(".jb__stat"), { opacity: 1, y: 0, duration: 0.08, stagger: 0.07, ease: "power3.out" }, 5.2);
      tl.to(qa(".jb__result"), { opacity: 1, y: 0, duration: 0.1, ease: "power3.out" }, 5.45);
      tl.to(qa(".jb__cta, .jb__note"), { opacity: 1, y: 0, duration: 0.1, stagger: 0.04, ease: "power3.out" }, 5.58);
      tl.to({}, { duration: 0.001 }, TOTAL_UNITS - 0.001);
    }, root);

    return () => {
      ctx.revert();
      ro.disconnect();
    };
  }, [reduced]);

  const [lakeX, lakeY] = proj(JOURNEY_COPY.lakeNojiri);
  const sin = { id: "sin", en: JOURNEY_COPY.singapore.en, at: [0, 0], side: "r" } as Station;
  const sinG = (
    <g className="jm-st" data-st="sin" data-at={`${SINGAPORE_POINT[0].toFixed(1)},${SINGAPORE_POINT[1].toFixed(1)}`}>
      <circle className="jm-st__dot jm-st__dot--alt" r="4" />
      <text className="jm-st__label" x="12" y="5">
        {sin.en}
        <tspan className="jm-st__jp" dx="7">SIN</tspan>
      </text>
    </g>
  );

  return (
    <section
      ref={rootRef}
      id="journey"
      className={`journey${reduced ? " journey--static" : ""}`}
      aria-labelledby="journey-title"
    >
      {/* rough-edged ink for the hanko stamps */}
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
        <filter id="jm-hanko" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="2.2" />
        </filter>
      </svg>

      <div className="journey__stage">
        <header className="journey__head">
          <span className="eyebrow">{JOURNEY_COPY.eyebrow}</span>
          <h2 id="journey-title" className="journey__title">{JOURNEY_COPY.title}</h2>
          <span className="jp-vertical journey__jp" aria-hidden="true">道</span>
        </header>

        <div className="journey__main">
          <div className="journey__map">
            <svg
              ref={svgRef}
              className="jm"
              viewBox={`0 0 ${MAP_W} ${MAP_H}`}
              role="img"
              aria-label="Stylised map of the route from Singapore to Tokyo, Nagano and Myoko-Kogen, with a proposed PCG shuttle loop at the end."
            >
              <defs>
                <mask id="jm-fmask" maskUnits="userSpaceOnUse" x="-200" y="-200" width="1600" height="1400">
                  <path data-draw="0" d={LEGS[0].d} className="jm-maskpath" />
                </mask>
              </defs>

              <g className="jm-land">
                {PREFECTURES.map((p) => <path key={p.name} d={p.d} />)}
              </g>
              <ellipse
                className="jm-lake"
                cx={lakeX} cy={lakeY}
                rx={0.0085 * (Math.PI / 180) * MERC.k} ry={0.0062 * (Math.PI / 180) * MERC.k * 1.25}
                transform={`rotate(-20 ${lakeX} ${lakeY})`}
              />

              {JOURNEY_COPY.seas.map((s) => {
                const [x, y] = proj(s.at);
                return (
                  <g key={s.id} className="jm-sea" data-at={`${x.toFixed(1)},${y.toFixed(1)}`}>
                    <text textAnchor="middle">{s.text}</text>
                  </g>
                );
              })}

              <g className="jm-routes">
                {LEGS.map((leg, i) =>
                  i === 0 ? (
                    <path key={i} data-route="0" d={leg.d} className="jm-route jm-route--dashed" mask="url(#jm-fmask)" />
                  ) : (
                    <path key={i} data-route={i} data-draw={i} d={leg.d} className="jm-route" />
                  ),
                )}
              </g>

              {sinG}
              {STATIONS.map((s) => <StationMark key={s.id} s={s} />)}

              <g data-veh className="jm-veh">
                <circle r="17" className="jm-veh__disc" />
                {LEGS.map((l, i) => (
                  <g key={l.mode} data-glyph={i} className="jm-glyph" transform="translate(-12 -12)">
                    <Glyph mode={l.mode} />
                  </g>
                ))}
              </g>
            </svg>
          </div>

          <div className="journey__panel">
            <div className="jclock" aria-hidden="true">
              <span className="eyebrow">{JOURNEY_COPY.counterLabel}</span>
              <span className="jclock__t" ref={counterRef}>
                {reduced ? formatMinutes(TOTAL_MINUTES) : formatMinutes(0)}
              </span>
            </div>
            <div className="jstep" aria-hidden="true">
              {LEGS.map((l) => <span key={l.n} className="jstep__i" />)}
            </div>
            {reduced ? (
              <ol className="jlist">
                {LEGS.map((l, i) => <li key={l.n}><LegCard leg={l} i={i} isStatic /></li>)}
                <li><BookingCard isStatic /></li>
              </ol>
            ) : (
              <div className="jstack">
                {LEGS.map((l, i) => <LegCard key={l.n} leg={l} i={i} isStatic={false} />)}
                <BookingCard isStatic={false} />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
