import { useLayoutEffect, type RefObject } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { prefersReducedMotion } from "./smoothScroll";

gsap.registerPlugin(ScrollTrigger);

/** Fades and lifts every `[data-reveal]` inside `ref` once as it enters view. Skipped under reduced motion. */
export function useReveal(ref: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el, i) => {
        gsap.from(el, {
          autoAlpha: 0,
          y: 28,
          duration: 0.9,
          ease: "expo.out",
          delay: Math.min(i, 3) * 0.06,
          scrollTrigger: { trigger: el, start: "top 92%", once: true },
        });
      });
    }, root);
    return () => ctx.revert();
  }, [ref]);
}
