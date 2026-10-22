import { useRef } from "react";
import { Link } from "react-router";
import InkBleedHero from "../components/hero/InkBleedHero";
import { PACKAGE_CONTENT } from "../lib/content";
import { ACTIVITIES, PACKAGE_PRICES, getPackage } from "../lib/booking";
import { sgd } from "../lib/format";
import { useReveal } from "../lib/useReveal";
import { prefersReducedMotion } from "../lib/smoothScroll";

/** Sources, in order of first use on the page. Numbers are derived from position. */
const NOTES: { id: string; text: string }[] = [
  { id: "climate", text: "Climate normals 1991–2020, JMA (Sekiyama, Myoko: June 19.3 °C, September 20.3 °C, via weather.time-j.net) and Meteorological Service Singapore (Changi, August mean 28.1 °C)." },
];
const N = (id: string) => NOTES.findIndex((n) => n.id === id) + 1;

function jump(e: React.MouseEvent<HTMLAnchorElement>, id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  e.preventDefault();
  el.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "center" });
  history.replaceState(null, "", `#${id}`);
  el.focus({ preventScroll: true });
}

function Fn({ id }: { id: string }) {
  const n = N(id);
  return (
    <sup className="fn">
      <a id={`fnref-${id}`} href={`#fn-${id}`} aria-label={`Note ${n}`} onClick={(e) => jump(e, `fn-${id}`)}>{n}</a>
    </sup>
  );
}

interface Proof { title: string; text: string; img?: { name: string; w: number; h: number; alt: string }; }
const PROOFS: Proof[] = [
  { title: "Paddle Lake Nojiri", text: "SUP and kayak on a calm mountain lake.", img: { name: "nojiri-kayaks", w: 1200, h: 900, alt: "Kayaks on Lake Nojiri" } },
  { title: "Walk to the falls", text: "Naena Falls, a short forest walk from the villages.", img: { name: "naena-falls", w: 1200, h: 1600, alt: "Naena Falls in the forest" } },
  { title: "Eat where the locals do", text: "Arai's streets, sake and kanzuri chilli paste." },
];

function Photo({ name, w, h, alt }: { name: string; w: number; h: number; alt: string }) {
  const set = (ext: string) => [480, 800, 1200].map((x) => `/media/home/${name}-${x}.${ext} ${x}w`).join(", ");
  const sizes = "(min-width: 960px) 30vw, 92vw";
  return (
    <picture>
      <source type="image/webp" srcSet={set("webp")} sizes={sizes} />
      <img src={`/media/home/${name}-800.jpg`} srcSet={set("jpg")} sizes={sizes} width={w} height={h} alt={alt} loading="lazy" decoding="async" />
    </picture>
  );
}

const COMMITMENTS: { title: string; text: string }[] = [
  { title: "Groups of 4 to 12.", text: "Fewer, better visits." },
  { title: "Local operators, not replacements.", text: "Activities run by the people who live here — proposed partners, with a local ground team." },
  { title: "Off-peak by design.", text: "We recommend late May to early June and September to early October." },
];

export default function Home() {
  const ref = useRef<HTMLDivElement>(null);
  useReveal(ref);

  return (
    <>
      <InkBleedHero />
      <div className="home" ref={ref}>
        <section id="why" className="section home-sec">
          <div className="container">
            <div className="home-head" data-reveal>
              <p className="eyebrow">Why come back</p>
              <h2 className="home-title">The same mountains, without the crowds.</h2>
              <p className="home-body">
                In winter, Myoko is powder and queues. From May to October it turns green: forest trails, lakes you can paddle, villages that run at their own pace. In June and September it averages about 20 °C, against Singapore's 28 °C.<Fn id="climate" /> Where Japan escapes the summer. Now in English.
              </p>
            </div>
            <ul className="proofs">
              {PROOFS.map((p) => (
                <li key={p.title} className="proof" data-reveal>
                  <div className="proof__media">
                    {p.img ? <Photo {...p.img} /> : (
                      /* TODO(photo): replace with a food photo from Arai (Nicholas to upload), then add a "home" job item in scripts/process-images.mjs */
                      <div className="proof__ph" role="img" aria-label="Photo coming soon"><span>Photo coming soon</span></div>
                    )}
                  </div>
                  <h3 className="proof__title">{p.title}</h3>
                  <p>{p.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="packages" className="section home-sec">
          <div className="container">
            <div className="home-head" data-reveal>
              <p className="eyebrow">Packages</p>
              <h2 className="home-title">Transfers, stay and an English lead guide, arranged in one booking.</h2>
            </div>
            <div className="tiers home-tiers">
              {PACKAGE_CONTENT.map((p, i) => {
                const rec = p.slug === "active";
                const pkg = getPackage(p.slug);
                const activities = pkg.themeActivities.map((id) => ACTIVITIES.find((a) => a.id === id)?.name ?? id);
                return (
                  <article key={p.slug} className="tier" data-rec={rec} data-reveal>
                    <header className="tier__head">
                      <span className="numeral">0{i + 1}</span>
                      {rec && <span className="eyebrow">Recommended <i className="dot" aria-hidden="true" /></span>}
                    </header>
                    <h3 className="tier__name">{p.name}</h3>
                    <p className="tier__tag">{pkg.days} days / {pkg.nights} nights</p>
                    <p className="tier__tag">{activities.join(", ")}</p>
                    <p className="tier__price">
                      <span className="tick">From {sgd(PACKAGE_PRICES[p.slug])} pp</span>
                    </p>
                    <Link to={`/packages/${p.slug}`} className={rec ? "pill" : "pill pill--ghost"}>View {p.name}</Link>
                  </article>
                );
              })}
            </div>
            <p className="fine" data-reveal>
              Prices in SGD per person, illustrative.{" "}
              <Link to="/pricing-notes" className="u">How we priced this</Link>
            </p>
          </div>
        </section>

        <section id="return-pass" className="section home-sec home-strip">
          <div className="container home-strip__in" data-reveal>
            <div>
              <h2 className="home-title home-title--sm">Skied Madarao or Suginohara this winter? Your lift ticket opens the summer.</h2>
              <p className="home-body">Enter your pass code for 10% off any green-season package.</p>
            </div>
            <Link to="/return" className="pill">Redeem your pass</Link>
          </div>
        </section>

        <section id="trust" className="section home-sec">
          <div className="container">
            <div className="home-head" data-reveal>
              <p className="home-body">
                Take the Shinkansen to Joetsu-Myoko. We arrange the rest: a shuttle from the station (proposed), an English lead guide, your stay and every booking.
              </p>
            </div>
            <ul className="commits">
              {COMMITMENTS.map((c) => (
                <li key={c.title} data-reveal>
                  <strong>{c.title}</strong>
                  <span>{c.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="notes" className="section home-sec home-notes" aria-labelledby="notes-h">
          <div className="container">
            <h2 id="notes-h" className="eyebrow">Notes</h2>
            <ol className="notes">
              {NOTES.map((n) => (
                <li key={n.id} id={`fn-${n.id}`} tabIndex={-1}>
                  {n.text}{" "}
                  <a href={`#fnref-${n.id}`} className="notes__back" aria-label="Back to text" onClick={(e) => jump(e, `fnref-${n.id}`)}>↩</a>
                </li>
              ))}
            </ol>
            <p className="notes__credit">Photo: Myoko in Colour team</p>
          </div>
        </section>
      </div>
    </>
  );
}
