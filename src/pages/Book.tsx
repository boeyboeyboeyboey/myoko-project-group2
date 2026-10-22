import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import PageHero from "../components/PageHero";
import { PACKAGE_CONTENT, DISCLAIMER } from "../lib/content";
import {
  ACTIVITIES, activityDate, bookingDatesValid, calculateTotal, getPackage, makeItinerary,
} from "../lib/booking";
import { resetBooking, updateBooking, useBooking } from "../lib/bookingState";
import { longDate, sgd, shortDate } from "../lib/format";
import { setBloom } from "../lib/bloom";
import { useReveal } from "../lib/useReveal";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const REF_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function makeReference(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return `MYK-${Array.from(bytes, (b) => REF_CHARS[b % REF_CHARS.length]).join("")}`;
}

export default function Book() {
  const [booking] = useBooking();
  const ref = useRef<HTMLDivElement>(null);
  useReveal(ref);
  useEffect(() => setBloom(1), []);

  const { packageId, arrival, travellers, picks, voucher, confirmation, contact } = booking;
  const valid = bookingDatesValid(arrival, packageId);
  const [name, setName] = useState(contact.name);
  const [email, setEmail] = useState(contact.email);
  const [tried, setTried] = useState(false);
  const nameError = name.trim() ? null : "Enter your name.";
  const emailError = EMAIL_RE.test(email.trim()) ? null : "Enter a valid email address.";
  const pickIds = useMemo(() => picks.map((p) => p.activityId), [picks]);

  if (!valid && !confirmation) {
    return (
      <div className="page" ref={ref}>
        <PageHero num="04" label="Booking" jp="予約" title={<>Nothing to <em>review</em> yet.</>}
          lede="Choose a package and valid dates first." />
        <section className="section">
          <div className="container empty" data-reveal>
            <Link to="/packages" className="pill">Browse packages</Link>
          </div>
        </section>
      </div>
    );
  }

  const content = PACKAGE_CONTENT.find((x) => x.slug === packageId)!;
  const pkg = getPackage(packageId);
  const total = calculateTotal({ packageId, activityIds: pickIds, travellers, voucher });
  const theme = pkg.themeActivities;
  const extraList = pickIds.filter((id) => !theme.includes(id)).map((id) => ACTIVITIES.find((a) => a.id === id)!);
  const pickedActivities = pickIds.map((id) => ACTIVITIES.find((a) => a.id === id)!);
  const itinerary = makeItinerary(packageId, picks.map((p) => ({ activityId: p.activityId, dayIndex: p.dayIndex })));
  const departs = activityDate(arrival, pkg.nights);
  const done = confirmation !== null;
  const confirm = () => {
    setTried(true);
    if (nameError || emailError) return;
    updateBooking({ confirmation: makeReference(), contact: { name: name.trim(), email: email.trim() } });
  };

  return (
    <div className="page" ref={ref}>
      <PageHero num="04" label={done ? "Confirmation" : "Booking"} jp="予約"
        title={done ? <>Demo booking <em>confirmed</em>.</> : <>Your <em>stay</em>, reviewed.</>}
        lede={done ? "This is a prototype. Nothing has been booked or charged." : undefined} />

      {done && (
        <section className="section section--tight">
          <div className="container conf" data-reveal role="status">
            <span className="eyebrow">Reference</span>
            <strong className="conf__ref">{confirmation}</strong>
            <p className="conf__note">This is a prototype — no booking has been made and nothing was charged.</p>
          </div>
        </section>
      )}

      <section className="section">
        <div className="container grid sec-grid">
          <div className="sec-label" data-reveal><span className="numeral">i</span><span className="eyebrow">— Your stay</span></div>
          <div className="sec-body sum-grid">
            <div data-reveal>
              <dl className="facts-list">
                <div><dt>Package</dt><dd>{content.name}, {pkg.days} days, {pkg.nights} nights</dd></div>
                <div><dt>Arrival</dt><dd>{longDate(arrival)}</dd></div>
                <div><dt>Departure</dt><dd>{longDate(departs)}</dd></div>
                <div><dt>Travellers</dt><dd>{travellers}</dd></div>
                <div><dt>Stay</dt><dd>{content.stay.property} <span className="note">({content.stay.status})</span></dd></div>
                {done && <div><dt>Contact</dt><dd>{contact.name}, {contact.email}</dd></div>}
              </dl>
              <ol className="itin" aria-label="Itinerary" style={{ marginTop: "var(--space-6)" }}>
                {itinerary.map(([day, title, detail, timing], i) => (
                  <li key={day}>
                    <span className="itin__day">{day}<small>{shortDate(activityDate(arrival, i))}</small></span>
                    <div><h3>{title}</h3><p>{detail}</p><small>{timing}</small></div>
                  </li>
                ))}
              </ol>
            </div>

            <aside className="sum" data-reveal aria-label="Price breakdown">
              <span className="eyebrow">Price · SGD, illustrative</span>
              <dl>
                <div><dt>{content.name} (per person)</dt><dd>{sgd(total.base)}</dd></div>
                {total.includedCount > 0 && <div><dt>Activities included ({total.includedCount})</dt><dd>Included</dd></div>}
                {extraList.map((a) => <div key={a.id}><dt>{a.name.split(",")[0]} (extra)</dt><dd>+{sgd(a.priceSgd)}</dd></div>)}
                <div><dt>Per person</dt><dd>{sgd(total.perPerson)}</dd></div>
                <div><dt>Party total ({travellers} {travellers === 1 ? "traveller" : "travellers"})</dt><dd>{total.partyTotal === null ? "n/a" : sgd(total.partyTotal)}</dd></div>
                {voucher && <div className="sum__voucher"><dt>Return pass applied: {voucher.code}</dt><dd>−{sgd(total.discountAmount)}</dd></div>}
              </dl>
              <p className="sum__pp"><span className="tick">{total.payableTotal === null ? "n/a" : sgd(total.payableTotal)}</span><small>{done ? "would have been payable" : "payable, demo only"}</small></p>

              {!done && (
                <>
                  <form className="form book-contact" noValidate onSubmit={(e) => { e.preventDefault(); confirm(); }}>
                    <div className="field">
                      <label className="eyebrow" htmlFor="c-name">Name</label>
                      <input id="c-name" className="input" autoComplete="name" required value={name}
                        aria-invalid={tried && !!nameError} aria-describedby={tried && nameError ? "c-name-err" : undefined} onChange={(e) => setName(e.target.value)} />
                      {tried && nameError && <p id="c-name-err" className="note" data-bad="true" role="alert">{nameError}</p>}
                    </div>
                    <div className="field">
                      <label className="eyebrow" htmlFor="c-email">Email</label>
                      <input id="c-email" type="email" className="input" autoComplete="email" required value={email}
                        aria-invalid={tried && !!emailError} aria-describedby={tried && emailError ? "c-email-err" : undefined} onChange={(e) => setEmail(e.target.value)} />
                      {tried && emailError && <p id="c-email-err" className="note" data-bad="true" role="alert">{emailError}</p>}
                    </div>
                    <button type="submit" className="pill">Confirm demo booking</button>
                  </form>
                  {!voucher && <p className="note">Winter guest? <Link to="/return" className="u">Apply your return pass</Link></p>}
                  <p className="note"><Link to={`/packages/${packageId}`} className="u">Change selection</Link></p>
                </>
              )}
              {done && <button type="button" className="pill pill--ghost" onClick={() => resetBooking()}>Start over</button>}
              <p className="fine">{DISCLAIMER} <Link to="/pricing-notes" className="u">How we priced this</Link></p>
            </aside>
          </div>
        </div>
      </section>

      {pickedActivities.length > 0 && (
        <section className="section">
          <div className="container grid sec-grid">
            <div className="sec-label" data-reveal><span className="numeral">ii</span><span className="eyebrow">— Partners</span></div>
            <div className="sec-body" data-reveal>
              <ul className="partners">
                {pickedActivities.map((a) => (
                  <li key={a.id}>
                    <strong>{a.name.split(",")[0]}</strong>
                    <span className="act__partner">{a.partnerLabel}</span>
                  </li>
                ))}
              </ul>
              <p className="note">Partners and the station shuttle are proposed, not agreed. No one has been contacted.</p>
            </div>
          </div>
        </section>
      )}

      <div className="container back"><Link to="/packages" className="u">All packages</Link></div>
    </div>
  );
}
