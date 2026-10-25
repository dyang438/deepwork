"use client";

import { useEffect, useState } from "react";

import type { SessionRow } from "@/lib/sessions";

import { calendarFeedUrl } from "./calendar-actions";

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
  const startHour = Math.min(7, now.getHours(), ...today.map((r) => r.started_at.getHours()));
  const endHour = 24; // the day runs to midnight
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const span = hours.length;
  // Positions are percentages of the column, so the day stretches to whatever height the strip gets.
  const pct = (h: number) => `${(h / span) * 100}%`;
  const y = (d: Date) => pct(d.getHours() - startHour + d.getMinutes() / 60);

  async function addToGoogle() {
    const url = await calendarFeedUrl();
    if (url) window.open(`https://calendar.google.com/calendar/render?cid=${encodeURIComponent(url.replace(/^https:/, "webcal:"))}`, "_blank");
  }

  return (
    <aside aria-label="Today" className="composer flex h-full flex-col" data-testid="today-strip">
      <div className="mb-2 flex items-baseline justify-between font-mono text-[11px] uppercase">
        <span className="text-cream">{now.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}</span>
        <button className="cursor-pointer bg-transparent p-0 text-mist/70 hover:text-cream" onClick={addToGoogle} title="Subscribe in Google Calendar" type="button">
          + Google Cal
        </button>
      </div>
      <div className="relative grid min-h-0 flex-1 grid-cols-[2.25rem_1fr]">
        <div className="relative">
          {hours.map((h, i) =>
            h % 2 === 0 ? (
              <div className="absolute right-1.5 -translate-y-1/2 font-mono text-[10px] leading-none text-mist/50" key={h} style={{ top: pct(i) }}>
                {h}:00
              </div>
            ) : null,
          )}
        </div>
        <div className="relative border-l border-line">
          {hours.map((h, i) => (
            <div aria-hidden="true" className="absolute inset-x-0 border-t border-line/40" key={h} style={{ top: pct(i) }} />
          ))}
          {today.map((r) => (
            <button
              className={`absolute inset-x-1 cursor-pointer overflow-hidden rounded-md border-l-2 px-1.5 py-0.5 text-left text-[11px] leading-tight text-cream hover:brightness-125 ${OUTCOME_COLOR[r.outcome] ?? "border-mist/60 bg-cream/10"}`}
              key={r.id}
              onClick={() => onOpen(r.id)}
              style={{ top: y(r.started_at), height: `max(14px, ${(r.minutes / 60 / span) * 100}%)` }}
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
