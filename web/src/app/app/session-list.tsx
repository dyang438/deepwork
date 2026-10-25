"use client";

import type { SealedLiveQuery } from "@neon/realtime/client";
// @neon/realtime-react's build has no "use client" directive: import it only from client modules.
import { useLiveQuery } from "@neon/realtime-react";
import { type FormEvent, startTransition, useCallback, useMemo, useOptimistic, useState } from "react";

import { leaveSession, renewOrLeave } from "@/auth/session-lost";
import type { SessionRow } from "@/lib/sessions"; // type-only: no server code reaches the browser

import { LocalTime } from "../local-time";
import { deleteSession, logSession, setFocus, type WriteResult } from "./actions";

type OptimisticRow = SessionRow & { pending?: true };
type OptimisticAction =
  | { type: "add"; row: SessionRow }
  | { type: "delete"; id: string }
  | { type: "focus"; id: string; focus_pct: number | null };
type Notice = { tone: "error" | "info"; text: string };

// React re-applies pending actions to every new live snapshot, so each case must be safe to re-run.
function applyOptimisticAction(rows: readonly OptimisticRow[], action: OptimisticAction): readonly OptimisticRow[] {
  switch (action.type) {
    case "add":
      return rows.some((r) => r.id === action.row.id) ? rows : [{ ...action.row, pending: true }, ...rows];
    case "delete":
      return rows.filter((r) => r.id !== action.id);
    case "focus":
      return rows.map((r) => (r.id === action.id && r.focus_pct !== action.focus_pct ? { ...r, focus_pct: action.focus_pct, pending: true } : r));
  }
}

// Live rows don't follow the query's ORDER BY, so sort here (the server render runs the same sort).
const newestFirst = (a: OptimisticRow, b: OptimisticRow) =>
  b.started_at.getTime() - a.started_at.getTime() || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0);

const SYNC_TIMEOUT_MS = 10_000;
const FOCUS_STEPS = [100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 0];

function weekStart(now = new Date()) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Monday
  return d;
}

export function SessionList({
  initialSessions,
  sealedQuery,
  userId,
}: {
  initialSessions: SessionRow[];
  sealedQuery: SealedLiveQuery<SessionRow>;
  userId: string;
}) {
  // Keep the first sealed query: every server re-render sends a new object for the same query, and
  // useLiveQuery restarts on each new object. Renewals go through refreshQuery.
  const [query] = useState(sealedQuery);
  const refreshQuery = useCallback(
    () =>
      renewOrLeave<SealedLiveQuery<SessionRow>>(() =>
        fetch("/api/sessions/live-query", { method: "POST", cache: "no-store", body: JSON.stringify({ userId }) }),
      ),
    [userId],
  );
  const { data, status, utils } = useLiveQuery(query, { initialData: initialSessions, refreshQuery });

  const [optimistic, updateOptimistically] = useOptimistic<readonly OptimisticRow[], OptimisticAction>(
    data ?? initialSessions,
    applyOptimisticAction,
  );
  const rows = useMemo(() => [...optimistic].sort(newestFirst), [optimistic]);
  const [notice, setNotice] = useState<Notice | null>(null);

  const week = useMemo(() => {
    const since = weekStart();
    const mine = rows.filter((r) => r.started_at >= since);
    return {
      hours: mine.reduce((m, r) => m + r.minutes, 0) / 60,
      count: mine.length,
      done: mine.filter((r) => r.outcome === "done").length,
    };
  }, [rows]);

  function mutate(action: OptimisticAction, write: () => Promise<WriteResult>, failure: string) {
    setNotice(null);
    startTransition(async () => {
      updateOptimistically(action);
      let result: WriteResult;
      try {
        result = await write();
      } catch {
        setNotice({ tone: "error", text: failure });
        return;
      }
      if (result.kind === "rejected") {
        if (result.reason === "UNAUTHENTICATED") leaveSession();
        else setNotice({ tone: "error", text: failure });
        return;
      }
      if (result.kind === "unchanged") return;
      try {
        await utils.awaitTxId(result.txid, SYNC_TIMEOUT_MS);
      } catch {
        setNotice({ tone: "info", text: "Saved. It will appear when live updates reconnect." });
      }
    });
  }

  function logFromForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fd = new FormData(form);
    const goal = String(fd.get("goal") ?? "").trim();
    const minutes = Number(fd.get("minutes"));
    const outcome = String(fd.get("outcome")) as SessionRow["outcome"];
    const focus_pct = fd.get("focus") ? Number(fd.get("focus")) : null;
    if (!goal || !Number.isInteger(minutes) || minutes < 1) return;
    form.reset();
    const row: SessionRow = { id: crypto.randomUUID(), goal, minutes, outcome, focus_pct, started_at: new Date() };
    mutate(
      { type: "add", row },
      () => logSession(userId, { id: row.id, goal, minutes, outcome: outcome as "done" | "partial" | "not done", focus_pct }),
      `Couldn't log "${goal}".`,
    );
  }

  const input =
    "rounded-full border border-line bg-panel px-4 py-2.5 text-cream outline-none placeholder:text-mist/60 focus:border-mint/70 focus:ring-2 focus:ring-mint/20";
  const liveText = status === "live" ? "Live" : status === "error" ? "Live updates stopped" : status;

  return (
    <section>
      <dl className="mb-10 grid grid-cols-3 overflow-hidden rounded-2xl border border-line">
        {[
          ["Deep hours this week", week.hours.toFixed(1)],
          ["Sessions this week", String(week.count)],
          ["Goals hit", week.count ? `${week.done} of ${week.count}` : "–"],
        ].map(([label, value], i) => (
          <div key={label} className={`bg-panel/80 p-5 ${i ? "border-l border-line" : ""}`}>
            <dt className="eyebrow text-[11px]">{label}</dt>
            <dd className="m-0 mt-2 text-4xl tracking-[-0.04em] tabular-nums" data-testid={label}>
              {value}
            </dd>
          </div>
        ))}
      </dl>

      <form className="flex flex-wrap gap-2" onSubmit={logFromForm}>
        <input aria-label="Goal" autoComplete="off" className={`${input} min-w-0 flex-1`} maxLength={200} name="goal" placeholder="What did this block produce?" required />
        <input aria-label="Minutes" className={`${input} w-24`} defaultValue={90} max={600} min={1} name="minutes" required type="number" />
        <select aria-label="Outcome" className={input} defaultValue="done" name="outcome">
          <option value="done">Done</option>
          <option value="partial">Partial</option>
          <option value="not done">Not done</option>
        </select>
        <select aria-label="Focus" className={input} defaultValue="" name="focus">
          <option value="">Focus %</option>
          {FOCUS_STEPS.map((f) => (
            <option key={f} value={f}>{f}%</option>
          ))}
        </select>
        <button className="cursor-pointer rounded-full bg-cream px-5 py-2.5 font-medium text-ink hover:bg-white" type="submit">
          Log session
        </button>
      </form>

      <div className="mt-4 flex h-6 items-center justify-between text-[13px]">
        <span className={notice?.tone === "error" ? "text-rose" : "text-mist"} role={notice ? "status" : undefined}>
          {notice?.text}
        </span>
        <output className={`eyebrow flex items-center gap-2 text-[11px] ${status === "error" ? "text-rose" : ""}`} data-testid="live-status">
          {status === "live" && <span aria-hidden="true" className="inline-block size-1.5 animate-pulse rounded-full bg-mint" />}
          {liveText}
        </output>
      </div>
      {status === "error" && (
        <button className="mt-2 cursor-pointer text-sm font-medium text-rose" onClick={() => window.location.reload()} type="button">
          Reconnect
        </button>
      )}

      {rows.length === 0 ? (
        <p className="my-8 text-mist">No sessions yet. Log one above, or open this page in a second tab and watch it arrive.</p>
      ) : (
        <ul aria-live="polite" className="my-6 list-none border-t border-line p-0">
          {rows.map((r) => (
            <li
              className={`grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-5 border-b border-line py-4 ${r.pending ? "opacity-50" : ""}`}
              key={r.id}
            >
              <span className="min-w-0 break-words">{r.goal}</span>
              <span className="font-mono text-xs text-mist tabular-nums">
                {r.minutes} MIN · <span className={r.outcome === "done" ? "text-mint" : r.outcome === "partial" ? "text-ochre" : r.outcome === "not done" ? "text-rose" : "text-mist"}>{r.outcome.toUpperCase()}</span>
              </span>
              <select
                aria-label={`Focus for ${r.goal}`}
                className={`cursor-pointer rounded-full border border-line bg-transparent px-2 py-1 font-mono text-xs ${r.focus_pct == null ? "text-mist" : "text-cream"}`}
                onChange={(e) => {
                  const focus_pct = e.target.value === "" ? null : Number(e.target.value);
                  mutate({ type: "focus", id: r.id, focus_pct }, () => setFocus(userId, { id: r.id, focus_pct }), `Couldn't rate "${r.goal}".`);
                }}
                value={r.focus_pct ?? ""}
              >
                <option value="">FOCUS –</option>
                {FOCUS_STEPS.map((f) => (
                  <option key={f} value={f}>FOCUS {f}%</option>
                ))}
              </select>
              <span className="text-xs text-mist">
                <LocalTime date={r.started_at} />
              </span>
              <button
                aria-label={`Delete ${r.goal}`}
                className="cursor-pointer bg-transparent p-2 text-xs text-mist hover:text-rose"
                onClick={() => mutate({ type: "delete", id: r.id }, () => deleteSession(userId, { id: r.id }), `Couldn't delete "${r.goal}".`)}
                type="button"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
