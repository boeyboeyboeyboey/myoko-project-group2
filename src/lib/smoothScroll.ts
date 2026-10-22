import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

let lenis: Lenis | null = null;

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const getLenis = () => lenis;

/** Starts Lenis driven by the GSAP ticker. Returns a cleanup. No-op under reduced motion. */
export function startSmoothScroll(): () => void {
  if (prefersReducedMotion()) return () => {};

  const instance = new Lenis({ lerp: 0.1, smoothWheel: true });
  lenis = instance;
  instance.on("scroll", ScrollTrigger.update);

  const tick = (time: number) => instance.raf(time * 1000);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);

  return () => {
    gsap.ticker.remove(tick);
    instance.destroy();
    if (lenis === instance) lenis = null;
  };
}

export function scrollToTop() {
  if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
  else window.scrollTo(0, 0);
}
