"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

import type { SessionRow } from "@/lib/sessions";

export type SessionEdit = Pick<
  SessionRow,
  "goal" | "minutes" | "outcome" | "focus_pct" | "notes" | "started_at"
>;

const OUTCOMES = ["done", "partial", "not done", "unrecorded"];
const FOCUS = [null, 100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 0];
const FIELDS = [
  "goal",
  "minutes",
  "outcome",
  "focus",
  "started",
  "notes",
] as const;
type Field = (typeof FIELDS)[number];

// "2026-10-25T14:30" in local time, for <input type="datetime-local">.
const toLocalInput = (d: Date) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);

const changed = (a: SessionEdit, b: SessionEdit) =>
  a.goal !== b.goal ||
  a.minutes !== b.minutes ||
  a.outcome !== b.outcome ||
  a.focus_pct !== b.focus_pct ||
  (a.notes ?? "") !== (b.notes ?? "") ||
  a.started_at.getTime() !== b.started_at.getTime();

const cycle = <T,>(xs: readonly T[], x: T, step: number) =>
  xs[(xs.indexOf(x) + step + xs.length) % xs.length];

// Vim-style: j / k move between fields, Enter or i edits one, Esc leaves the field, Esc again closes.
// Closing (Esc, x, a click outside) or Cmd+Enter saves whatever changed.
export function SessionDrawer({
  row,
  onClose,
}: {
  row: SessionRow;
  onClose: (edit: SessionEdit | null) => void; // null: nothing changed
}) {
  const [draft, setDraft] = useState<SessionEdit>(() => ({ ...row }));
  const [cursor, setCursor] = useState(0);
  const [editing, setEditing] = useState(false);
  const field = FIELDS[cursor];
  const inputs = useRef<
    Partial<Record<Field, HTMLInputElement | HTMLTextAreaElement | null>>
  >({});

  const set = <K extends keyof SessionEdit>(k: K, v: SessionEdit[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));
  const state = useRef({ draft, cursor, editing, field });
  state.current = { draft, cursor, editing, field };
  const close = () => {
    const d = state.current.draft;
    onClose(
      d.goal.trim() && changed(d, row) ? { ...d, goal: d.goal.trim() } : null,
    );
  };
  const closeRef = useRef(close);
  closeRef.current = close;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const { cursor, editing, field } = state.current;
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey))
        return (e.preventDefault(), closeRef.current());
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (editing) {
        if (e.key === "Escape" || (e.key === "Enter" && field !== "notes")) {
          e.preventDefault();
          setEditing(false);
        } else if (
          (field === "outcome" || field === "focus") &&
          ["j", "k", "ArrowDown", "ArrowUp", "l", "h"].includes(e.key)
        ) {
          e.preventDefault();
          const step = ["j", "ArrowDown", "l"].includes(e.key) ? 1 : -1;
          if (field === "outcome")
            setDraft((d) => ({
              ...d,
              outcome: cycle(OUTCOMES, d.outcome, step),
            }));
          else
            setDraft((d) => ({
              ...d,
              focus_pct: cycle(FOCUS, d.focus_pct, step),
            }));
        }
        return;
      }
      if (e.key === "j" || e.key === "ArrowDown")
        setCursor(Math.min(cursor + 1, FIELDS.length - 1));
      else if (e.key === "k" || e.key === "ArrowUp")
        setCursor(Math.max(cursor - 1, 0));
      else if (e.key === "Enter" || e.key === "i") setEditing(true);
      else if (e.key === "Escape") closeRef.current();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Editing a text field focuses its input; leaving edit mode takes focus away so j / k move again.
  useEffect(() => {
    const el = inputs.current[field];
    if (editing && el) {
      el.focus();
      if (el instanceof HTMLTextAreaElement || el.type === "text")
        el.setSelectionRange(el.value.length, el.value.length);
    } else (document.activeElement as HTMLElement | null)?.blur();
  }, [editing, field]);

  const textInput =
    "w-full border-0 bg-transparent p-0 text-cream outline-none [appearance:textfield] [color-scheme:dark] [&::-webkit-inner-spin-button]:appearance-none";

  // A plain render function, not a component: a component declared in here would remount (and lose focus) on
  // every keystroke.
  const line = (i: number, label: string, children: ReactNode) => {
    const active = i === cursor;
    return (
      <div
        className="grid cursor-pointer grid-cols-[5.5rem_1fr] items-baseline gap-4 py-3"
        data-active={active}
        data-field={FIELDS[i]}
        onClick={() => {
          setCursor(i);
          setEditing(true);
        }}
      >
        <span
          className={`font-mono text-[11px] uppercase ${active ? "text-mint" : "text-mist"}`}
        >
          {label}
        </span>
        <div
          className={`min-w-0 border-b pb-1 ${active ? (editing ? "border-mint" : "border-cream/60") : "border-transparent"}`}
        >
          {children}
        </div>
      </div>
    );
  };

  const enumValue = (text: string, isEditing: boolean) => (
    <span className="flex items-center justify-between gap-3">
      <span className="text-cream">{text}</span>
      {isEditing && (
        <span className="font-mono text-[11px] text-mist">j / k</span>
      )}
    </span>
  );

  return (
    <div className="fixed inset-0 z-30" role="presentation">
      <button
        aria-label="Close editor"
        className="absolute inset-0 cursor-default bg-ink/40"
        onClick={close}
        tabIndex={-1}
        type="button"
      />
      <aside
        aria-label="Edit session"
        className="drawer absolute inset-y-0 right-0 flex w-full flex-col border-l border-line bg-panel px-7 pt-6 pb-5 sm:w-[460px]"
        role="dialog"
      >
        <div className="mb-6 flex items-center justify-between">
          <p className="eyebrow m-0 text-[11px]">Session</p>
          <button
            aria-label="Close"
            className="cursor-pointer bg-transparent p-1 text-lg leading-none text-mist hover:text-cream"
            onClick={close}
            type="button"
          >
            ×
          </button>
        </div>

        {line(
          0,
          "Goal",
          <>
            {editing && field === "goal" ? (
              <input
                aria-label="Goal"
                className={`${textInput} text-lg`}
                maxLength={200}
                onChange={(e) => set("goal", e.target.value)}
                ref={(el) => void (inputs.current.goal = el)}
                type="text"
                value={draft.goal}
              />
            ) : (
              <span className="text-lg text-cream">
                {draft.goal || <span className="text-mist">–</span>}
              </span>
            )}
          </>,
        )}
        {line(
          1,
          "Minutes",
          <>
            {editing && field === "minutes" ? (
              <input
                aria-label="Minutes"
                className={textInput}
                max={1440}
                min={0}
                onChange={(e) =>
                  set(
                    "minutes",
                    Math.max(0, Math.round(Number(e.target.value) || 0)),
                  )
                }
                ref={(el) => void (inputs.current.minutes = el)}
                type="number"
                value={draft.minutes}
              />
            ) : (
              <span className="text-cream tabular-nums">{draft.minutes}</span>
            )}
          </>,
        )}
        {line(
          2,
          "Outcome",
          <>
            {enumValue(
              draft.outcome[0].toUpperCase() + draft.outcome.slice(1),
              editing && field === "outcome",
            )}
          </>,
        )}
        {line(
          3,
          "Focus",
          <>
            {enumValue(
              draft.focus_pct == null ? "–" : `${draft.focus_pct}%`,
              editing && field === "focus",
            )}
          </>,
        )}
        {line(
          4,
          "Started",
          <>
            {editing && field === "started" ? (
              <input
                aria-label="Started"
                className={textInput}
                onChange={(e) =>
                  e.target.value && set("started_at", new Date(e.target.value))
                }
                ref={(el) => void (inputs.current.started = el)}
                type="datetime-local"
                value={toLocalInput(draft.started_at)}
              />
            ) : (
              <span className="text-cream tabular-nums">
                {draft.started_at.toLocaleString([], {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            )}
          </>,
        )}
        <div className="flex min-h-0 flex-1 flex-col [&>div]:flex-1 [&>div>div]:h-full">
          {line(
            5,
            "Notes",
            <>
              {editing && field === "notes" ? (
                <textarea
                  aria-label="Notes"
                  className={`${textInput} h-full min-h-40 resize-none leading-relaxed`}
                  maxLength={20000}
                  onChange={(e) => set("notes", e.target.value)}
                  ref={(el) => void (inputs.current.notes = el)}
                  value={draft.notes ?? ""}
                />
              ) : (
                <p className="m-0 min-h-40 leading-relaxed whitespace-pre-wrap text-cream">
                  {draft.notes || <span className="text-mist">–</span>}
                </p>
              )}
            </>,
          )}
        </div>

        <p className="eyebrow m-0 mt-4 text-[10px]">
          {editing
            ? "Esc done · ⌘↵ save"
            : "j / k move · enter edit · esc close · ⌘↵ save"}
        </p>
      </aside>
    </div>
  );
}
