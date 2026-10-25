"use client";

import { useEffect, useState } from "react";

import type { SessionRow } from "@/lib/sessions";

import { calendarFeedUrl } from "./calendar-actions";
import { useActiveSession } from "./active-session";
import { useCalendarEvents } from "./use-calendar-events";

const OUTCOME_COLOR: Record<string, string> = {
  done: "border-mint/70 bg-mint/15",
  partial: "border-ochre/70 bg-ochre/15",
  "not done": "border-rose/70 bg-rose/15",
};

// Today as one column of hours, docked beside the main column: today's sessions and a line for now.
export function TodayStrip({ rows, onOpen, readOnly = false }: { rows: readonly SessionRow[]; onOpen?: (id: string) => void; readOnly?: boolean }) {
  const active = useActiveSession();
  const calendarEvents = useCalendarEvents(!readOnly);
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(t);
  }, []);
  if (!now) return null; // the browser's clock and time zone decide what "today" is

  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  const running = active && active.ends_at > now && active.started_at < dayEnd && active.ends_at > dayStart ? active : null;
  const today = rows.filter((row) => row.started_at < dayEnd &&
    row.started_at.getTime() + row.minutes * 60_000 > dayStart.getTime() &&
    (!running || row.started_at.getTime() !== running.started_at.getTime()));
  const startHour = 0;
  const endHour = 24; // the day runs to midnight
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);
  const span = endHour - startHour;
  // Positions are percentages of the column, so the day stretches to whatever height the strip gets.
  const pct = (h: number) => `${(h / span) * 100}%`;
  const hour = (date: Date) => date <= dayStart ? 0 : date >= dayEnd ? 24 : date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
  const y = (date: Date) => pct(hour(date) - startHour);
  const height = (start: Date, end: Date) => `max(14px, ${((hour(end) - hour(start)) / span) * 100}%)`;

  async function addToGoogle() {
    const url = await calendarFeedUrl();
    if (url) window.open(`https://calendar.google.com/calendar/render?cid=${encodeURIComponent(url.replace(/^https:/, "webcal:"))}`, "_blank");
  }

  return (
    <aside aria-label="Today" className="composer flex h-full flex-col" data-testid="today-strip">
      <div className="mb-2 flex items-baseline justify-between font-mono text-[11px] uppercase">
        <span className="text-cream">{now.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}</span>
        {!readOnly && <button className="cursor-pointer bg-transparent p-0 text-mist/70 hover:text-cream" onClick={addToGoogle} title="Subscribe in Google Calendar" type="button">
          + Google Cal
        </button>}
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
          {/* Google Calendar events, under your sessions and quieter: hatched grey. */}
          {calendarEvents.map((e) => (
            <div
              className="absolute inset-x-0.5 overflow-hidden rounded-md border border-cream/15 bg-[repeating-linear-gradient(135deg,rgb(242_239_226/0.07)_0_4px,transparent_4px_8px)] px-1.5 py-0.5 text-[10px] leading-tight text-mist"
              data-testid="cal-event"
              key={e.start.toISOString() + e.summary}
              style={{ top: y(e.start), height: height(e.start, e.end) }}
              title={`${e.summary} · ${e.start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`}
            >
              {e.summary}
            </div>
          ))}
          {today.map((r) => (
            <button
              className={`absolute inset-x-1 overflow-hidden rounded-md border-l-2 px-1.5 py-0.5 text-left text-[11px] leading-tight text-cream ${readOnly ? "cursor-default" : "cursor-pointer hover:brightness-125"} ${OUTCOME_COLOR[r.outcome] ?? "border-mist/60 bg-cream/10"}`}
              disabled={readOnly}
              key={r.id}
              onClick={() => onOpen?.(r.id)}
              style={{ top: y(r.started_at), height: height(r.started_at, new Date(r.started_at.getTime() + r.minutes * 60_000)) }}
              title={`${r.goal} · ${r.minutes} min`}
              type="button"
            >
              {r.goal}
            </button>
          ))}
          {running && (
            <div
              aria-label={`In progress: ${running.goal}`}
              className="absolute inset-x-1 overflow-hidden rounded-md border-l-2 border-mint/70 bg-mint/5 px-1.5 py-0.5 text-[11px] leading-tight text-cream"
              data-testid="calendar-active-session"
              style={{ top: y(running.started_at), height: height(running.started_at, running.ends_at) }}
            >
              <span aria-hidden="true" className="absolute inset-x-0 top-0 bg-mint/15 transition-[height] duration-1000" style={{ height: `${Math.min(100, Math.max(0, (hour(now) - hour(running.started_at)) / Math.max(1 / 3600, hour(running.ends_at) - hour(running.started_at)) * 100))}%` }} />
              <span className="relative">{running.goal}<span className="ml-1 font-mono text-[9px] text-mint">LIVE</span></span>
            </div>
          )}
          <div aria-hidden="true" className="absolute right-0 -left-1 h-px bg-mint" style={{ top: y(now) }}>
            <span className="absolute -top-[3px] -left-[3px] size-[7px] rounded-full bg-mint" />
          </div>
        </div>
      </div>
    </aside>
  );
}
