import { useLayoutEffect, useRef, type DependencyList, type RefObject } from "react";
import { gsap } from "gsap";
import { Flip } from "gsap/Flip";
import { prefersReducedMotion } from "../../lib/smoothScroll";

gsap.registerPlugin(Flip);

const SEL = "[data-flip-id]";
const DUR = 0.35;

interface Snap {
  state: Flip.FlipState;
  /** Clones of leaf items (data-flip-leaf) so removals can fade out after React drops them. */
  ghosts: Map<string, { node: HTMLElement; rect: DOMRect }>;
  bad: Set<string>;
}

/**
 * FLIP for the itinerary and activity cards. Call the returned `capture()` right
 * before the state update; the layout effect (keyed on `deps`) animates from the
 * captured state. New items fade/scale in, removed leaf items fade out, newly
 * clashing items shake. No-op under reduced motion.
 */
export function useBookingFlip(root: RefObject<HTMLElement | null>, deps: DependencyList): () => void {
  const snap = useRef<Snap | null>(null);

  const capture = () => {
    const el = root.current;
    if (!el || prefersReducedMotion()) { snap.current = null; return; }
    const items = Array.from(el.querySelectorAll<HTMLElement>(SEL));
    const ghosts = new Map<string, { node: HTMLElement; rect: DOMRect }>();
    const bad = new Set<string>();
    for (const n of items) {
      const id = n.dataset.flipId!;
      if (n.dataset.flipLeaf != null) ghosts.set(id, { node: n.cloneNode(true) as HTMLElement, rect: n.getBoundingClientRect() });
      if (n.dataset.problem === "true") bad.add(id);
    }
    snap.current = { state: Flip.getState(items), ghosts, bad };
  };

  useLayoutEffect(() => {
    const s = snap.current;
    const el = root.current;
    snap.current = null;
    if (!s || !el || prefersReducedMotion()) return;
    const now = Array.from(el.querySelectorAll<HTMLElement>(SEL));
    const ids = new Set(now.map((n) => n.dataset.flipId));

    Flip.from(s.state, {
      targets: now, duration: DUR, ease: "power2.out", scale: false, nested: true, overwrite: true,
      onEnter: (els) => gsap.fromTo(els, { opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1, duration: 0.28, ease: "power2.out", clearProps: "opacity,transform" }),
    });

    s.ghosts.forEach(({ node, rect }, id) => {
      if (ids.has(id)) return;
      Object.assign(node.style, { position: "fixed", left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, margin: "0", pointerEvents: "none", zIndex: "5" });
      document.body.appendChild(node);
      gsap.to(node, { opacity: 0, scale: 0.92, duration: 0.2, ease: "power1.in", onComplete: () => node.remove() });
    });

    const shake = now.filter((n) => n.dataset.problem === "true" && !s.bad.has(n.dataset.flipId!));
    if (shake.length) {
      gsap.fromTo(shake, { x: 0 }, { keyframes: { x: [-6, 6, -4, 3, 0] }, duration: 0.28, ease: "none", delay: DUR, overwrite: "auto" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return capture;
}
