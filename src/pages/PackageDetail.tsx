import { useEffect, useMemo, useRef } from "react";
import { Link, Navigate, useParams } from "react-router";
import PageHero from "../components/PageHero";
import ActivityPicker from "../components/booking/ActivityPicker";
import { PACKAGE_CONTENT } from "../lib/content";
import {
  ACTIVITIES, BOOKING_WINDOWS, MAX_TRAVELLERS, MIN_TRAVELLERS, PACKAGE_PRICES, SLOTS, activityAvailable, activityDate, activityDayAllowed,
  bookingDatesValid, calculateTotal, defaultPicks, findActivityClashes, getPackage, makeItinerary, type BookingSlot, type PackageId,
} from "../lib/booking";
import { useBooking } from "../lib/bookingState";
import { longDate, sgd, shortDate, todayIso } from "../lib/format";
import { setBloom } from "../lib/bloom";
import { useReveal } from "../lib/useReveal";

const dm = (iso: string, year: boolean) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(year ? { year: "numeric" } : {}) });
const windowLabel = (from: string, to: string) => `${dm(from, false)} – ${dm(to, true)}`;
const WINDOWS_TEXT = BOOKING_WINDOWS.map((w) => windowLabel(w.from, w.to)).join(" or ");

export default function PackageDetail() {
  const { slug } = useParams();
  const content = PACKAGE_CONTENT.find((x) => x.slug === slug);
  if (!content) return <Navigate to="/packages" replace />;
  return <Detail key={content.slug} slug={content.slug} />;
}

function Detail({ slug }: { slug: PackageId }) {
  const content = PACKAGE_CONTENT.find((x) => x.slug === slug)!;
  const pkg = getPackage(slug);
  const [booking, update] = useBooking();
  const ref = useRef<HTMLDivElement>(null);
  useReveal(ref);
  useEffect(() => setBloom(1), []); // inner pages live in the green season

  const synced = booking.packageId === slug;
  useEffect(() => {
    if (!synced) update({ packageId: slug, picks: defaultPicks(slug) });
  }, [slug, synced, update]);

  const { arrival, travellers } = booking;
  const picks = useMemo(() => (synced ? booking.picks : defaultPicks(slug)), [synced, booking.picks, slug]);
  const arrivalValid = bookingDatesValid(arrival, slug);
  const departure = arrival ? activityDate(arrival, pkg.nights) : "";

  const clashes = useMemo(() => {
    const slots: BookingSlot[] = picks.map((p) => {
      const a = ACTIVITIES.find((x) => x.id === p.activityId)!;
      const s = SLOTS.find((x) => x.id === p.slot)!;
      return { id: p.activityId, date: activityDate(arrival || "2027-01-01", p.dayIndex), start: s.start, end: s.start + a.duration };
    });
    const map: Record<string, string[]> = {};
    const name = (id: string) => ACTIVITIES.find((a) => a.id === id)?.name.split(",")[0] ?? id;
    for (const [x, y] of arrivalValid ? findActivityClashes(slots) : []) {
      (map[x] ??= []).push(name(y));
      (map[y] ??= []).push(name(x));
    }
    return map;
  }, [picks, arrival, arrivalValid]);

  const total = calculateTotal({ packageId: slug, activityIds: picks.map((p) => p.activityId), travellers });
  const itinerary = makeItinerary(slug, picks.map((p) => ({ activityId: p.activityId, dayIndex: p.dayIndex })));
  const clashCount = Object.keys(clashes).length;
  const staleCount = arrivalValid
    ? picks.filter((p) => !activityDayAllowed(p.dayIndex, slug) || !activityAvailable(p.activityId, activityDate(arrival, p.dayIndex))).length
    : 0;
  const blocker = !arrivalValid
    ? "Choose valid dates to continue."
    : staleCount > 0
      ? "Move or remove activities that don't run on their day."
      : clashCount > 0
        ? "Resolve the activity clashes to continue."
        : null;

  const dateError = arrival && !arrivalValid
    ? `Your stay (${nightsText(pkg.nights)} from arrival) must start today or later and fit inside ${WINDOWS_TEXT}.`
    : null;
  const setArrival = (next: string) => {
    if (!bookingDatesValid(next, slug)) return update({ arrival: next });
    const theme = defaultPicks(slug, next);
    const current = new Set(picks.map((p) => p.activityId));
    const bad = picks.some((p) => !activityDayAllowed(p.dayIndex, slug) || !activityAvailable(p.activityId, activityDate(next, p.dayIndex)));
    const slots = picks.map((p) => {
      const a = ACTIVITIES.find((x) => x.id === p.activityId)!;
      const sl = SLOTS.find((x) => x.id === p.slot)!;
      return { id: p.activityId, date: activityDate(next, p.dayIndex), start: sl.start, end: sl.start + a.duration };
    });
    if (!bad && findActivityClashes(slots).length === 0) return update({ arrival: next });
    // Re-place the package's theme activities for this arrival; keep any extras the traveller added.
    const replaced = theme.filter((p) => current.has(p.activityId));
    const kept = picks.filter((p) => !theme.some((t) => t.activityId === p.activityId) && !pkg.themeActivities.includes(p.activityId));
    update({ arrival: next, picks: [...replaced, ...kept] });
  };
  const setTravellers = (n: number) => update({ travellers: Math.min(MAX_TRAVELLERS, Math.max(MIN_TRAVELLERS, n)) });
  const inWindow = (w: (typeof BOOKING_WINDOWS)[number]) => arrivalValid && arrival >= w.from && departure <= w.to;

  return (
    <div className="page pd" ref={ref}>
      <PageHero num="02" label={`Package · ${content.name}`} jp={content.jp} title={<>{content.name}</>} />

      <div className="container pd__layout">
        <div className="pd__main">
          <section className="section section--tight" data-reveal>
            <h2 className="eyebrow">Dates</h2>
            <div className="form">
              <div className="field">
                <span className="eyebrow" id="win-label">Travel window</span>
                <div className="chips" role="group" aria-labelledby="win-label">
                  {BOOKING_WINDOWS.map((w) => (
                    <button key={w.id} type="button" className="chip chip--add" aria-pressed={inWindow(w)}
                      onClick={() => setArrival(w.from)}>
                      {windowLabel(w.from, w.to)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="field">
                <label className="eyebrow" htmlFor="arrival">Arrival date</label>
                <input id="arrival" type="date" className="input" value={arrival} min={todayIso()}
                  aria-invalid={!!dateError} aria-describedby="arrival-msg"
                  onChange={(e) => setArrival(e.target.value)} />
                <p id="arrival-msg" className="note" data-bad={!!dateError} role={dateError ? "alert" : undefined}>
                  {dateError ?? (arrivalValid ? `Departs ${longDate(departure)}.` : "Pick a window above or enter a date.")}
                </p>
              </div>
              <div className="field">
                <span className="eyebrow" id="trav-label">Travellers</span>
                <div className="stepper" role="group" aria-labelledby="trav-label">
                  <button type="button" aria-label="One fewer traveller" disabled={travellers <= MIN_TRAVELLERS} onClick={() => setTravellers(travellers - 1)}>−</button>
                  <output aria-live="polite">{travellers}</output>
                  <button type="button" aria-label="One more traveller" disabled={travellers >= MAX_TRAVELLERS} onClick={() => setTravellers(travellers + 1)}>+</button>
                </div>
                <p className="note">Small groups of 4–12. Departs with at least 4 guests.</p>
              </div>
            </div>
          </section>

          <section className="section section--tight" data-reveal>
            <h2 className="eyebrow">Included</h2>
            <ul className="tier__list">{content.inclusions.map((x) => <li key={x}>{x}</li>)}</ul>
            <p className="note">{content.stay.property}: {content.stay.status}.</p>
          </section>

          <section className="section section--tight">
            <div data-reveal>
              <h2 className="sec-title">Your <em>itinerary</em></h2>
              <p className="note">Removed activities aren't refunded.</p>
            </div>
            <ActivityPicker packageId={slug} arrival={arrival} arrivalValid={arrivalValid}
              picks={picks} clashes={clashes} onChange={(next) => update({ picks: next })} />
          </section>

          <section className="section section--tight">
            <ol className="itin" data-reveal aria-label="Itinerary">
              {itinerary.map(([day, title, detail, timing], i) => (
                <li key={day}>
                  <span className="itin__day">{day}{arrivalValid && <small>{shortDate(activityDate(arrival, i))}</small>}</span>
                  <div><h3>{title}</h3><p>{detail}</p><small>{timing}</small></div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="bsum" aria-label="Booking summary">
          <dl className="bsum__facts">
            <div><dt>Package</dt><dd>{content.name}, {pkg.days}D{pkg.nights}N</dd></div>
            <div><dt>Dates</dt><dd>{arrivalValid ? `${shortDate(arrival)} – ${shortDate(departure)}` : "Not set"}</dd></div>
            <div><dt>Travellers</dt><dd>{travellers}</dd></div>
            <div><dt>Base price</dt><dd>{sgd(PACKAGE_PRICES[slug])} pp</dd></div>
            {total.extraActivityTotal > 0 && <div><dt>Extra activities</dt><dd>+{sgd(total.extraActivityTotal)} pp</dd></div>}
          </dl>
          <div className="bsum__price">
            <p className="bsum__pp"><strong>{sgd(total.perPerson)}</strong> <small>per person</small></p>
            <p className="bsum__party">Total <strong>{total.partyTotal === null ? "n/a" : sgd(total.partyTotal)}</strong></p>
          </div>
          <div className="bsum__cta">
            {blocker ? <button type="button" className="pill pill--off" disabled>Continue</button> : <Link to="/book" className="pill">Continue</Link>}
            {blocker && <p className="note" role="status">{blocker}</p>}
          </div>
          <p className="fine bsum__fine">Illustrative prices. Shuttle and partners are proposed. <Link to="/pricing-notes" className="u">How we priced this</Link></p>
        </aside>
      </div>

      <div className="container back"><Link to="/packages" className="u">All packages</Link></div>
    </div>
  );
}

function nightsText(n: number): string {
  return `${n + 1} days, ${n} nights`;
}
