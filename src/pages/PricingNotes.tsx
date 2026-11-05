import { useEffect, useRef } from "react";
import { Link } from "react-router";
import PageHero from "../components/PageHero";
import { ACTIVITIES, PACKAGE_IDS, getPackage } from "../lib/booking";
import { ASSUMPTIONS, COST_LINES, derivePackageBreakdown } from "../lib/pricingWorkings";
import { setBloom } from "../lib/bloom";
import { longDate } from "../lib/format";
import { useReveal } from "../lib/useReveal";

const yen = (n: number) => `¥${Math.round(n).toLocaleString("en-SG")}`;
const sgdN = (n: number) => `S$${n.toLocaleString("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const Badge = ({ c }: { c: string }) => <span className="conf-badge" data-c={c}>{c}</span>;

export default function PricingNotes() {
  const ref = useRef<HTMLDivElement>(null);
  useReveal(ref);
  useEffect(() => setBloom(1), []);

  useEffect(() => {
    const existing = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const meta = existing ?? document.createElement("meta");
    const prev = existing?.getAttribute("content") ?? null;
    meta.name = "robots";
    meta.content = "noindex";
    if (!existing) document.head.appendChild(meta);
    return () => {
      if (!existing) meta.remove();
      else if (prev !== null) meta.setAttribute("content", prev);
    };
  }, []);

  const margin = Math.round(ASSUMPTIONS.margin * 100);

  return (
    <div className="page" ref={ref}>
      <PageHero label="Pricing notes" jp="価格" title={<>How the prices are <em>built</em>.</>}
        lede="Working notes for reviewers. Every figure is illustrative and derived from the data below." />

      <section className="section">
        <div className="container pn" data-reveal>
          <h2>Method</h2>
          <p>Each package price is per person, starting at Joetsu-Myoko Station. The Shinkansen ticket is not included.</p>
          <p>Package cost (¥) = nights × stay + nights × guide ÷ <strong>{ASSUMPTIONS.groupSize}</strong> + days × van ÷ <strong>{ASSUMPTIONS.groupSize}</strong> + theme activities. Group costs (guide, van) are shared across an assumed group of <strong>{ASSUMPTIONS.groupSize}</strong>.</p>
          <p>The yen total is converted at <strong>¥{ASSUMPTIONS.fxJpyPerSgd} per S$1</strong> (
            <a className="u" href={ASSUMPTIONS.fxSource.url} target="_blank" rel="noopener noreferrer">exchange-rates.org</a>, {longDate(ASSUMPTIONS.fxSource.date)}), a <strong>{margin}% margin</strong> is added, and the result is rounded to the nearest S$10. The margin is an assumption, not a sourced figure: it stands in for a typical tour-operator markup.</p>
        </div>
      </section>

      <section className="section">
        <div className="container pn">
          <h2 data-reveal>Package breakdowns</h2>
          {PACKAGE_IDS.map((id) => {
            const pkg = getPackage(id);
            const b = derivePackageBreakdown(id);
            const withMargin = b.costSgd * (1 + ASSUMPTIONS.margin);
            return (
              <div key={id} data-reveal>
                <p className="tbl-cap">{pkg.name}, {pkg.nights} nights, {pkg.days} days</p>
                <div className="tbl-wrap" tabIndex={0} role="region" aria-label={`${pkg.name} price breakdown, scrolls horizontally`}>
                  <table className="tbl" style={{ minWidth: "28rem" }}>
                    <tbody>
                      {b.lines.map((l) => (
                        <tr key={l.id}>
                          <td>{ACTIVITIES.find((a) => a.id === l.id)?.name ?? l.label}</td>
                          <td className="num">{yen(l.jpy)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr><td>Subtotal, JPY</td><td className="num">{yen(b.totalJpy)}</td></tr>
                      <tr><td>Converted at ¥{ASSUMPTIONS.fxJpyPerSgd} per S$1</td><td className="num">{sgdN(b.costSgd)}</td></tr>
                      <tr><td>Plus {margin}% margin</td><td className="num">{sgdN(withMargin)}</td></tr>
                      <tr><td>Rounded to nearest S$10: per person</td><td className="num">S${b.priceSgd.toLocaleString("en-SG")}</td></tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="section">
        <div className="container pn">
          <h2 data-reveal>Cost lines</h2>
          <div className="tbl-wrap" data-reveal tabIndex={0} role="region" aria-label="Cost lines table, scrolls horizontally">
            <table className="tbl">
              <thead><tr><th>Item</th><th className="num">JPY</th><th>Unit</th><th>Confidence</th><th>Source</th><th>Note</th></tr></thead>
              <tbody>
                {COST_LINES.map((l) => (
                  <tr key={l.id}>
                    <td>{l.item}</td>
                    <td className="num">{yen(l.jpy)}</td>
                    <td>{l.unit}</td>
                    <td><Badge c={l.confidence} /></td>
                    <td>{l.source.url ? <a className="u" href={l.source.url} target="_blank" rel="noopener noreferrer">{l.source.title}</a> : <>No public source<br /><span className="note">{l.source.title}</span></>}{l.source.date && <span className="note"> ({l.source.date})</span>}</td>
                    <td>{l.note || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container pn">
          <h2 data-reveal>Activities</h2>
          <div className="tbl-wrap" data-reveal tabIndex={0} role="region" aria-label="Activities table, scrolls horizontally">
            <table className="tbl">
              <thead><tr><th>Activity</th><th className="num">JPY</th><th className="num">SGD</th><th>Source</th><th>Confidence</th></tr></thead>
              <tbody>
                {ACTIVITIES.map((a) => (
                  <tr key={a.id}>
                    <td>{a.name}</td>
                    <td className="num">{yen(a.priceJpy)}</td>
                    <td className="num">S${a.priceSgd.toLocaleString("en-SG")}</td>
                    <td>{a.priceBasis.url ? <a className="u" href={a.priceBasis.url} target="_blank" rel="noopener noreferrer">{a.priceBasis.operator}</a> : a.priceBasis.operator}</td>
                    <td><Badge c={a.priceBasis.confidence} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container pn" data-reveal>
          <h2>Timetable data</h2>
          <p>Train times in the transfer guide are scheduled times from the operators' 14 March 2026 timetable revision; a live version would need a timetable data feed (ODPT/GTFS-JP) or a commercial route API, and an annual update each March.</p>
        </div>
      </section>

      <section className="section">
        <div className="container pn" data-reveal>
          <h2>Caveats</h2>
          <ul className="pn-list">
            <li>All prices are illustrative. Nothing here is a quote, and no operator has been contacted.</li>
            <li>The stay rate is a proxy from an Akakura B&amp;B listing. No Lime Resort Myoko rate is published, so a real rate would move every package.</li>
            <li>Activity prices are the team's 2026 trip rates, likely discounted.</li>
            <li>The station shuttle and partners are proposed, not confirmed.</li>
            <li>The guide rate is the weakest figure: a freelance range with no official rate.</li>
            <li>Sources accessed {longDate(ASSUMPTIONS.accessed)}.</li>
          </ul>
        </div>
      </section>

      <div className="container back"><Link to="/packages" className="u">All packages</Link></div>
    </div>
  );
}
