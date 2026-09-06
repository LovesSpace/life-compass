import { useEffect, useMemo, useRef, useState } from "react";

/*
 * A small date picker so the calendar matches the rest of the interface
 * instead of showing the browser's native one, which can't be styled.
 *
 * Values are "YYYY-MM-DD" strings, the same shape <input type="date"> uses,
 * so nothing downstream changes.
 */

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function toKey(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${date.getFullYear()}-${month}-${day}`;
}

function fromKey(key) {
  if (!key) return new Date();

  const [year, month, day] = key.split("-").map(Number);

  return new Date(year, month - 1, day);
}

/** Six rows of seven, so the popover never changes height between months. */
function buildGrid(cursor) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const start = new Date(first);

  start.setDate(1 - first.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function DatePicker({ value, onChange, max }) {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(() => fromKey(value));

  const wrap = useRef(null);

  const selected = value;
  const todayKey = toKey(new Date());
  const maxKey = max || null;

  const days = useMemo(() => buildGrid(cursor), [cursor]);

  useEffect(() => {
    if (open) setCursor(fromKey(value));
  }, [open, value]);

  useEffect(() => {
    if (!open) return undefined;

    function onPointerDown(event) {
      if (wrap.current && !wrap.current.contains(event.target)) {
        setOpen(false);
      }
    }

    function onKeyDown(event) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function pick(date) {
    onChange(toKey(date));
    setOpen(false);
  }

  function shiftMonth(step) {
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + step, 1));
  }

  const label = fromKey(value).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="picker-wrap" ref={wrap}>
      <button
        type="button"
        className="date-button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.7" />
          <path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
        {label}
      </button>

      {open && (
        <div className="cal">
          <div className="cal-head">
            <button
              type="button"
              className="cal-nav"
              onClick={() => shiftMonth(-1)}
              aria-label="Previous month"
            >
              ‹
            </button>

            <span className="cal-month">
              {cursor.toLocaleDateString(undefined, {
                month: "long",
                year: "numeric",
              })}
            </span>

            <button
              type="button"
              className="cal-nav"
              onClick={() => shiftMonth(1)}
              aria-label="Next month"
            >
              ›
            </button>
          </div>

          <div className="cal-grid cal-weekdays">
            {WEEKDAYS.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          <div className="cal-grid">
            {days.map((date) => {
              const key = toKey(date);
              const outside = date.getMonth() !== cursor.getMonth();
              const disabled = maxKey ? key > maxKey : false;

              return (
                <button
                  key={key}
                  type="button"
                  className="cal-day"
                  data-outside={outside}
                  data-today={key === todayKey}
                  aria-pressed={key === selected}
                  disabled={disabled}
                  onClick={() => pick(date)}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <div className="cal-foot">
            <button
              type="button"
              className="btn-bare"
              onClick={() => pick(new Date())}
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DatePicker;