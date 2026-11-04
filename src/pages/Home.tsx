import { useRef } from "react";
import { Link } from "react-router";
import InkBleedHero from "../components/hero/InkBleedHero";
import PackagePhoto from "../components/PackagePhoto";
import TripFinder from "../components/TripFinder";
import { PACKAGE_CONTENT } from "../lib/content";
import { PACKAGE_PRICES, getPackage } from "../lib/booking";
import { sgd } from "../lib/format";
import { useReveal } from "../lib/useReveal";

export default function Home() {
  const ref = useRef<HTMLDivElement>(null);
  useReveal(ref);

  return (
    <>
      <InkBleedHero />
      <div className="home" ref={ref}>
        <section id="return-pass" className="home-bar" aria-label="Winter voucher">
          <div className="container home-bar__in">
            <p>Had fun in winter? Come back in green season and take 10% off a package.</p>
            <Link to="/return" className="pill">Use your voucher</Link>
          </div>
        </section>

        <section id="packages" className="section home-sec">
          <div className="container">
            <div className="tiers home-tiers">
              {PACKAGE_CONTENT.map((p, i) => {
                const rec = p.slug === "active";
                const pkg = getPackage(p.slug);
                return (
                  <article key={p.slug} className="tier" data-rec={rec} data-reveal>
                    <div className="tier__photo"><PackagePhoto photo={p.photo} sizes="(min-width: 960px) 30vw, 92vw" /></div>
                    <header className="tier__head">
                      <span className="numeral">0{i + 1}</span>
                      {rec && <span className="eyebrow">Recommended <i className="dot" aria-hidden="true" /></span>}
                    </header>
                    <h3 className="tier__name">{p.name}</h3>
                    <p className="tier__tag">{pkg.days} days / {pkg.nights} nights</p>
                    <p className="tier__tag">{p.card.join(" · ")}</p>
                    <p className="tier__price">
                      <span className="tick">From {sgd(PACKAGE_PRICES[p.slug])} pp</span>
                    </p>
                    <Link to={`/packages/${p.slug}`} className={rec ? "pill" : "pill pill--ghost"}>Explore {p.name}</Link>
                  </article>
                );
              })}
            </div>
            <p className="fine" data-reveal>
              Prices in SGD per person, illustrative.{" "}
              <Link to="/pricing-notes" className="u">How we priced this</Link>
            </p>
            <div className="home-finder"><TripFinder /></div>
          </div>
        </section>
      </div>
    </>
  );
}
