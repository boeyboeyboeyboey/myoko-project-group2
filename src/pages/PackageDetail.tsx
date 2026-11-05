import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router";
import PageHero from "../components/PageHero";
import PackagePhoto from "../components/PackagePhoto";
import ActivityPicker from "../components/booking/ActivityPicker";
import SeatsCalendar from "../components/booking/SeatsCalendar";
import { useBookingFlip } from "../components/booking/useBookingFlip";
import { PACKAGE_CONTENT, SHINANO_ALT, dayPhotos } from "../lib/content";
import {
  ACTIVITIES, BOOKING_WINDOWS, MAX_TRAVELLERS, MIN_TRAVELLERS, PACKAGE_PRICES, SLOTS, activityAvailable, activityDate, activityDayAllowed,
  bookingDatesValid, calculateTotal, defaultPicks, findActivityClashes, firstValidArrival, getPackage, makeItinerary, type BookingSlot, type PackageId,
} from "../lib/booking";
import { resetBooking, updateBooking, useBooking } from "../lib/bookingState";
import { contactErrors, makeReference } from "../lib/checkout";
import { hhmm, longDate, sgd, shortDate, todayIso } from "../lib/format";
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
  const seeded = useRef(false);
  useEffect(() => {
    // Make the page bookable on load: keep a valid arrival, else use the first date that fits.
    if (synced && seeded.current) return;
    seeded.current = true;
    const keep = bookingDatesValid(booking.arrival, slug);
    const first = keep ? null : firstValidArrival(slug);
    const arrival = keep ? booking.arrival : first ?? booking.arrival;
    const patch: Parameters<typeof update>[0] = {};
    if (!synced) {
      patch.packageId = slug;
      patch.picks = defaultPicks(slug, keep || first ? arrival : undefined);
    } else if (first) patch.picks = defaultPicks(slug, first);
    if (arrival !== booking.arrival) patch.arrival = arrival;
    if (Object.keys(patch).length) update(patch);
  }, [slug, synced, booking.arrival, update]);

  const { arrival, travellers, voucher, confirmation, contact } = booking;
  const picks = useMemo(() => (synced ? booking.picks : defaultPicks(slug)), [synced, booking.picks, slug]);
  const arrivalValid = bookingDatesValid(arrival, slug);
  const capture = useBookingFlip(ref, [arrival, picks]);
  const edit: typeof update = (patch) => { capture(); update(patch); };
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

  const total = calculateTotal({ packageId: slug, activityIds: picks.map((p) => p.activityId), travellers, voucher });
  const discounted = voucher != null && total.payableTotal !== null && total.discountAmount > 0;
  const itinerary = makeItinerary(slug, picks.map((p) => ({ activityId: p.activityId, dayIndex: p.dayIndex })));
  const picksByDay = itinerary.map((_, i) => picks
    .filter((p) => p.dayIndex === i && activityDayAllowed(p.dayIndex, slug))
    .sort((x, y) => SLOTS.findIndex((q) => q.id === x.slot) - SLOTS.findIndex((q) => q.id === y.slot)));
  const photosByDay = dayPhotos(slug, picksByDay.map((d) => d.map((p) => p.activityId)));
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
    if (!bookingDatesValid(next, slug)) return edit({ arrival: next });
    const theme = defaultPicks(slug, next);
    const current = new Set(picks.map((p) => p.activityId));
    const bad = picks.some((p) => !activityDayAllowed(p.dayIndex, slug) || !activityAvailable(p.activityId, activityDate(next, p.dayIndex)));
    const slots = picks.map((p) => {
      const a = ACTIVITIES.find((x) => x.id === p.activityId)!;
      const sl = SLOTS.find((x) => x.id === p.slot)!;
      return { id: p.activityId, date: activityDate(next, p.dayIndex), start: sl.start, end: sl.start + a.duration };
    });
    if (!bad && findActivityClashes(slots).length === 0) return edit({ arrival: next });
    // Re-place the package's theme activities for this arrival; keep any extras the traveller added.
    const replaced = theme.filter((p) => current.has(p.activityId));
    const kept = picks.filter((p) => !theme.some((t) => t.activityId === p.activityId) && !pkg.themeActivities.includes(p.activityId));
    edit({ arrival: next, picks: [...replaced, ...kept] });
  };
  const setTravellers = (n: number) => update({ travellers: Math.min(MAX_TRAVELLERS, Math.max(MIN_TRAVELLERS, n)) });
  const [name, setName] = useState(contact.name);
  const [email, setEmail] = useState(contact.email);
  const [touched, setTouched] = useState({ name: false, email: false });
  const errs = contactErrors(name, email);
  const confirm = () => {
    setTouched({ name: true, email: true });
    if (blocker || errs.name || errs.email) return;
    updateBooking({ confirmation: makeReference(), contact: { name: name.trim(), email: email.trim() } });
  };

  return (
    <div className="page pd" ref={ref}>
      <PageHero label={`Package · ${content.name}`} jp={content.jp} title={<>{content.name}</>} />

      <div className="container pd__banner">
        <PackagePhoto photo={content.photo} sizes="(min-width: 960px) 60vw, 92vw" eager />
        <p className="pd__credit">{content.photo.credit}</p>
      </div>

      <div className="container pd__layout">
        <div className="pd__main">
          <section className="section section--tight pd__dates" data-reveal>
            <h2 className="eyebrow">Dates</h2>
            <div className="form">
              <div className="field field--cal">
                <span className="eyebrow">Choose your arrival</span>
                <SeatsCalendar packageId={slug} arrival={arrival} arrivalValid={arrivalValid} onPick={setArrival} />
              </div>
              <div className="field">
                <label className="eyebrow" htmlFor="arrival">Arrival date</label>
                <input id="arrival" type="date" className="input" value={arrival} min={todayIso()}
                  aria-invalid={!!dateError} aria-describedby="arrival-msg"
                  onChange={(e) => setArrival(e.target.value)} />
                <p id="arrival-msg" className="note" data-bad={!!dateError} role={dateError ? "alert" : undefined}>
                  {dateError ?? (arrivalValid ? `Departs ${longDate(departure)}.` : "Pick a day above or enter a date.")}
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
            <p className="bsum__pp">
              {discounted && <s className="bsum__was">{sgd(total.perPerson)}</s>}{" "}
              <strong>{sgd(discounted ? Math.round(total.perPerson * (1 - voucher.discount) * 100) / 100 : total.perPerson)}</strong> <small>per person</small>
            </p>
            <p className="bsum__party">
              Total {discounted && <s className="bsum__was">{sgd(total.partyTotal!)}</s>}{" "}
              <strong>{total.payableTotal === null ? "n/a" : sgd(total.payableTotal)}</strong>
            </p>
          </div>
          {discounted && (
            <p className="bsum__party">Winter voucher {voucher.code}: −{sgd(total.discountAmount)}</p>
          )}
          {confirmation ? (
            <div className="bsum__done" role="status">
              <span className="eyebrow">Reference</span>
              <strong className="conf__ref">{confirmation}</strong>
              <p className="note">
                {content.name}, {shortDate(arrival)} – {shortDate(departure)}, {travellers} {travellers === 1 ? "traveller" : "travellers"},{" "}
                {total.payableTotal === null ? "n/a" : sgd(total.payableTotal)}. Demo only: nothing has been booked or charged.
              </p>
              <button type="button" className="pill pill--ghost" onClick={() => resetBooking()}>Start over</button>
            </div>
          ) : (
            <form className="form bsum__form" noValidate onSubmit={(e) => { e.preventDefault(); confirm(); }}>
              <div className="field">
                <label className="eyebrow" htmlFor="c-name">Name</label>
                <input id="c-name" className="input" autoComplete="name" required value={name}
                  aria-invalid={touched.name && !!errs.name} aria-describedby={touched.name && errs.name ? "c-name-err" : undefined}
                  onChange={(e) => setName(e.target.value)} onBlur={() => setTouched((t) => ({ ...t, name: true }))} />
                {touched.name && errs.name && <p id="c-name-err" className="note" data-bad="true" role="alert">{errs.name}</p>}
              </div>
              <div className="field">
                <label className="eyebrow" htmlFor="c-email">Email</label>
                <input id="c-email" type="email" className="input" autoComplete="email" required value={email}
                  aria-invalid={touched.email && !!errs.email} aria-describedby={touched.email && errs.email ? "c-email-err" : undefined}
                  onChange={(e) => setEmail(e.target.value)} onBlur={() => setTouched((t) => ({ ...t, email: true }))} />
                {touched.email && errs.email && <p id="c-email-err" className="note" data-bad="true" role="alert">{errs.email}</p>}
              </div>
              <div className="bsum__cta">
                <button type="submit" className={blocker ? "pill pill--off" : "pill"} disabled={!!blocker}>Confirm demo booking</button>
                {blocker && <p className="note" role="status">{blocker}</p>}
                {!voucher && <p className="note">Winter guest? <Link to="/return" className="u">Apply your voucher</Link></p>}
              </div>
            </form>
          )}
          <ul className="bsum__incl" aria-label="Included">
            {content.inclusions.map((x) => <li key={x}>{x}</li>)}
          </ul>
          <p className="note">{SHINANO_ALT}</p>
          <p className="note">{content.stay.property}: {content.stay.status}.</p>
          <p className="fine bsum__fine">Illustrative prices. Shuttle and partners are proposed. <Link to="/pricing-notes" className="u">How we priced this</Link></p>
        </aside>
      </div>

      <div className="container pd__after">
        <section className="section section--tight pd__rest">
          <h2 className="sec-title pd__ithead" data-reveal>Your <em>itinerary</em></h2>
          <ol className="dcards" data-reveal aria-label="Itinerary">
            {itinerary.map(([day, title, detail, timing], i) => {
              const dayPicks = picksByDay[i];
              const photo = photosByDay[i];
              return (
                <li key={day} className="dcard" data-flip-id={`day-${i}`}>
                  <figure className="dcard__photo">
                    <PackagePhoto photo={photo} sizes="(min-width: 1100px) 22vw, (min-width: 600px) 45vw, 92vw" />
                    <figcaption>{photo.credit}</figcaption>
                  </figure>
                  <div className="dcard__body">
                    <span className="dcard__day">{day}{arrivalValid && <small>{shortDate(activityDate(arrival, i))}</small>}</span>
                    <h3>{title}</h3>
                    {dayPicks.length === 0 ? <p>{detail}</p> : (
                      <ul className="dcard__acts">
                        {dayPicks.map((p) => {
                          const slot = SLOTS.find((q) => q.id === p.slot);
                          return (
                            <li key={p.activityId} className="dcard__act" data-flip-id={`it-${p.activityId}`} data-flip-leaf
                              data-problem={!!clashes[p.activityId]}>
                              {ACTIVITIES.find((x) => x.id === p.activityId)?.name}
                              {slot && <small>{hhmm(slot.start)}–{hhmm(slot.end)}</small>}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    <small className="dcard__timing">{timing}</small>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <section className="section section--tight pd__rest">
          <div data-reveal>
            <h2 className="sec-title">Change your <em>activities</em></h2>
            <p className="note">Removed activities aren't refunded.</p>
          </div>
          <ActivityPicker packageId={slug} arrival={arrival} arrivalValid={arrivalValid}
            picks={picks} clashes={clashes} onChange={(next) => edit({ picks: next })} />
        </section>
      </div>

      <div className="container back"><Link to="/packages" className="u">All packages</Link></div>
    </div>
  );
}

function nightsText(n: number): string {
  return `${n + 1} days, ${n} nights`;
}
