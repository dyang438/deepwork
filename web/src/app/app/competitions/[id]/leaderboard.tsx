"use client";

import type { SealedLiveQuery } from "@neon/realtime/client";
// @neon/realtime-react's build has no "use client" directive: import it only from client modules.
import { useLiveQuery } from "@neon/realtime-react";
import { useCallback, useMemo, useState } from "react";

import { renewOrLeave } from "@/auth/session-lost";
import type { LeaderRow } from "@/lib/competitions";

// Live: a member logging a session (web or CLI) moves the board for everyone watching.
export function Leaderboard({
  competitionId,
  initialRows,
  meId,
  sealedQuery,
}: {
  competitionId: string;
  initialRows: LeaderRow[];
  meId: string;
  sealedQuery: SealedLiveQuery<LeaderRow>;
}) {
  const [query] = useState(sealedQuery);
  const refreshQuery = useCallback(
    () =>
      renewOrLeave<SealedLiveQuery<LeaderRow>>(() =>
        fetch(`/api/competitions/${competitionId}/live-query`, {
          method: "POST",
          cache: "no-store",
          body: JSON.stringify({ userId: meId }),
        }),
      ),
    [competitionId, meId],
  );
  const { data, status } = useLiveQuery(query, { initialData: initialRows, refreshQuery });
  // Live rows don't keep ORDER BY, so rank here: most deep minutes first, then focus.
  const rows = useMemo(
    () =>
      [...(data ?? initialRows)].sort(
        (a, b) => b.minutes - a.minutes || (b.avg_focus ?? -1) - (a.avg_focus ?? -1) || a.display_name.localeCompare(b.display_name),
      ),
    [data, initialRows],
  );
  const top = Math.max(1, ...rows.map((r) => r.minutes));
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <p className="eyebrow m-0 text-[11px]">Leaderboard</p>
        <output className="eyebrow flex items-center gap-2 text-[11px]" data-testid="board-status">
          {status === "live" && <span aria-hidden="true" className="inline-block size-1.5 animate-pulse rounded-full bg-mint" />}
          {status === "live" ? "Live" : status}
        </output>
      </div>
      <ol className="m-0 list-none overflow-hidden rounded-2xl border border-line p-0">
        <li className="grid grid-cols-[2.5rem_1fr_6rem_6rem] gap-3 border-b border-line bg-panel/80 px-4 py-2.5 font-mono text-[11px] text-mist">
          <span>#</span>
          <span>MEMBER</span>
          <span className="text-right">DEEP HOURS</span>
          <span className="text-right">AVG FOCUS</span>
        </li>
        {rows.map((r, i) => (
          <li
            className={`relative grid grid-cols-[2.5rem_1fr_6rem_6rem] items-center gap-3 border-b border-line px-4 py-3.5 last:border-b-0 ${r.user_id === meId ? "bg-mint/5" : ""}`}
            data-testid="leader-row"
            key={r.user_id}
          >
            {/* A faint bar behind each row, scaled to the leader's hours. */}
            <span aria-hidden="true" className="absolute inset-y-0 left-0 bg-mint/[0.07]" style={{ width: `${(r.minutes / top) * 100}%` }} />
            <span className="relative font-mono text-sm text-mist">{i + 1}</span>
            <span className="relative truncate">
              {r.display_name}
              {r.user_id === meId && <span className="ml-2 font-mono text-[11px] text-mint">YOU</span>}
              <span className="ml-2 font-mono text-[11px] text-mist">{r.sessions} {r.sessions === 1 ? "session" : "sessions"}</span>
            </span>
            <span className="relative text-right text-xl tracking-[-0.02em] tabular-nums">{(r.minutes / 60).toFixed(1)}</span>
            <span className="relative text-right text-xl tracking-[-0.02em] tabular-nums">{r.avg_focus == null ? "–" : `${r.avg_focus}%`}</span>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-xs text-mist">Counts sessions since the competition started. Focus is self-reported per session; rate yours on the Personal tab.</p>
    </section>
  );
}
