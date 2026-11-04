import { useMemo, useRef, type KeyboardEvent } from "react";
import { BOOKING_WINDOWS, SEATS_TOTAL, activityDate, bookingDatesValid, getPackage, seatsLeft, type PackageId } from "../../lib/booking";

interface Props {
  packageId: PackageId;
  arrival: string;
  arrivalValid: boolean;
  onPick: (iso: string) => void;
}

const WD = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const iso = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d)).toISOString().slice(0, 10);
/** Monday-first weekday index (0..6) of a calendar day. */
const wdIndex = (y: number, m: number, d: number) => (new Date(Date.UTC(y, m, d)).getUTCDay() + 6) % 7;

interface Month { y: number; m: number; key: string }
/** Months touched by one booking window, in order. */
function windowMonths(from: string, to: string): Month[] {
  const out: Month[] = [];
  let y = +from.slice(0, 4), m = +from.slice(5, 7) - 1;
  const ey = +to.slice(0, 4), em = +to.slice(5, 7) - 1;
  while (y < ey || (y === ey && m <= em)) {
    out.push({ y, m, key: `${y}-${m}` });
    if (++m > 11) { m = 0; y++; }
  }
  return out;
}

export default function SeatsCalendar({ packageId, arrival, arrivalValid, onPick }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const { nights } = getPackage(packageId);
  const departure = arrivalValid ? activityDate(arrival, nights) : "";

  const wins = useMemo(() => BOOKING_WINDOWS.map((w) => ({ ...w, months: windowMonths(w.from, w.to) })), []);
  const firstValid = useMemo(() => {
    for (const w of wins) for (const mo of w.months) {
      for (let d = 1; d <= 31; d++) {
        const v = iso(mo.y, mo.m, d);
        if (v >= w.from && v <= w.to && bookingDatesValid(v, packageId)) return v;
      }
    }
    return "";
  }, [wins, packageId]);
  const tabbable = arrivalValid ? arrival : firstValid;

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    const cur = (e.target as HTMLElement).dataset.iso;
    if (!step || !cur) return;
    e.preventDefault();
    for (let k = 1; k <= 62; k++) {
      const next = activityDate(cur, step * k);
      const el = root.current?.querySelector<HTMLButtonElement>(`button[data-iso="${next}"]:not(:disabled)`);
      if (el) { el.focus(); return; }
    }
  };

  return (
    <div className="cal" ref={root} onKeyDown={onKeyDown}>
      {wins.map((w) => (
        <div className="cal__win" key={w.id}>
          {w.months.map((mo) => {
            const lead = wdIndex(mo.y, mo.m, 1);
            const count = new Date(Date.UTC(mo.y, mo.m + 1, 0)).getUTCDate();
            return (
              <div className="cal__month" key={mo.key} role="group" aria-label={`${MONTH_LONG[mo.m]} ${mo.y}`}>
                <h3 className="cal__title">{MONTH_LONG[mo.m]} {mo.y}</h3>
                <div className="cal__grid">
                  {WD.map((d) => <span className="cal__wd" key={d} aria-hidden="true">{d[0]}</span>)}
                  {Array.from({ length: lead }, (_, i) => <span key={`l${i}`} />)}
                  {Array.from({ length: count }, (_, i) => {
                    const d = i + 1;
                    const v = iso(mo.y, mo.m, d);
                    const inWin = v >= w.from && v <= w.to;
                    const ok = inWin && bookingDatesValid(v, packageId);
                    const left = ok ? seatsLeft(packageId, v) : 0;
                    const name = `${WD[wdIndex(mo.y, mo.m, d)]} ${d} ${MON[mo.m]} ${mo.y}`;
                    const pos = arrivalValid && v >= arrival && v <= departure ? (v === arrival ? "start" : v === departure ? "end" : "mid") : undefined;
                    return (
                      <button key={v} type="button" className="cal__day" data-iso={v} data-range={pos}
                        data-low={ok && left <= 3} data-out={!inWin}
                        disabled={!ok} aria-pressed={ok ? v === arrival : undefined}
                        tabIndex={v === tabbable ? 0 : -1}
                        aria-label={ok ? `${name}, ${left} ${left === 1 ? "seat" : "seats"} left` : `${name}, unavailable`}
                        onClick={() => onPick(v)}>
                        <span className="cal__num">{d}</span>
                        {ok && (
                          <>
                            <span className="cal__bar" aria-hidden="true"><i style={{ width: `${(left / SEATS_TOTAL) * 100}%` }} /></span>
                            <span className="cal__left" aria-hidden="true">{left <= 3 ? `${left} left` : left}</span>
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ))}
      <p className="note cal__note">Seats left per departure. Seat counts are demo data.</p>
    </div>
  );
}
