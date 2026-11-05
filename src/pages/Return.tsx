import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router";
import gsap from "gsap";
import PageHero from "../components/PageHero";
import { bookingDatesValid } from "../lib/booking";
import { updateBooking, useBooking } from "../lib/bookingState";
import { DEMO_PASSES, redeemPass, type ReturnPass } from "../lib/returnPass";
import { setBloom } from "../lib/bloom";
import { useReveal } from "../lib/useReveal";

const STEPS = [
  ["Get your voucher", "Handed to you at winter check-in."],
  ["Enter the code", "No name, no email."],
  ["Return in colour", "Take 10% off one green-season package."],
];

const ERRORS: Record<"empty" | "format" | "unknown", string> = {
  empty: "Enter your voucher code first.",
  format: "That does not look like a voucher code. Codes look like MADARAO-2026.",
  unknown: "We do not recognise that code. Check it against your voucher, or try a demo code.",
};

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function Return() {
  const [booking] = useBooking();
  const [searchParams] = useSearchParams();
  const root = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const front = useRef<HTMLDivElement>(null);
  const back = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);
  useReveal(root);
  useEffect(() => setBloom(1), []);

  const voucher = booking.voucher;
  const [value, setValue] = useState(() => (searchParams.get("code") ?? "").trim().toUpperCase());
  const [error, setError] = useState("");
  const [shown, setShown] = useState<ReturnPass | null>(null); // pass on the ticket back
  const flipped = voucher !== null;
  const code = voucher?.code ?? shown?.code ?? "";
  const known = DEMO_PASSES.find((p) => p.code === code);
  const hasSelection = bookingDatesValid(booking.arrival, booking.packageId);

  // Initial pose: voucher already held -> start on the voucher side.
  useLayoutEffect(() => {
    if (!card.current || !front.current || !back.current) return;
    if (reduced()) gsap.set([card.current], { rotateY: 0 });
    gsap.set(card.current, { rotateY: !reduced() && flipped ? 180 : 0 });
    gsap.set(front.current, { opacity: flipped && reduced() ? 0 : 1 });
    gsap.set(back.current, { opacity: flipped && reduced() ? 1 : reduced() ? 0 : 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => { gsap.killTweensOf([card.current, front.current, back.current, field.current]); }, []);

  function flipTo(toBack: boolean, done?: () => void) {
    if (reduced()) {
      const tl = gsap.timeline({ onComplete: done });
      tl.to(toBack ? front.current : back.current, { opacity: 0, duration: 0.4 }, 0)
        .to(toBack ? back.current : front.current, { opacity: 1, duration: 0.4 }, 0);
    } else {
      gsap.to(card.current, { rotateY: toBack ? 180 : 0, duration: 1.1, ease: "power3.inOut", onComplete: done });
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const r = redeemPass(value);
    if (!r.ok) {
      setError(ERRORS[r.reason]);
      if (!reduced() && field.current) {
        gsap.fromTo(field.current, { x: -8 }, { x: 0, duration: 0.5, ease: "elastic.out(1, 0.25)", clearProps: "x" });
      }
      field.current?.focus();
      return;
    }
    setError("");
    setShown(r.pass);
    flipTo(true, () => updateBooking({ voucher: { code: r.pass.code, discount: r.pass.discount } }));
  }

  function remove() {
    updateBooking({ voucher: null });
    setValue("");
    flipTo(false, () => setShown(null));
  }

  return (
    <div className="page page--voucher" ref={root}>
      <PageHero label="Winter voucher" jp="再会"
        title={<>Your winter <em>voucher</em>.</>}
        lede="Handed out at winter check-in. Proposed: PCG would issue it to its own ski guests." />

      <section className="section">
        <div className="container rp">
          <div className="rp__stage" data-reveal>
            <div className="rp__card" ref={card} data-reduced-flip="true">
              <div className="rp__face rp__front" ref={front} aria-hidden={flipped}>
                <span className="eyebrow">Lift ticket · Winter</span>
                <strong className="rp__big">{known?.resort ?? "Madarao Mountain Resort"}</strong>
                <span className="rp__meta">{known?.winterTicket ?? "Winter 2026–27 season ticket"}</span>
                <span className="rp__barcode" aria-hidden="true" />
                <span className="rp__jp" aria-hidden="true">冬</span>
              </div>
              <div className="rp__face rp__back" ref={back} aria-hidden={!flipped} aria-label={flipped ? "Green-season voucher" : undefined}>
                <span className="eyebrow">Winter voucher · Green season</span>
                <strong className="rp__code">{code || "—"}</strong>
                <span className="rp__big">10% off one green-season package.</span>
                <span className="rp__meta">Valid for 2027 trips: 25 May–10 Jun or 1 Sep–10 Oct · illustrative</span>
                <span className="rp__jp" aria-hidden="true">緑</span>
              </div>
            </div>
          </div>

          <div className="rp__panel" data-reveal>
            {!flipped ? (
              <form className="form" onSubmit={onSubmit} noValidate>
                <div className="field">
                  <label htmlFor="pass-code" className="eyebrow">Voucher code</label>
                  <input id="pass-code" ref={field} className="input" value={value} autoComplete="off" spellCheck={false}
                    autoCapitalize="characters" aria-invalid={error ? "true" : "false"} aria-describedby="pass-msg"
                    onChange={(e) => setValue(e.target.value)} placeholder="e.g. MADARAO-2026"
                    // Demo convenience: an empty field fills with the sample code from the voucher card.
                    onFocus={() => { if (!value) setValue("MADARAO-4827"); }} />
                  <p id="pass-msg" className="note" data-bad="true" aria-live="polite">{error}</p>
                  <button type="submit" className="pill">Reveal my voucher</button>
                </div>
                <p className="note">Demo codes: {DEMO_PASSES.map((p) => p.code).join(", ")}</p>
              </form>
            ) : (
              <div className="form" role="status">
                <p className="sec-title">Voucher applied. <em>Welcome back.</em></p>
                <p className="note">Code {voucher.code} now takes {Math.round(voucher.discount * 100)}% off your green-season package.</p>
                <div className="rp__cta">
                  <Link to="/packages" className="pill">Use it on a package</Link>
                  {hasSelection && <Link to="/book" className="pill pill--ghost">Back to your booking</Link>}
                </div>
                <button type="button" className="link-btn" onClick={remove}>Remove voucher</button>
              </div>
            )}
          </div>
        </div>
        <div className="container">
          <p className="fine">Prototype: no real codes exist.</p>
        </div>
      </section>
      <section className="section section--tight">
        <div className="container">
          <ol className="steps" data-reveal>
            {STEPS.map(([h, p], i) => (
              <li key={h}><span className="numeral">0{i + 1}</span><strong>{h}</strong><span className="note">{p}</span></li>
            ))}
          </ol>
        </div>
      </section>

    </div>
  );
}
