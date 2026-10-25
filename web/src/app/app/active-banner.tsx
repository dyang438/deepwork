"use client";

import type { SealedLiveQuery } from "@neon/realtime/client";
// @neon/realtime-react's build has no "use client" directive: import it only from client modules.
import { useLiveQuery } from "@neon/realtime-react";
import { useCallback, useEffect, useState } from "react";

import { renewOrLeave } from "@/auth/session-lost";
import type { ActiveRow } from "@/lib/sessions";

// Live: appears the moment `deepwork <min>` starts in a connected terminal and disappears when it ends.
export function ActiveBanner({
  initial,
  sealedQuery,
  userId,
}: {
  initial: ActiveRow[];
  sealedQuery: SealedLiveQuery<ActiveRow>;
  userId: string;
}) {
  const [query] = useState(sealedQuery);
  const refreshQuery = useCallback(
    () =>
      renewOrLeave<SealedLiveQuery<ActiveRow>>(() =>
        fetch("/api/active/live-query", { method: "POST", cache: "no-store", body: JSON.stringify({ userId }) }),
      ),
    [userId],
  );
  const { data } = useLiveQuery(query, { initialData: initial, refreshQuery });
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, []);

  const active = (data ?? initial)[0];
  // Hidden once past its end: a terminal that crashed never cleared it.
  if (!active || (now !== null && active.ends_at.getTime() <= now)) return null;
  const left = now === null ? null : Math.ceil((active.ends_at.getTime() - now) / 60_000);
  const until = active.ends_at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return (
    <section
      className="mb-8 flex items-center gap-4 rounded-2xl border border-mint/40 bg-mint/10 px-5 py-4"
      data-testid="active-session"
    >
      <span aria-hidden="true" className="inline-block size-2.5 animate-pulse rounded-full bg-mint" />
      <div className="min-w-0 flex-1">
        <p className="eyebrow m-0 text-[11px] text-mint">In a deep work block · from your terminal</p>
        <p className="m-0 mt-1 truncate text-lg">{active.goal}</p>
      </div>
      <p className="m-0 text-right font-mono text-sm text-mist tabular-nums">
        until {until}
        {left !== null && <span className="block text-cream">{left} min left</span>}
      </p>
    </section>
  );
}
