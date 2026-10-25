"use client";

import type { SealedLiveQuery } from "@neon/realtime/client";
// @neon/realtime-react's build has no "use client" directive: import it only from client modules.
import { useLiveQuery } from "@neon/realtime-react";
import {
  type FormEvent,
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useOptimistic,
  useRef,
  useState,
} from "react";

import { leaveSession, renewOrLeave } from "@/auth/session-lost";
import type { ActiveRow, AgentRow, SessionRow } from "@/lib/sessions"; // type-only: no server code reaches the browser
import type { Defaults } from "@/lib/settings";

import { LocalTime } from "../local-time";
import { ActiveBanner } from "./active-banner";
import {
  deleteSession,
  logSession,
  setFocus,
  startBlock,
  stopBlock,
  updateSession,
  type WriteResult,
} from "./actions";
import { TodayStrip } from "./today-strip";
import { ConfirmDelete } from "./confirm-delete";
import { SessionDrawer, type SessionEdit } from "./session-drawer";

type OptimisticRow = SessionRow & { pending?: true };
type OptimisticAction =
  | { type: "add"; row: SessionRow }
  | { type: "delete"; id: string }
  | { type: "focus"; id: string; focus_pct: number | null }
  | { type: "edit"; id: string; edit: SessionEdit };
type Notice = { tone: "error" | "info"; text: string };

// React re-applies pending actions to every new live snapshot, so each case must be safe to re-run.
function applyOptimisticAction(
  rows: readonly OptimisticRow[],
  action: OptimisticAction,
): readonly OptimisticRow[] {
  switch (action.type) {
    case "add":
      return rows.some((r) => r.id === action.row.id)
        ? rows
        : [{ ...action.row, pending: true }, ...rows];
    case "delete":
      return rows.filter((r) => r.id !== action.id);
    case "focus":
      return rows.map((r) =>
        r.id === action.id && r.focus_pct !== action.focus_pct
          ? { ...r, focus_pct: action.focus_pct, pending: true }
          : r,
      );
    case "edit":
      return rows.map((r) =>
        r.id === action.id ? { ...r, ...action.edit, pending: true } : r,
      );
  }
}

// Live rows don't follow the query's ORDER BY, so sort here (the server render runs the same sort).
const newestFirst = (a: OptimisticRow, b: OptimisticRow) =>
  b.started_at.getTime() - a.started_at.getTime() ||
  (a.id < b.id ? 1 : a.id > b.id ? -1 : 0);

const SYNC_TIMEOUT_MS = 10_000;
const FOCUS_STEPS = [100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 0];

function weekStart(now = new Date()) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Monday
  return d;
}

export function SessionList({
  active,
  agent,
  defaults,
  initialSessions,
  sealedQuery,
  userId,
}: {
  active: { rows: ActiveRow[]; sealedQuery: SealedLiveQuery<ActiveRow> };
  agent: { rows: AgentRow[]; sealedQuery: SealedLiveQuery<AgentRow> };
  defaults: Defaults;
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
        fetch("/api/sessions/live-query", {
          method: "POST",
          cache: "no-store",
          body: JSON.stringify({ userId }),
        }),
      ),
    [userId],
  );
  const { data, status, utils } = useLiveQuery(query, {
    initialData: initialSessions,
    refreshQuery,
  });

  const [optimistic, updateOptimistically] = useOptimistic<
    readonly OptimisticRow[],
    OptimisticAction
  >(data ?? initialSessions, applyOptimisticAction);
  const rows = useMemo(() => [...optimistic].sort(newestFirst), [optimistic]);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [composing, setComposing] = useState(false);

  // Is `deepwork agent` running on a Mac? It checks in at least every ~15 s; past 45 s it counts as offline.
  const [agentSealed] = useState(agent.sealedQuery);
  const refreshAgent = useCallback(
    () =>
      renewOrLeave<SealedLiveQuery<AgentRow>>(() =>
        fetch("/api/agent/live-query", {
          method: "POST",
          cache: "no-store",
          body: JSON.stringify({ userId }),
        }),
      ),
    [userId],
  );
  const agentRow = (useLiveQuery(agentSealed, {
    initialData: agent.rows,
    refreshQuery: refreshAgent,
  }).data ?? agent.rows)[0];
  const [clockNow, setClockNow] = useState<number | null>(null);
  useEffect(() => {
    setClockNow(Date.now());
    const t = setInterval(() => setClockNow(Date.now()), 5000);
    return () => clearInterval(t);
  }, []);
  const macOnline =
    !!agentRow &&
    clockNow !== null &&
    clockNow - agentRow.seen_at.getTime() < 45_000;
  const [starting, setStarting] = useState(false);
  useEffect(() => {
    if (!starting) return;
    const t = setTimeout(() => {
      setStarting(false);
      setNotice({
        tone: "error",
        text: "Your Mac didn't pick it up. Is deepwork agent running?",
      });
    }, 20_000);
    return () => clearTimeout(t);
  }, [starting]);
  const onActive = useCallback(() => setStarting(false), []);

  function startFromForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    const goal = String(fd.get("goal") ?? "").trim();
    const minutes = Number(fd.get("minutes"));
    if (!goal || !Number.isInteger(minutes) || minutes < 1) return;
    setComposing(false);
    setNotice(null);
    setStarting(true);
    startTransition(async () => {
      const r = await startBlock(userId, { goal, minutes }).catch(() => null);
      if (!r?.ok) {
        setStarting(false);
        if (r?.reason === "UNAUTHENTICATED") leaveSession();
        else setNotice({ tone: "error", text: "Couldn't start the block." });
      }
    });
  }

  // Keyboard, outside text fields: + opens the composer, h / l switch today/week, and arrows move through sessions.
  const [sel, setSel] = useState(-1);
  const [editing, setEditing] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<OptimisticRow | null>(null); // the delete dialog
  // Which view the Personal tab shows: the overview, the session history (h / Down), or the calendar (c).
  const [view, setView] = useState<"overview" | "history">("overview");
  const [showToday, setShowToday] = useState(true);
  const history = view === "history";
  const setHistory = (on: boolean) => setView(on ? "history" : "overview");
  const keys = useRef({
    rows: [] as readonly OptimisticRow[],
    sel,
    composing,
    editing,
    history,
    view,
  });
  keys.current = { rows, sel, composing, editing, history, view };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const k = keys.current;
      if (e.metaKey || e.ctrlKey || e.altKey || k.composing || k.editing)
        return;
      if (
        t.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) ||
        document.querySelector("[data-dw-dialog]")
      )
        return;
      if (e.key === "+" || e.key === "=") {
        setHistory(false); // the composer lives on the overview
        setComposing(true);
      } else if (e.key === "c") setShowToday((v) => !v);
      else if (e.key === "h" && !k.history) {
        setView("history");
        setSel(k.rows.length ? 0 : -1);
      } else if ((e.key === "ArrowDown" || e.key === "j") && !k.history) {
        setHistory(true);
        setSel(k.rows.length ? 0 : -1);
      } else if (e.key === "ArrowDown" || e.key === "j")
        setSel(Math.min(k.sel + 1, k.rows.length - 1));
      else if (
        (e.key === "ArrowUp" || e.key === "k") &&
        k.history &&
        k.sel <= 0
      ) {
        setHistory(false); // Up past the top goes back to the overview.
        setSel(-1);
      } else if ((e.key === "ArrowUp" || e.key === "k") && k.history)
        setSel(Math.max(k.sel - 1, 0));
      else if (e.key === "Escape" && k.history) {
        setHistory(false);
        setSel(-1);
      } else if (e.key === "Enter" && k.rows[k.sel])
        setEditing(k.rows[k.sel].id);
      else if (e.key === "d" && k.rows[k.sel]) setConfirming(k.rows[k.sel]);
      else if (e.key === "t" && !k.history) setRange("today");
      else if ((e.key === "l" || e.key === "w") && !k.history) setRange("week");
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    document
      .querySelector(`[data-row="${sel}"]`)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [sel]);
  const editingRow = rows.find((r) => r.id === editing);

  function saveEdit(id: string, edit: SessionEdit | null) {
    setEditing(null);
    if (!edit) return;
    mutate(
      { type: "edit", id, edit },
      () =>
        updateSession(userId, {
          id,
          goal: edit.goal,
          minutes: edit.minutes,
          outcome: edit.outcome as
            "done" | "partial" | "not done" | "unrecorded",
          focus_pct: edit.focus_pct,
          notes: edit.notes,
          started_at: edit.started_at.toISOString(),
        }),
      `Couldn't save "${edit.goal}".`,
    );
  }

  const [range, setRange] = useState<"today" | "week">("today");
  const week = useMemo(() => {
    if (clockNow === null) return null; // server render: the server's time zone isn't yours, so wait for the browser
    const since =
      range === "week"
        ? weekStart()
        : new Date(new Date().setHours(0, 0, 0, 0));
    const mine = rows.filter((r) => r.started_at >= since);
    return {
      hours: mine.reduce((m, r) => m + r.minutes, 0) / 60,
      count: mine.length,
      done: mine.filter((r) => r.outcome === "done").length,
    };
  }, [rows, range, clockNow === null]);

  function mutate(
    action: OptimisticAction,
    write: () => Promise<WriteResult>,
    failure: string,
  ) {
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
        setNotice({
          tone: "info",
          text: "Saved. It will appear when live updates reconnect.",
        });
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
    setComposing(false);
    const row: SessionRow = {
      id: crypto.randomUUID(),
      goal,
      minutes,
      outcome,
      focus_pct,
      notes: null,
      started_at: new Date(),
    };
    mutate(
      { type: "add", row },
      () =>
        logSession(userId, {
          id: row.id,
          goal,
          minutes,
          outcome: outcome as "done" | "partial" | "not done",
          focus_pct,
        }),
      `Couldn't log "${goal}".`,
    );
  }

  // Inline text controls for the composer: no boxes, just mono text that reads like a sentence.
  const quiet =
    "cursor-pointer appearance-none border-0 border-b border-transparent bg-transparent p-0 font-mono text-xs uppercase text-mist outline-none [field-sizing:content] hover:text-cream focus:border-mint/60 focus:text-cream";

  return (
    <section className="relative">
      {showToday && (
        <div className="hidden min-[1360px]:absolute min-[1360px]:top-0 min-[1360px]:left-full min-[1360px]:ml-10 min-[1360px]:block min-[1360px]:w-56">
          <TodayStrip onOpen={(id) => setEditing(id)} rows={rows} />
        </div>
      )}
      {!history ? (
        <div className="view-down" key="overview">
          <h1 className="mt-0 mb-10 text-5xl font-normal tracking-[-0.04em]">
            Your deep work
          </h1>
          <div className="mb-3 flex justify-end gap-4 font-mono text-[11px] uppercase">
            {(["today", "week"] as const).map((r) => (
              <button
                aria-pressed={range === r}
                className={`cursor-pointer bg-transparent p-0 ${range === r ? "text-cream" : "text-mist/60 hover:text-cream"}`}
                key={r}
                onClick={() => setRange(r)}
                type="button"
              >
                {r === "today" ? "Today" : "Week"}
              </button>
            ))}
          </div>
          <dl className="mb-10 grid grid-cols-3 overflow-hidden rounded-2xl border border-line">
            {[
              [
                range === "today" ? "Deep hours today" : "Deep hours this week",
                week ? week.hours.toFixed(1) : "–",
              ],
              [
                range === "today" ? "Sessions today" : "Sessions this week",
                week ? String(week.count) : "–",
              ],
              [
                "Goals hit",
                week?.count ? `${week.done} of ${week.count}` : "–",
              ],
            ].map(([label, value], i) => (
              <div
                key={label}
                className={`bg-panel/80 p-5 ${i ? "border-l border-line" : ""}`}
              >
                <dt className="eyebrow text-[11px]">{label}</dt>
                <dd
                  className="m-0 mt-2 text-4xl tracking-[-0.04em] tabular-nums"
                  data-testid={label}
                >
                  {value}
                </dd>
              </div>
            ))}
          </dl>

          {composing ? (
            <form
              className="composer border-l border-mint/50 py-1 pl-5"
              onKeyDown={(e) => e.key === "Escape" && setComposing(false)}
              onSubmit={macOnline ? startFromForm : logFromForm}
            >
              <input
                aria-label="Goal"
                autoComplete="off"
                autoFocus
                className="w-full border-0 bg-transparent p-0 text-2xl tracking-[-0.02em] text-cream outline-none placeholder:text-mist/50"
                maxLength={200}
                name="goal"
                placeholder={
                  macOnline
                    ? "What will this block produce?"
                    : "What did this block produce?"
                }
                required
              />
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-xs text-mist">
                <label className="flex items-center gap-1.5">
                  <input
                    aria-label="Minutes"
                    className={`${quiet} w-8 text-right [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none`}
                    defaultValue={defaults.minutes}
                    max={600}
                    min={1}
                    name="minutes"
                    required
                    type="number"
                  />
                  MIN
                </label>
                {macOnline ? (
                  <span className="text-mint/80">
                    {agentRow?.host
                      ? `ON ${agentRow.host.replace(/\.local$/, "").toUpperCase()}`
                      : "ON YOUR MAC"}
                  </span>
                ) : (
                  <>
                    <span aria-hidden="true">·</span>
                    <select
                      aria-label="Outcome"
                      className={quiet}
                      defaultValue={defaults.outcome}
                      name="outcome"
                    >
                      <option value="done">Done</option>
                      <option value="partial">Partial</option>
                      <option value="not done">Not done</option>
                    </select>
                    <span aria-hidden="true">·</span>
                    <select
                      aria-label="Focus"
                      className={quiet}
                      defaultValue={defaults.focus ?? ""}
                      name="focus"
                    >
                      <option value="">Focus –</option>
                      {FOCUS_STEPS.map((f) => (
                        <option key={f} value={f}>
                          Focus {f}%
                        </option>
                      ))}
                    </select>
                    <span className="normal-case text-mist/70">
                      Mac offline: logs it as done. Run deepwork agent install
                      to start blocks from here.
                    </span>
                  </>
                )}
                <span className="ml-auto flex items-center gap-4">
                  <button
                    className="cursor-pointer text-mist hover:text-cream"
                    onClick={() => setComposing(false)}
                    type="button"
                  >
                    ESC
                  </button>
                  <button
                    className="cursor-pointer text-mint hover:text-cream"
                    type="submit"
                  >
                    {macOnline ? "START ↵" : "LOG ↵"}
                  </button>
                </span>
              </div>
            </form>
          ) : (
            <ActiveBanner
              fallback={
                <button
                  aria-label={macOnline ? "Start a block" : "Log a session"}
                  className="group flex h-10 w-full cursor-pointer items-center gap-4 bg-transparent p-0 text-cream/80 transition hover:text-mint focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mint"
                  onClick={() => setComposing(true)}
                  type="button"
                >
                  <span
                    aria-hidden="true"
                    className="h-px flex-1 bg-line transition group-hover:bg-mint/25"
                  />
                  <span
                    aria-hidden="true"
                    className="font-mono text-2xl leading-none"
                  >
                    +
                  </span>
                  <span
                    aria-hidden="true"
                    className="h-px flex-1 bg-line transition group-hover:bg-mint/25"
                  />
                </button>
              }
              initial={active.rows}
              onActive={onActive}
              onStop={() =>
                startTransition(async () => void (await stopBlock(userId)))
              }
              sealedQuery={active.sealedQuery}
              starting={starting}
              userId={userId}
            />
          )}

          <div className="mt-4 flex h-6 items-center justify-between text-[13px]">
            <span
              className={notice?.tone === "error" ? "text-rose" : "text-mist"}
              role={notice ? "status" : undefined}
            >
              {notice?.text}
            </span>
            {/* Only a broken connection is worth showing; data-status lets tests wait for the subscription. */}
            <output
              className="eyebrow text-[11px] text-rose"
              data-status={status}
              data-testid="live-status"
            >
              {status === "error" ? "Live updates stopped" : ""}
            </output>
          </div>
          {status === "error" && (
            <button
              className="mt-2 cursor-pointer text-sm font-medium text-rose"
              onClick={() => window.location.reload()}
              type="button"
            >
              Reconnect
            </button>
          )}

          <div className="mt-16 flex gap-6 font-mono text-[11px] uppercase">
            <button
              className="cursor-pointer bg-transparent p-0 text-mist/70 hover:text-cream"
              onClick={() => {
                setHistory(true);
                setSel(rows.length ? 0 : -1);
              }}
              type="button"
            >
              History
            </button>
            <button
              className="cursor-pointer bg-transparent p-0 text-mist/70 hover:text-cream"
              onClick={() => setShowToday((v) => !v)}
              type="button"
            >
              Calendar
            </button>
          </div>
        </div>
      ) : (
        <div key="history">
          <h1 className="mt-0 mb-8 flex items-baseline justify-between text-5xl font-normal tracking-[-0.04em]">
            History
          </h1>
          {rows.length === 0 && <p className="text-mist">No sessions yet.</p>}
          {rows.length > 0 && (
            <ul
              aria-live="polite"
              className="my-6 list-none border-t border-line p-0"
            >
              {rows.map((r, i) => (
                <li
                  aria-selected={i === sel}
                  className={`relative -mx-3 grid cursor-pointer grid-cols-[1fr_auto_auto_auto_auto] items-center gap-5 border-b border-line px-3 py-4 hover:bg-cream/[0.03] ${i === sel ? "bg-cream/[0.05]" : ""} ${r.pending ? "opacity-50" : ""}`}
                  data-row={i}
                  key={r.id}
                  onClick={() => {
                    setSel(i);
                    setEditing(r.id);
                  }}
                >
                  {i === sel && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-3 left-0 w-0.5 rounded bg-mint"
                    />
                  )}
                  <span className="min-w-0 break-words">
                    {r.goal}
                    {r.notes && (
                      <span
                        className="ml-2 font-mono text-[11px] text-mist"
                        title="Has notes"
                      >
                        ¶
                      </span>
                    )}
                  </span>
                  <span className="font-mono text-xs text-mist tabular-nums">
                    {r.minutes} MIN ·{" "}
                    <span
                      className={
                        r.outcome === "done"
                          ? "text-mint"
                          : r.outcome === "partial"
                            ? "text-ochre"
                            : r.outcome === "not done"
                              ? "text-rose"
                              : "text-mist"
                      }
                    >
                      {r.outcome.toUpperCase()}
                    </span>
                  </span>
                  <select
                    aria-label={`Focus for ${r.goal}`}
                    className={`${quiet} ${r.focus_pct == null ? "" : "text-cream"}`}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      const focus_pct =
                        e.target.value === "" ? null : Number(e.target.value);
                      mutate(
                        { type: "focus", id: r.id, focus_pct },
                        () => setFocus(userId, { id: r.id, focus_pct }),
                        `Couldn't rate "${r.goal}".`,
                      );
                    }}
                    value={r.focus_pct ?? ""}
                  >
                    <option value="">FOCUS –</option>
                    {FOCUS_STEPS.map((f) => (
                      <option key={f} value={f}>
                        FOCUS {f}%
                      </option>
                    ))}
                  </select>
                  <span className="text-xs text-mist">
                    <LocalTime date={r.started_at} />
                  </span>
                  <button
                    aria-label={`Delete ${r.goal}`}
                    className="cursor-pointer rounded-md border border-transparent bg-transparent px-2 py-1 text-xs text-mist transition hover:border-rose/70 hover:text-rose"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSel(i);
                      setConfirming(r);
                    }}
                    type="button"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {confirming && (
        <ConfirmDelete
          goal={confirming.goal}
          onCancel={() => setConfirming(null)}
          onConfirm={() => {
            const r = confirming;
            setConfirming(null);
            mutate(
              { type: "delete", id: r.id },
              () => deleteSession(userId, { id: r.id }),
              `Couldn't delete "${r.goal}".`,
            );
          }}
        />
      )}
      {editingRow && (
        <SessionDrawer
          key={editingRow.id}
          onClose={(edit) => saveEdit(editingRow.id, edit)}
          row={editingRow}
        />
      )}
    </section>
  );
}
