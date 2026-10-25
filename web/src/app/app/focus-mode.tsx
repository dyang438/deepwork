"use client";

import type { SealedLiveQuery } from "@neon/realtime/client";
import { useLiveQuery } from "@neon/realtime-react";
import Image from "next/image";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";

import roses from "../../../public/roses.jpg";
import { renewOrLeave } from "@/auth/session-lost";
import type { ActiveRow, SessionRow } from "@/lib/sessions";

import { stopBlock } from "./actions";
import { ActiveSessionContext } from "./active-session";
import { SessionNotepad } from "./session-notepad";
import { TodayStrip } from "./today-strip";
import { useNotepad } from "./use-notepad";

function clock(ms: number) {
  const minutes = Math.max(0, Math.floor(ms / 60_000));
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
}

function FocusCalendar({
  initial,
  sealedQuery,
  userId,
  onClose,
}: {
  initial: SessionRow[];
  sealedQuery: SealedLiveQuery<SessionRow>;
  userId: string;
  onClose: () => void;
}) {
  const [query] = useState(sealedQuery);
  const refreshQuery = useCallback(() =>
    renewOrLeave<SealedLiveQuery<SessionRow>>(() => fetch("/api/sessions/live-query", {
      method: "POST", cache: "no-store", body: JSON.stringify({ userId }),
    })), [userId]);
  const { data } = useLiveQuery(query, { initialData: initial, refreshQuery });
  return (
    <div className="composer fixed top-[10vh] right-5 bottom-[10vh] z-20 w-64 border border-line bg-ink/95 p-4">
      <button aria-label="Close calendar" className="absolute -top-7 right-0 cursor-pointer bg-transparent text-lg text-mist hover:text-cream" onClick={onClose} type="button">×</button>
      <TodayStrip readOnly rows={data ?? initial} />
    </div>
  );
}

export function FocusMode({
  active: initial,
  children,
  initialNotepad,
  serverNow,
  sessions,
  userId,
}: {
  active: { rows: ActiveRow[]; sealedQuery: SealedLiveQuery<ActiveRow> };
  children: ReactNode;
  initialNotepad: string;
  serverNow: number;
  sessions: { rows: SessionRow[]; sealedQuery: SealedLiveQuery<SessionRow> };
  userId: string;
}) {
  const [query] = useState(initial.sealedQuery);
  const refreshQuery = useCallback(() =>
    renewOrLeave<SealedLiveQuery<ActiveRow>>(() => fetch("/api/active/live-query", {
      method: "POST", cache: "no-store", body: JSON.stringify({ userId }),
    })), [userId]);
  const { data, status } = useLiveQuery(query, { initialData: initial.rows, refreshQuery });
  const [now, setNow] = useState(serverNow);
  const [notesOpen, setNotesOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const notes = useNotepad(userId, initialNotepad);
  const flushNotes = notes.flush;
  const active = (data ?? initial.rows)[0];
  const live = !!active && active.ends_at.getTime() > now;
  const keys = useRef({ live, notesOpen, flushNotes });
  keys.current = { live, notesOpen, flushNotes };

  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (live) return;
    setNotesOpen(false);
    setCalendarOpen(false);
    setStopping(false);
    setError(null);
    void flushNotes();
  }, [live, flushNotes]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const current = keys.current;
      if (!current.live) return;
      if (event.key === "s" && (event.metaKey || event.ctrlKey) && current.notesOpen) {
        event.preventDefault();
        void current.flushNotes();
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "Escape") {
        event.preventDefault();
        setNotesOpen(false);
        setCalendarOpen(false);
        void current.flushNotes();
        return;
      }
      const target = event.target as HTMLElement;
      if (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (event.key === "n") {
        event.preventDefault();
        setNotesOpen((value) => !value);
        void current.flushNotes();
      } else if (event.key === "c") {
        event.preventDefault();
        setCalendarOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function end() {
    if (stopping) return;
    setStopping(true);
    setError(null);
    void flushNotes();
    try {
      const result = await stopBlock(userId);
      if (!result.ok) throw new Error();
    } catch {
      setStopping(false);
      setError("Couldn't end the session. Try again.");
    }
  }

  const progress = live
    ? Math.min(1, Math.max(0, (now - active.started_at.getTime()) / Math.max(1, active.ends_at.getTime() - active.started_at.getTime())))
    : 0;

  return (
    <ActiveSessionContext.Provider value={live ? active : null}>
      {live ? (
        <main className="relative min-h-dvh bg-ink" data-testid="focus-mode">
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] overflow-hidden">
            <Image alt="" className="object-cover object-[50%_25%] opacity-35" fill priority sizes="100vw" src={roses} />
            <div className="absolute inset-0 bg-gradient-to-b from-ink/20 via-ink/70 to-ink" />
          </div>
          <div className="relative mx-auto w-full max-w-3xl px-5 pt-[18vh] pb-20">
            <section aria-label="Deep work in progress" className="composer text-center" data-testid="active-session">
              <p className="m-0 mb-6 text-lg tracking-[-0.02em] text-mist">{active.goal}</p>
              <p aria-label="Time remaining" className="m-0 font-mono text-7xl leading-none font-light tracking-[-0.05em] text-cream tabular-nums sm:text-8xl" role="timer">
                {clock(active.ends_at.getTime() - now)}
              </p>
              <button className="mt-6 cursor-pointer bg-transparent p-0 font-mono text-[11px] uppercase text-mist/60 hover:text-rose disabled:opacity-50" disabled={stopping} onClick={() => void end()} type="button">
                {stopping ? "Ending…" : "End"}
              </button>
              {error && <p className="mt-3 text-xs text-rose" role="alert">{error}</p>}
              <div aria-hidden="true" className="mt-10 h-px w-full bg-line">
                <div className="h-px bg-mint/60 transition-[width] duration-1000 ease-linear" style={{ width: `${progress * 100}%` }} />
              </div>
            </section>
            <SessionNotepad notes={notes} onToggle={() => {
              setNotesOpen((value) => !value);
              void flushNotes();
            }} open={notesOpen} />
          </div>
          {calendarOpen && <FocusCalendar initial={sessions.rows} onClose={() => setCalendarOpen(false)} sealedQuery={sessions.sealedQuery} userId={userId} />}
        </main>
      ) : children}
      {status === "error" && <button className="fixed bottom-5 left-1/2 z-30 -translate-x-1/2 cursor-pointer bg-ink px-3 py-2 text-xs text-rose" onClick={() => window.location.reload()} type="button">Reconnect session updates</button>}
    </ActiveSessionContext.Provider>
  );
}
