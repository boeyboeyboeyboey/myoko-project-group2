import { useRef } from "react";
import { Link } from "react-router";
import PageHero from "../components/PageHero";
import RouteDiagram from "../components/route/RouteDiagram";
import { useReveal } from "../lib/useReveal";

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

export default function Why() {
  const ref = useRef<HTMLDivElement>(null);
  useReveal(ref);

  return (
    <div className="page">
      <PageHero num="04" label="Why Myoko" jp="夏" title={<>Why come <em>back</em>.</>} />
      <section className="route-sec" aria-label="Getting there">
        <div className="container"><RouteDiagram /></div>
      </section>
      <div className="home" ref={ref}>
        <section id="why" className="section home-sec">
          <div className="container">
            <div className="home-head" data-reveal>
                <h2 className="home-title">The same mountains, in green.</h2>
              <p className="home-body">
                In winter, Myoko is powder and queues. From May to October it turns green: forest trails, lakes you can paddle, villages that run at their own pace.
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
            <p data-reveal><Link to="/packages" className="pill">See the packages</Link></p>
          </div>
        </section>

        <section id="notes" className="section home-sec home-notes" aria-labelledby="notes-h">
          <div className="container">
            <h2 id="notes-h" className="eyebrow">Credits</h2>
            <p className="notes__credit">Photo: Myoko in Colour team</p>
          </div>
        </section>
      </div>
    </div>
  );
}
