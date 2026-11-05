import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { gsap } from "gsap";
import { asset } from "../../lib/asset";
import { setBloom } from "../../lib/bloom";
import { createInkBleed, type InkBleed } from "../../lib/inkBleed";
import LiveWeather from "./LiveWeather";
import { getLenis, prefersReducedMotion } from "../../lib/smoothScroll";

type Mode = "gl" | "css" | "static";

const WINTER_LINE = "You've seen Myoko in white.";
const HERO_SUB = "Take the Shinkansen to Joetsu-Myoko. We arrange the rest (proposed).";
const REVEAL_SECONDS = 2.5; // autoplay length of the white-to-green swap
const REVEAL_DELAY = 0.3;
const GREEN_LINE = "Now you'll see it in green.";
// Same viewpoint (Imori Pond, ~17 m apart), pre-aligned crops — keep both focal points identical so the frames stay registered.
const FOCAL = { winter: [0.7, 0.4] as [number, number], green: [0.7, 0.4] as [number, number] };

function goToPackages(e: React.MouseEvent<HTMLAnchorElement>) {
  const el = document.getElementById("packages");
  if (!el) return;
  e.preventDefault();
  const lenis = getLenis();
  if (lenis && !prefersReducedMotion()) lenis.scrollTo(el, { offset: -8 });
  else el.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
  history.replaceState(null, "", "#packages");
}

function pickWidth() {
  const px = window.innerWidth * Math.min(window.devicePixelRatio || 1, 2);
  return px <= 1280 ? 1280 : px <= 1920 ? 1920 : 2560;
}
const src = (name: "winter" | "green", w: number) => asset(`media/hero/${name}-${w}.webp`);

function Chars({ text }: { text: string }) {
  return (
    <>
      {text.split(" ").map((word, wi, arr) => (
        <Fragment key={wi}>
          <span className="hero__word">
            {word.split("").map((c, i) => (
              <span key={i} className="hero__char" aria-hidden="true">{c}</span>
            ))}
          </span>
          {wi < arr.length - 1 ? " " : null}
        </Fragment>
      ))}
    </>
  );
}

export default function InkBleedHero() {
  const reduced = useMemo(() => prefersReducedMotion(), []);
  const [mode, setMode] = useState<Mode>(reduced ? "static" : "gl");
  const w = useMemo(pickWidth, []);

  const rootRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const greenImgRef = useRef<HTMLImageElement>(null);
  const handleRef = useRef<HTMLButtonElement>(null);

  // Static (reduced motion): bloom is simply on.
  useEffect(() => {
    if (mode === "static") setBloom(1);
  }, [mode]);

  useEffect(() => {
    if (mode === "static") return;
    const root = rootRef.current!;
    let ink: InkBleed | null = null;

    if (mode === "gl") {
      ink = createInkBleed(canvasRef.current!, {
        winter: { url: src("winter", w), focal: FOCAL.winter },
        green: { url: src("green", w), focal: FOCAL.green },
      });
      if (!ink) { setMode("css"); return; }
    }

    const apply = (p: number) => {
      setBloom(p);
      if (ink) ink.setProgress(p);
      else if (greenImgRef.current) greenImgRef.current.style.setProperty("--reveal", String(p));
    };

    const q = gsap.utils.selector(root);
    const proxy = { p: 0 };
    let tlRef: gsap.core.Timeline | null = null;
    const ctx = gsap.context(() => {
      gsap.set(q(".hero__line--green .hero__char"), { opacity: 0, yPercent: 40, xPercent: 6 });
      gsap.set(q(".hero__line--green"), { filter: "blur(10px)" });
      gsap.set(q(".hero__jp--summer"), { opacity: 0, yPercent: 20 });

      // Autoplays once on mount. Positions below are fractions of 1, then the whole timeline is stretched to REVEAL_SECONDS.
      const tl = gsap.timeline({ defaults: { ease: "none" }, delay: REVEAL_DELAY });
      // 0 → 0.06 hold (let the snow breathe), then the ink spreads
      tl.to(proxy, { p: 1, duration: 0.88, ease: "power1.inOut", onUpdate: () => apply(proxy.p) }, 0.06);
      // winter headline dissolves: letters drift up/outward, blur
      tl.to(q(".hero__line--winter .hero__char"), {
        opacity: 0, yPercent: -35, xPercent: (i: number) => (i % 2 ? 10 : -6), duration: 0.16,
        stagger: { each: 0.006, from: "start" }, ease: "power2.in",
      }, 0.14);
      tl.to(q(".hero__line--winter"), { filter: "blur(10px)", duration: 0.2, ease: "power1.in" }, 0.14);
      tl.to(q(".hero__jp--winter"), { opacity: 0, yPercent: -20, duration: 0.14 }, 0.38);
      // green headline arrives
      tl.to(q(".hero__line--green .hero__char"), {
        opacity: 1, yPercent: 0, xPercent: 0, duration: 0.2, stagger: { each: 0.008, from: "start" }, ease: "power2.out",
      }, 0.54);
      tl.to(q(".hero__line--green"), { filter: "blur(0px)", duration: 0.2, ease: "power1.out" }, 0.54);
      tl.to(q(".hero__jp--summer"), { opacity: 1, yPercent: 0, duration: 0.14 }, 0.52);
      tl.duration(REVEAL_SECONDS);
      tlRef = tl;
    }, root);

    // Scrubbing: once autoplay ends (or the user grabs it), the paused timeline is driven by drag / arrow keys.
    const tl = tlRef!;
    const pin = pinRef.current!;
    const handle = handleRef.current;
    const setProg = (p: number) => {
      const c = Math.min(1, Math.max(0, p));
      tl.progress(c);
      handle?.setAttribute("aria-valuenow", String(Math.round(c * 100)));
    };
    const enable = () => {
      if (handle) { handle.classList.add("hero__handle--on"); }
      pin.classList.add("hero__pin--scrub");
    };
    tl.eventCallback("onComplete", enable);
    let startX = 0, startP = 0, dragId = -1;
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      if ((e.target as Element).closest("a, button, [role='slider']")) return;
      dragId = e.pointerId;
      startX = e.clientX;
      tl.pause(); // grabbing early: stop autoplay where it is
      startP = tl.progress();
      enable();
      pin.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== dragId) return;
      setProg(startP + (e.clientX - startX) / pin.clientWidth);
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== dragId) return;
      dragId = -1;
      if (pin.hasPointerCapture(e.pointerId)) pin.releasePointerCapture(e.pointerId);
    };
    const onKey = (e: KeyboardEvent) => {
      const d = e.key === "ArrowRight" || e.key === "ArrowUp" ? 0.1 : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -0.1 : 0;
      if (e.key === "Home") { e.preventDefault(); tl.pause(); setProg(0); return; }
      if (e.key === "End") { e.preventDefault(); tl.pause(); setProg(1); return; }
      if (!d) return;
      e.preventDefault();
      tl.pause();
      setProg(tl.progress() + d);
    };
    pin.addEventListener("pointerdown", onDown);
    pin.addEventListener("pointermove", onMove);
    pin.addEventListener("pointerup", onUp);
    pin.addEventListener("pointercancel", onUp);
    handle?.addEventListener("keydown", onKey);

    const io = new IntersectionObserver(([e]) => ink?.setVisible(e.isIntersecting), { rootMargin: "100px" });
    io.observe(root);

    return () => {
      io.disconnect();
      pin.removeEventListener("pointerdown", onDown);
      pin.removeEventListener("pointermove", onMove);
      pin.removeEventListener("pointerup", onUp);
      pin.removeEventListener("pointercancel", onUp);
      handle?.removeEventListener("keydown", onKey);
      pin.classList.remove("hero__pin--scrub");
      handle?.classList.remove("hero__handle--on");
      tl.kill();
      ctx.revert();
      ink?.destroy();
    };
  }, [mode, w]);

  // Leaving the home page: the page stays in the green season.
  useEffect(() => () => setBloom(1), []);

  const isStatic = mode === "static";

  return (
    <section ref={rootRef} id="hero" className={`hero hero--${mode}`} aria-label="Myoko in white, then in green">
      <div ref={pinRef} className="hero__pin">
        <div className="hero__media" aria-hidden="true">
          {mode === "gl" && (
            <>
              <img className="hero__poster" src={src("winter", w)} alt="" fetchPriority="high" />
              <canvas ref={canvasRef} className="hero__canvas" />
            </>
          )}
          {mode === "css" && (
            <>
              <img className="hero__img hero__img--winter" src={src("winter", w)} alt="" fetchPriority="high" />
              <img ref={greenImgRef} className="hero__img hero__img--green" src={src("green", w)} alt="" />
            </>
          )}
          {isStatic && <img className="hero__img hero__img--static" src={src("green", w)} alt="" fetchPriority="high" />}
        </div>
        <div className="hero__scrim" aria-hidden="true" />

        <div className="hero__content container">
          {isStatic ? (
            <div className="hero__static-head">
              <p className="hero__caption">{WINTER_LINE}</p>
              <h1 className="hero__line">{GREEN_LINE}</h1>
            </div>
          ) : (
            <div className="hero__heads">
              <h1 className="hero__line hero__line--winter" aria-label={`${WINTER_LINE} ${GREEN_LINE}`}>
                <Chars text={WINTER_LINE} />
              </h1>
              <p className="hero__line hero__line--green" aria-hidden="true">
                <Chars text={GREEN_LINE} />
              </p>
            </div>
          )}
          <p className="hero__sub">{HERO_SUB}</p>
          <div className="hero__cta">
            <a href="#packages" className="pill hero__pill" onClick={goToPackages}>Explore packages</a>
            <Link to="/return" className="pill pill--ghost hero__pill hero__pill--ghost">Got a winter voucher?</Link>
          </div>
        </div>

        <div className="hero__jp" aria-hidden="true">
          <span className="jp-vertical hero__jp--winter">{isStatic ? "夏" : "冬"}</span>
          {!isStatic && <span className="jp-vertical hero__jp--summer">夏</span>}
        </div>

        {!isStatic && (
          <button
            ref={handleRef}
            type="button"
            className="hero__handle"
            role="slider"
            aria-label="Season: drag or use arrow keys"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={0}
          />
        )}
        <LiveWeather />

        <p className="hero__credit">Imori Pond, same viewpoint. Photos: Raita Futo (Feb 2019) and TANAKA Juuyoh (Aug 2012), CC BY 2.0 — cropped, colour-processed</p>
      </div>
    </section>
  );
}
