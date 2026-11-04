import { useId, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { PACKAGE_CONTENT } from "../lib/content";
import { defaultPicks, firstValidArrival, getPackage } from "../lib/booking";
import { updateBooking } from "../lib/bookingState";
import { suggestTrip, type TripSuggestion } from "../lib/tripFinder";

export default function TripFinder() {
  const inputId = useId();
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [result, setResult] = useState<TripSuggestion | null>(null);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setResult(suggestTrip(text));
  }

  function bookThis(s: TripSuggestion) {
    const arrival =
      s.window === "A" ? firstValidArrival(s.packageId)
      : s.window === "B" ? firstValidArrival(s.packageId, new Date(2027, 7, 31))
      : null;
    updateBooking({
      packageId: s.packageId,
      picks: defaultPicks(s.packageId, arrival ?? undefined),
      ...(s.travellers ? { travellers: s.travellers } : {}),
      ...(arrival ? { arrival } : {}),
    });
    navigate(`/packages/${s.packageId}`);
  }

  const pkg = result ? getPackage(result.packageId) : null;
  const name = result ? PACKAGE_CONTENT.find((p) => p.slug === result.packageId)?.name ?? "" : "";

  return (
    <div className="trip-finder">
      <form className="trip-finder__form" role="search" onSubmit={onSubmit}>
        <label className="trip-finder__label" htmlFor={inputId}>Describe your trip</label>
        <div className="trip-finder__row">
          <input
            id={inputId}
            className="trip-finder__input"
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. 4 days in September, 2 of us, love kayaking"
            autoComplete="off"
          />
          <button type="submit" className="pill trip-finder__submit">Suggest</button>
        </div>
      </form>

      <div className="trip-finder__result" aria-live="polite">
        {result && pkg && (
          <div className="trip-finder__card">
            <p className="trip-finder__name">
              <span className="tick">{name}</span>
              <span className="trip-finder__len"> · {pkg.days} days / {pkg.nights} nights</span>
            </p>
            {result.reasons.length > 0 && (
              <p className="trip-finder__reasons">{result.reasons.join(" · ")}</p>
            )}
            <button type="button" className="pill" onClick={() => bookThis(result)}>Explore this</button>
          </div>
        )}
      </div>

      <p className="trip-finder__demo">Demo: keyword matching. An AI version is planned.</p>
    </div>
  );
}
