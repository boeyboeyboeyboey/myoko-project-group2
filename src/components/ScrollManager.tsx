import { useEffect } from "react";
import { useLocation } from "react-router";
import { scrollToTop, startSmoothScroll } from "../lib/smoothScroll";

/** Mounts Lenis once; resets scroll on route change. Renders nothing. */
export default function ScrollManager() {
  const { pathname } = useLocation();

  useEffect(() => startSmoothScroll(), []);
  useEffect(() => {
    scrollToTop();
  }, [pathname]);

  return null;
}
