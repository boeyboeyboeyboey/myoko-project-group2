import { useEffect, useRef } from "react";
import { Link } from "react-router";
import PageHero from "../components/PageHero";
import PackagePhoto from "../components/PackagePhoto";
import { PACKAGE_CONTENT } from "../lib/content";
import { ACTIVITIES, PACKAGE_PRICES, getPackage } from "../lib/booking";
import { sgd } from "../lib/format";
import { setBloom } from "../lib/bloom";
import { useReveal } from "../lib/useReveal";

export default function Packages() {
  const ref = useRef<HTMLDivElement>(null);
  useReveal(ref);
  useEffect(() => setBloom(1), []); // inner pages live in the green season

  return (
    <div className="page" ref={ref}>
      <PageHero num="01" label="Packages" jp="旅" title={<>Three ways to <em>return</em>.</>} />

      <section className="section">
        <div className="container">
          <div className="tiers">
            {PACKAGE_CONTENT.map((c, i) => {
              const pkg = getPackage(c.slug);
              const rec = c.slug === "active";
              return (
                <article key={c.slug} className="tier" data-rec={rec} data-reveal>
                  <div className="tier__photo"><PackagePhoto photo={c.photo} sizes="(min-width: 960px) 30vw, 92vw" /></div>
                  <header className="tier__head">
                    <span className="numeral">0{i + 1}</span>
                    <span className="eyebrow">{rec ? <>Recommended <i className="dot" aria-hidden="true" /></> : c.jp}</span>
                  </header>
                  <h2 className="tier__name">{c.name}</h2>
                  <p className="tier__price">
                    <span className="tick">{sgd(PACKAGE_PRICES[c.slug])} pp</span>
                    <small>{pkg.days} days, {pkg.nights} nights · from Joetsu-Myoko Station</small>
                  </p>
                  <ul className="tier__list">
                    {pkg.themeActivities.map((id) => <li key={id}>{ACTIVITIES.find((a) => a.id === id)?.name ?? id}</li>)}
                  </ul>
                  <Link to={`/packages/${c.slug}`} className={rec ? "pill" : "pill pill--ghost"}>Explore {c.name}</Link>
                </article>
              );
            })}
          </div>

          <p className="fine" data-reveal>
            Illustrative prices, per person in SGD. Stay at Lime Resort Myoko, shuttle and partners are proposed.{" "}
            <Link to="/pricing-notes" className="u">How we priced this</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
