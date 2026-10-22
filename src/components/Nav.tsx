import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router";
import { NAV_LINKS } from "../lib/content";
import { getLenis } from "../lib/smoothScroll";

export default function Nav() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    const lenis = getLenis();
    if (open) lenis?.stop(); else lenis?.start();
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <header className="nav">
        <div className="nav__inner">
          <Link to="/" className="wordmark" aria-label="Myoko in Colour — home">
            Myoko in <i>Colour</i>
          </Link>
          <nav className="nav__links" aria-label="Primary">
            {NAV_LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} className="nav__link">{l.label}</NavLink>
            ))}
            <Link to="/book" className="pill">Book</Link>
          </nav>
          <button
            className="nav__toggle" aria-expanded={open} aria-controls="mobile-menu"
            onClick={() => setOpen((o) => !o)}
          >
            <span>{open ? "Close" : "Menu"}</span>
            <span className="nav__toggle-bars" aria-hidden="true" />
          </button>
        </div>
      </header>
      <div id="mobile-menu" className="menu" data-open={open} role="dialog" aria-label="Menu">
        <nav className="menu__list" aria-label="Mobile">
          {NAV_LINKS.map((l, i) => (
            <Link key={l.to} to={l.to} className="menu__link">
              <small>0{i + 1}</small>{l.label}
              <span className="jp-vertical" style={{ writingMode: "horizontal-tb", marginLeft: "auto", fontSize: "var(--step-1)", letterSpacing: 0 }} aria-hidden="true">{l.jp}</span>
            </Link>
          ))}
        </nav>
        <Link to="/book" className="pill" style={{ alignSelf: "flex-start" }}>Book your stay</Link>
      </div>
    </>
  );
}
