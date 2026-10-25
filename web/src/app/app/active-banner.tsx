"use client";

import type { SealedLiveQuery } from "@neon/realtime/client";
// @neon/realtime-react's build has no "use client" directive: import it only from client modules.
import { useLiveQuery } from "@neon/realtime-react";
import { type ReactNode, useCallback, useEffect, useState } from "react";

import { renewOrLeave } from "@/auth/session-lost";
import type { ActiveRow } from "@/lib/sessions";

const pad = (n: number) => String(n).padStart(2, "0");
function clock(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  return h
    ? `${h}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`
    : `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
}

// Live: while `deepwork <min>` runs in a connected terminal, a countdown takes the place of the + row.
export function ActiveBanner({
  initial,
  sealedQuery,
  userId,
  fallback,
  starting,
  onActive,
  onStop,
}: {
  initial: ActiveRow[];
  sealedQuery: SealedLiveQuery<ActiveRow>;
  userId: string;
  fallback: ReactNode; // shown when no block is running
  starting: boolean; // a start was sent to the Mac and hasn't shown up yet
  onActive: () => void;
  onStop: () => void;
}) {
  const [query] = useState(sealedQuery);
  const refreshQuery = useCallback(
    () =>
      renewOrLeave<SealedLiveQuery<ActiveRow>>(() =>
        fetch("/api/active/live-query", {
          method: "POST",
          cache: "no-store",
          body: JSON.stringify({ userId }),
        }),
      ),
    [userId],
  );
  const { data } = useLiveQuery(query, { initialData: initial, refreshQuery });
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const active = (data ?? initial)[0];
  const [stopping, setStopping] = useState(false);
  const live = !!active && (now === null || active.ends_at.getTime() > now);
  useEffect(() => {
    if (live) onActive();
    else setStopping(false);
  }, [live, onActive]);
  // Hidden once past its end: a terminal that crashed never cleared it.
  if (!live && starting)
    return (
      <p
        className="composer eyebrow m-0 flex h-[72px] items-center gap-3 text-[11px]"
        data-testid="starting"
      >
        <span
          aria-hidden="true"
          className="inline-block size-1.5 animate-pulse rounded-full bg-mint"
        />
        Starting on your Mac
      </p>
    );
  if (!live) return <>{fallback}</>;
  const total = active.ends_at.getTime() - active.started_at.getTime();
  const done =
    now === null
      ? 0
      : Math.min(1, Math.max(0, (now - active.started_at.getTime()) / total));
  return (
    <section
      aria-label="Deep work in progress"
      className="composer"
      data-testid="active-session"
    >
      <div className="flex items-end justify-between gap-6">
        <div className="min-w-0 pb-1.5">
          <p
            className="m-0 truncate text-2xl tracking-[-0.02em]"
            title={`Until ${active.ends_at.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`}
          >
            {active.goal}
          </p>
        </div>
        <div className="group flex items-end gap-4">
          <button
            className={`cursor-pointer bg-transparent pb-1.5 font-mono text-[11px] text-mist transition hover:text-rose ${stopping ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus:opacity-100"}`}
            disabled={stopping}
            onClick={() => {
              setStopping(true);
              onStop();
            }}
            type="button"
          >
            {stopping ? "ENDING…" : "END"}
          </button>
          <p
            className="m-0 font-mono text-6xl leading-none font-light tracking-[-0.04em] text-cream tabular-nums"
            role="timer"
          >
            {now === null ? "" : clock(active.ends_at.getTime() - now)}
          </p>
        </div>
      </div>
      <div aria-hidden="true" className="mt-5 h-px w-full bg-line">
        <div
          className="h-px bg-mint transition-[width] duration-1000 ease-linear"
          style={{ width: `${done * 100}%` }}
        />
      </div>
    </section>
  );
}
