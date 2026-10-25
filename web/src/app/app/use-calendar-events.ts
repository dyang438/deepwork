"use client";

import { useEffect, useState } from "react";

export type CalEvent = { summary: string; start: Date; end: Date };

// Google Calendar events for the browser's local day, if Calendar is connected. Refetched every 5 minutes.
export function useCalendarEvents(enabled = true): CalEvent[] {
  const [events, setEvents] = useState<CalEvent[]>([]);
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    const load = () => {
      const from = new Date(new Date().setHours(0, 0, 0, 0));
      const to = new Date(from.getTime() + 86_400_000);
      fetch(`/api/calendar/next?from=${from.toISOString()}&to=${to.toISOString()}`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((s: { connected: boolean; events?: { summary: string; start: string; end: string }[] } | null) => {
          if (live) setEvents(s?.connected ? (s.events ?? []).map((e) => ({ summary: e.summary, start: new Date(e.start), end: new Date(e.end) })) : []);
        })
        .catch(() => {});
    };
    load();
    const t = setInterval(load, 300_000);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, [enabled]);
  return events;
}
