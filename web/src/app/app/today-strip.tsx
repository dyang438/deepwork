"use client";

import { useEffect, useState } from "react";

import type { SessionRow } from "@/lib/sessions";

import { calendarFeedUrl } from "./calendar-actions";

const HOUR_PX = 22;
const OUTCOME_COLOR: Record<string, string> = {
  done: "border-mint/70 bg-mint/15",
  partial: "border-ochre/70 bg-ochre/15",
  "not done": "border-rose/70 bg-rose/15",
};

// Today as one column of hours, docked beside the main column: today's sessions and a line for now.
export function TodayStrip({ rows, onOpen }: { rows: readonly SessionRow[]; onOpen: (id: string) => void }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  if (!now) return null; // the browser's clock and time zone decide what "today" is

  const today = rows.filter((r) => r.started_at.toDateString() === now.toDateString());
  const startHour = Math.min(8, now.getHours(), ...today.map((r) => r.started_at.getHours()));
  const endHour = Math.max(
    20,
    now.getHours() + 1,
    ...today.map((r) => Math.min(24, Math.ceil(r.started_at.getHours() + (r.started_at.getMinutes() + r.minutes) / 60))),
  );
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const y = (d: Date) => (d.getHours() - startHour + d.getMinutes() / 60) * HOUR_PX;

  async function addToGoogle() {
    const url = await calendarFeedUrl();
    if (url) window.open(`https://calendar.google.com/calendar/render?cid=${encodeURIComponent(url.replace(/^https:/, "webcal:"))}`, "_blank");
  }

  return (
    <aside aria-label="Today" className="composer" data-testid="today-strip">
      <div className="mb-2 flex items-baseline justify-between font-mono text-[11px] uppercase">
        <span className="text-cream">{now.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}</span>
        <button className="cursor-pointer bg-transparent p-0 text-mist/70 hover:text-cream" onClick={addToGoogle} title="Subscribe in Google Calendar" type="button">
          + Google Cal
        </button>
      </div>
      <div className="relative grid grid-cols-[2.25rem_1fr]">
        <div>
          {hours.map((h) => (
            <div className="pr-1.5 text-right font-mono text-[10px] leading-none text-mist/50" key={h} style={{ height: HOUR_PX }}>
              {h % 2 === 0 ? `${h}:00` : ""}
            </div>
          ))}
        </div>
        <div className="relative border-l border-line" style={{ height: hours.length * HOUR_PX }}>
          {hours.map((h, i) => (
            <div aria-hidden="true" className="absolute inset-x-0 border-t border-line/40" key={h} style={{ top: i * HOUR_PX }} />
          ))}
          {today.map((r) => (
            <button
              className={`absolute inset-x-1 cursor-pointer overflow-hidden rounded-md border-l-2 px-1.5 py-0.5 text-left text-[11px] leading-tight text-cream hover:brightness-125 ${OUTCOME_COLOR[r.outcome] ?? "border-mist/60 bg-cream/10"}`}
              key={r.id}
              onClick={() => onOpen(r.id)}
              style={{ top: y(r.started_at), height: Math.max(14, (r.minutes / 60) * HOUR_PX) }}
              title={`${r.goal} · ${r.minutes} min`}
              type="button"
            >
              {r.goal}
            </button>
          ))}
          <div aria-hidden="true" className="absolute right-0 -left-1 h-px bg-mint" style={{ top: y(now) }}>
            <span className="absolute -top-[3px] -left-[3px] size-[7px] rounded-full bg-mint" />
          </div>
        </div>
      </div>
    </aside>
  );
}
