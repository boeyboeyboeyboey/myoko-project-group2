import { useCallback, useId, useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { prefersReducedMotion } from "../../lib/smoothScroll";
import "../../styles/route.css";

gsap.registerPlugin(DrawSVGPlugin, MotionPathPlugin);

type Pt = { x: number; y: number };
interface Stop { id: string; name: string; pt: Pt; change?: boolean }
interface Seg { id: string; label: string }

const TODAY_STOPS = [
  { id: "t0", name: "Tokyo" },
  { id: "t1", name: "Nagano", change: true },
  { id: "t2", name: "Myoko-Kogen" },
  { id: "t3", name: "Hotel" },
];
const TODAY_SEGS: Seg[] = [
  { id: "ts0", label: "Shinkansen" },
  { id: "ts1", label: "Shinano Railway · 40–50 min" },
  { id: "ts2", label: "Pickup / taxi" },
];
const PKG_STOPS = [
  { id: "p0", name: "Tokyo" },
  { id: "p1", name: "Joetsu-Myoko" },
  { id: "p2", name: "Lime Resort Myoko" },
];
const PKG_SEGS: Seg[] = [
  { id: "ps0", label: "Hakutaka, direct · about 2h" },
  { id: "ps1", label: "PCG shuttle (proposed)" },
];

const ARIA =
  "Route diagram. Today: Tokyo by Shinkansen to Nagano, change to the Shinano Railway to Myoko-Kogen, then pickup or taxi to the hotel; 3 changes. With a package: Tokyo on the Hakutaka direct to Joetsu-Myoko, then the proposed PCG shuttle to Lime Resort Myoko; 1 change, shuttle waiting.";

/** Cumulative length fractions along a polyline through the points. */
function fractions(pts: Pt[]): number[] {
  const d = [0];
  for (let i = 1; i < pts.length; i++) d.push(d[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  return d.map((v) => v / d[d.length - 1]);
}
const pathD = (pts: Pt[]) => pts.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join(" ");

function useCompact() {
  const [c, setC] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 760px)").matches);
  useLayoutEffect(() => {
    const mq = window.matchMedia("(max-width: 760px)");
    const on = () => setC(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return c;
}

export default function RouteDiagram() {
  const compact = useCompact();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const rootRef = useRef<HTMLDivElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const [done, setDone] = useState(false);
  const reduced = prefersReducedMotion();

  /* ---- geometry (SVG user units; compact stacks the rows vertically) ---- */
  const W = compact ? 360 : 960;
  const H = compact ? 660 : 340;
  const todayPts: Pt[] = compact
    ? [70, 150, 230, 310].map((y) => ({ x: 44, y }))
    : [70, 330, 600, 880].map((x) => ({ x, y: 100 }));
  const pkgPts: Pt[] = compact
    ? [440, 530, 620].map((y) => ({ x: 44, y }))
    : [70, 480, 880].map((x) => ({ x, y: 270 }));
  const todayStops: Stop[] = TODAY_STOPS.map((s, i) => ({ ...s, pt: todayPts[i] }));
  const pkgStops: Stop[] = PKG_STOPS.map((s, i) => ({ ...s, pt: pkgPts[i] }));
  const fT = fractions(todayPts);
  const fP = fractions(pkgPts);
  const titleT: Pt = compact ? { x: 20, y: 30 } : { x: 40, y: 38 };
  const titleP: Pt = compact ? { x: 20, y: 400 } : { x: 40, y: 208 };

  const stopLabel = (s: Stop, i: number, n: number, muted: boolean) => {
    const cls = `rd-stop${muted ? " rd-stop--muted" : ""}`;
    const label = s.change ? `${s.name} · change` : s.name;
    if (compact) return <text className={cls} x={s.pt.x + 24} y={s.pt.y + 5} data-a={s.id}>{label}</text>;
    const anchor = i === 0 ? "middle" : i === n - 1 ? "end" : "middle";
    const x = i === n - 1 ? s.pt.x + 50 : s.pt.x;
    return <text className={cls} x={x} y={s.pt.y + 38} textAnchor={anchor} data-a={s.id}>{label}</text>;
  };
  const segLabel = (seg: Seg, a: Pt, b: Pt, pkg: boolean) => {
    const cls = `rd-seg${pkg ? " rd-seg--pkg" : ""}`;
    if (compact) return <text className={cls} x={a.x + 24} y={(a.y + b.y) / 2 + 5} data-a={seg.id}>{seg.label}</text>;
    return <text className={cls} x={(a.x + b.x) / 2} y={a.y - 18} textAnchor="middle" data-a={seg.id}>{seg.label}</text>;
  };

  /* ---- animation ---- */
  const build = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    tlRef.current?.kill();
    const q = gsap.utils.selector(root);
    const el = (k: string) => q(`[data-a="${k}"]`);
    const g = (k: string) => q(`[data-g="${k}"]`)[0] as unknown as SVGPathElement;
    const hide = [...todayStops, ...pkgStops].map((s) => `[data-a="${s.id}"]`)
      .concat([...TODAY_SEGS, ...PKG_SEGS].map((s) => `[data-a="${s.id}"]`), ['[data-a="tt"]', '[data-a="tb"]', '[data-a="pt"]', '[data-a="pb"]']);
    gsap.set(q(hide.join(",")), { opacity: 0 });
    gsap.set(q('[data-m]'), { drawSVG: "0% 0%" });
    gsap.set(q(".rd-dot"), { opacity: 0 });
    gsap.set(q(".rd-ring"), { opacity: 0 });
    setDone(false);

    const tl = gsap.timeline({ defaults: { ease: "none" }, onComplete: () => setDone(true) });
    const move = (t: number, dot: string, guide: string, mask: string, a: number, b: number, dur: number, ease: string) => {
      tl.to(q(`[data-m="${mask}"]`), { drawSVG: `0% ${b * 100}%`, duration: dur, ease }, t);
      tl.to(q(`[data-dot="${dot}"]`), {
        duration: dur, ease,
        motionPath: { path: g(guide), align: g(guide), alignOrigin: [0.5, 0.5], start: a, end: b },
      }, t);
    };
    const show = (k: string, t: number) => tl.to(el(k), { opacity: 1, duration: 0.3 }, t);

    // Today: slow, stop by stop, pause at the change.
    show("tt", 0); show("t0", 0);
    tl.set(q('[data-dot="t"]'), { opacity: 1 }, 0.3);
    move(0.3, "t", "gt", "mt", 0, fT[1], 1.3, "power1.inOut"); show("ts0", 0.5);
    show("t1", 1.6); show("tb", 1.6);
    tl.fromTo(q('[data-a="ring"]'), { scale: 1, opacity: 0.9, transformOrigin: "50% 50%" }, { scale: 2.6, opacity: 0, duration: 0.5, ease: "power2.out" }, 1.6);
    move(2.1, "t", "gt", "mt", fT[1], fT[2], 1.0, "power1.inOut"); show("ts1", 2.2);
    show("t2", 3.1);
    move(3.1, "t", "gt", "mt", fT[2], 1, 0.5, "power1.inOut"); show("ts2", 3.2);
    show("t3", 3.6);
    tl.to(q('[data-dot="t"]'), { opacity: 0, duration: 0.25 }, 3.7);

    // With a package: faster, smoother, arrives first and cleanly.
    show("pt", 3.8); show("p0", 3.8);
    tl.set(q('[data-dot="p"]'), { opacity: 1 }, 4.0);
    move(4.0, "p", "gp", "mp", 0, fP[1], 0.7, "power2.inOut"); show("ps0", 4.1);
    show("p1", 4.7);
    move(4.7, "p", "gp", "mp", fP[1], 1, 0.6, "power2.out"); show("ps1", 4.8);
    show("p2", 5.3); show("pb", 5.3);
    tl.to(q('[data-dot="p"]'), { opacity: 0, duration: 0.25 }, 5.4);
    tlRef.current = tl;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compact]);

  useLayoutEffect(() => {
    if (reduced) return;
    build();
    return () => { tlRef.current?.kill(); };
  }, [build, reduced]);

  const replay = () => { setDone(false); tlRef.current?.restart(); };

  const mk = (k: string) => `url(#${uid}${k})`;
  const nodeCls = (s: Stop, pkg: boolean) => (s.change ? "rd-node rd-node--change" : `rd-node rd-node--${pkg ? "pkg" : "today"}`);

  return (
    <div className="route" ref={rootRef}>
      <svg className="route__svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ARIA} focusable="false">
        <defs>
          <mask id={`${uid}mt`} maskUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
            <path d={pathD(todayPts)} data-m="mt" stroke="#fff" strokeWidth="14" fill="none" />
          </mask>
        </defs>

        {/* Today */}
        <text className="rd-title" x={titleT.x} y={titleT.y} data-a="tt">Today</text>
        <text className="rd-badge" x={compact ? W - 20 : 150} y={titleT.y} textAnchor={compact ? "end" : "start"} data-a="tb">3 changes</text>
        <path className="rd-line-today" d={pathD(todayPts)} mask={mk("mt")} />
        <path d={pathD(todayPts)} data-g="gt" fill="none" stroke="none" />
        {TODAY_SEGS.map((s, i) => segLabel(s, todayPts[i], todayPts[i + 1], false))}
        {todayStops.map((s, i) => (
          <g key={s.id}>
            <g data-a={s.id}>
              {s.change && <circle className="rd-ring" data-a="ring" cx={s.pt.x} cy={s.pt.y} r="11" />}
              <circle className={nodeCls(s, false)} cx={s.pt.x} cy={s.pt.y} r="10" />
            </g>
            {stopLabel(s, i, todayStops.length, true)}
          </g>
        ))}
        <circle className="rd-dot rd-dot--today" data-dot="t" r="9" />

        {/* With a package */}
        <text className="rd-title rd-title--pkg" x={titleP.x} y={titleP.y} data-a="pt">With a package</text>
        <text className="rd-badge rd-badge--pkg" x={compact ? 20 : 240} y={compact ? titleP.y + 26 : titleP.y} data-a="pb">1 change, shuttle waiting</text>
        <path className="rd-line-pkg" d={pathD(pkgPts)} data-m="mp" />
        <path d={pathD(pkgPts)} data-g="gp" fill="none" stroke="none" />
        {PKG_SEGS.map((s, i) => segLabel(s, pkgPts[i], pkgPts[i + 1], true))}
        {pkgStops.map((s, i) => (
          <g key={s.id}>
            <g data-a={s.id}><circle className={nodeCls(s, true)} cx={s.pt.x} cy={s.pt.y} r="11" /></g>
            {stopLabel(s, i, pkgStops.length, false)}
          </g>
        ))}
        <circle className="rd-dot rd-dot--pkg" data-dot="p" r="10" />
      </svg>

      <ul className="rd-sr">
        <li>Today: Tokyo, Shinkansen to Nagano, change to the Shinano Railway (40–50 min) to Myoko-Kogen, pickup or taxi to the hotel. 3 changes.</li>
        <li>With a package: Tokyo, Hakutaka direct to Joetsu-Myoko (about 2h), PCG shuttle (proposed) to Lime Resort Myoko. 1 change, shuttle waiting.</li>
      </ul>

      {!reduced && (
        <button type="button" className="pill pill--ghost route__replay" onClick={replay} hidden={!done} aria-hidden={!done} tabIndex={done ? 0 : -1}>
          Replay
        </button>
      )}
    </div>
  );
}
