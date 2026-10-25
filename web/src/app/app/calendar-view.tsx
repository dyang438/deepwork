"use client";

import { useEffect, useMemo, useState } from "react";

import type { SessionRow } from "@/lib/sessions";

import { calendarFeedUrl } from "./calendar-actions";

const HOUR_PX = 30;
const DAY_MS = 86_400_000;
const OUTCOME_COLOR: Record<string, string> = {
  done: "border-mint/70 bg-mint/15",
  partial: "border-ochre/70 bg-ochre/15",
  "not done": "border-rose/70 bg-rose/15",
};

function mondayOf(d: Date) {
  const m = new Date(d);
  m.setHours(0, 0, 0, 0);
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
  return m;
}

// A week of sessions laid out by day and time of day. Left / right arrows step weeks; a block opens the editor.
export function CalendarView({ rows, onOpen }: { rows: readonly SessionRow[]; onOpen: (id: string) => void }) {
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [feed, setFeed] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;
      if (document.querySelector("[data-dw-dialog]")) return;
      const step = e.key === "ArrowLeft" ? -7 : e.key === "ArrowRight" ? 7 : 0;
      if (!step) return;
      e.preventDefault();
      setWeekStart((w) => new Date(w.getTime() + step * DAY_MS));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const days = Array.from({ length: 7 }, (_, i) => new Date(weekStart.getTime() + i * DAY_MS));
  const weekEnd = new Date(weekStart.getTime() + 7 * DAY_MS);
  const inWeek = useMemo(
    () => rows.filter((r) => r.started_at >= weekStart && r.started_at < weekEnd),
    [rows, weekStart, weekEnd],
  );

  // Show the hours that hold sessions, at least 8:00-20:00.
  const startHour = Math.min(8, ...inWeek.map((r) => r.started_at.getHours()));
  const endHour = Math.max(
    20,
    ...inWeek.map((r) => Math.min(24, Math.ceil(r.started_at.getHours() + (r.started_at.getMinutes() + r.minutes) / 60))),
  );
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const totalHours = inWeek.reduce((m, r) => m + r.minutes, 0) / 60;
  const today = new Date().toDateString();
  const label = `${days[0].toLocaleDateString([], { month: "short", day: "numeric" })} – ${days[6].toLocaleDateString([], { month: "short", day: "numeric" })}`;

  async function addToGoogle() {
    const url = feed ?? (await calendarFeedUrl());
    if (!url) return;
    setFeed(url);
    window.open(`https://calendar.google.com/calendar/render?cid=${encodeURIComponent(url.replace(/^https:/, "webcal:"))}`, "_blank");
  }

  return (
    <section>
      <div className="mb-5 flex items-center justify-between gap-4 font-mono text-[11px] uppercase text-mist">
        <div className="flex items-center gap-3">
          <button aria-label="Previous week" className="cursor-pointer bg-transparent px-1 hover:text-cream" onClick={() => setWeekStart((w) => new Date(w.getTime() - 7 * DAY_MS))} type="button">
            ‹
          </button>
          <span className="text-cream">{label}</span>
          <button aria-label="Next week" className="cursor-pointer bg-transparent px-1 hover:text-cream" onClick={() => setWeekStart((w) => new Date(w.getTime() + 7 * DAY_MS))} type="button">
            ›
          </button>
          <span>· {totalHours.toFixed(1)} h</span>
        </div>
        <div className="flex items-center gap-4">
          <button className="cursor-pointer bg-transparent hover:text-cream" onClick={addToGoogle} type="button">
            Add to Google Calendar
          </button>
          {feed && (
            <button
              className="cursor-pointer bg-transparent hover:text-cream"
              onClick={async () => {
                await navigator.clipboard.writeText(feed);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              type="button"
            >
              {copied ? "Copied" : "Copy feed URL"}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-[2.5rem_repeat(7,1fr)] overflow-hidden rounded-2xl border border-line bg-panel/70" data-testid="calendar">
        <div />
        {days.map((d) => (
          <div className={`border-l border-line px-2 py-2 text-center font-mono text-[11px] uppercase ${d.toDateString() === today ? "text-mint" : "text-mist"}`} key={d.toISOString()}>
            {d.toLocaleDateString([], { weekday: "short" })} {d.getDate()}
          </div>
        ))}
        <div className="relative border-t border-line">
          {hours.map((h) => (
            <div className="pr-1.5 text-right font-mono text-[10px] text-mist/60" key={h} style={{ height: HOUR_PX }}>
              {h % 3 === 0 ? `${h}:00` : ""}
            </div>
          ))}
        </div>
        {days.map((d) => (
          <div className="relative border-t border-l border-line" key={d.toISOString()} style={{ height: hours.length * HOUR_PX }}>
            {hours.map((h, i) => (
              <div aria-hidden="true" className="absolute inset-x-0 border-t border-line/50" key={h} style={{ top: i * HOUR_PX }} />
            ))}
            {inWeek
              .filter((r) => r.started_at.toDateString() === d.toDateString())
              .map((r) => {
                const top = (r.started_at.getHours() - startHour + r.started_at.getMinutes() / 60) * HOUR_PX;
                const height = Math.max(14, (r.minutes / 60) * HOUR_PX);
                return (
                  <button
                    className={`absolute inset-x-1 cursor-pointer overflow-hidden rounded-md border-l-2 px-1.5 py-0.5 text-left text-[11px] leading-tight text-cream hover:brightness-125 ${OUTCOME_COLOR[r.outcome] ?? "border-mist/60 bg-cream/10"}`}
                    key={r.id}
                    onClick={() => onOpen(r.id)}
                    style={{ top, height }}
                    title={`${r.goal} · ${r.minutes} min`}
                    type="button"
                  >
                    {r.goal}
                  </button>
                );
              })}
          </div>
        ))}
      </div>
    </section>
  );
}
