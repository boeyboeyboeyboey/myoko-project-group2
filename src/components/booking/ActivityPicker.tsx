import {
  ACTIVITIES,
  SLOTS,
  activityAvailable,
  activityDate,
  activityDayAllowed,
  getPackage,
  type PackageId,
} from "../../lib/booking";
import type { ActivityPick } from "../../lib/bookingState";
import { hhmm, sgd, shortDate } from "../../lib/format";

interface Props {
  packageId: PackageId;
  arrival: string;
  arrivalValid: boolean;
  picks: ActivityPick[];
  /** activityId -> names of activities it overlaps with. */
  clashes: Record<string, string[]>;
  onChange: (picks: ActivityPick[]) => void;
}

const md = (v: string) => new Date(`2027-${v}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const mins = (n: number) => (n % 60 === 0 ? `${n / 60} h` : `${Math.floor(n / 60)} h ${n % 60} min`);

export default function ActivityPicker({
  packageId, arrival, arrivalValid, picks, clashes, onChange,
}: Props) {
  const { days, themeActivities } = getPackage(packageId);
  const dayIndexes = Array.from({ length: days }, (_, i) => i).filter((i) => activityDayAllowed(i, packageId));
  const dayOpen = (id: ActivityPick["activityId"], d: number) =>
    arrivalValid && activityAvailable(id, activityDate(arrival, d));

  const add = (id: ActivityPick["activityId"]) => {
    const first = dayIndexes.find((d) => dayOpen(id, d));
    if (first === undefined) return;
    onChange([...picks, { activityId: id, dayIndex: first, slot: "morning" }]);
  };
  const patch = (id: string, p: Partial<ActivityPick>) =>
    onChange(picks.map((x) => (x.activityId === id ? { ...x, ...p } : x)));
  const remove = (id: string) => onChange(picks.filter((x) => x.activityId !== id));

  return (
    <ul className="acts">
      {ACTIVITIES.map((a) => {
        const pick = picks.find((p) => p.activityId === a.id);
        const anyOpen = dayIndexes.some((d) => dayOpen(a.id, d));
        const stale = pick && (!activityDayAllowed(pick.dayIndex, packageId) || !dayOpen(a.id, pick.dayIndex));
        const clash = clashes[a.id];
        const themed = themeActivities.includes(a.id);
        const price = themed ? "Included" : `+${sgd(a.priceSgd)}`;
        const priceNote = themed ? (pick ? "in package price" : "removed, not refunded") : "per person";
        return (
          <li key={a.id} className="act" data-picked={!!pick} data-problem={!!(stale || clash)}>
            <div className="act__head">
              <div>
                <h3 className="act__name">{a.name}</h3>
                <p className="act__partner">{a.partnerLabel}</p>
              </div>
              <div className="act__price">
                <strong>{price}</strong>
                <span>{priceNote}</span>
              </div>
            </div>
            <p className="act__desc">{a.description}</p>
            <p className="act__meta">
              {mins(a.duration)} · {a.area} · runs {md(a.season.from)} to {md(a.season.to)}
              <br />
              Price basis: {a.priceBasis.operator}, {a.priceBasis.year ?? "year n/a"}, {a.priceBasis.confidence} confidence.
            </p>

            {!pick ? (
              <button type="button" className="chip chip--add" onClick={() => add(a.id)} disabled={!anyOpen}>
                {!arrivalValid ? "Set a valid arrival date first" : anyOpen ? (themed ? "Add back" : "Add to itinerary") : "Not running on any open day of this stay"}
              </button>
            ) : (
              <div className="act__pick">
                <fieldset className="chips">
                  <legend className="eyebrow">Day</legend>
                  {dayIndexes.map((d) => {
                    const open = dayOpen(a.id, d);
                    return (
                      <button
                        key={d}
                        type="button"
                        className="chip"
                        aria-pressed={pick.dayIndex === d}
                        disabled={!open}
                        title={open ? undefined : "Closed or out of season on this date"}
                        onClick={() => patch(a.id, { dayIndex: d })}
                      >
                        Day {d + 1}{arrivalValid && <small>{shortDate(activityDate(arrival, d))}</small>}
                      </button>
                    );
                  })}
                </fieldset>
                <fieldset className="chips">
                  <legend className="eyebrow">Start</legend>
                  {SLOTS.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className="chip"
                      aria-pressed={pick.slot === s.id}
                      onClick={() => patch(a.id, { slot: s.id })}
                    >
                      {s.label}<small>{hhmm(s.start)}–{hhmm(s.start + a.duration)}</small>
                    </button>
                  ))}
                </fieldset>
                <button type="button" className="link-btn" onClick={() => remove(a.id)}>Remove</button>
                {stale && <p className="note note--warn" role="alert">This activity does not run on the chosen day. Pick another day.</p>}
                {clash && (
                  <p className="note note--warn" role="alert">
                    Clashes with {clash.join(", ")}. Activities need a 30 minute buffer; change the day or start.
                  </p>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
