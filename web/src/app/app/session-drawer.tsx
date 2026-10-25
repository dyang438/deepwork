"use client";

import { useEffect, useRef, useState } from "react";

import type { SessionRow } from "@/lib/sessions";

export type SessionEdit = Pick<SessionRow, "goal" | "minutes" | "outcome" | "focus_pct" | "notes" | "started_at">;

const FOCUS_STEPS = [100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 0];
const quiet =
  "cursor-pointer appearance-none border-0 border-b border-transparent bg-transparent p-0 font-mono text-xs uppercase text-mist outline-none [field-sizing:content] hover:text-cream focus:border-mint/60 focus:text-cream";

// "2026-10-25T14:30" in local time, for <input type="datetime-local">.
const toLocalInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);

const changed = (a: SessionEdit, b: SessionEdit) =>
  a.goal !== b.goal || a.minutes !== b.minutes || a.outcome !== b.outcome || a.focus_pct !== b.focus_pct ||
  (a.notes ?? "") !== (b.notes ?? "") || a.started_at.getTime() !== b.started_at.getTime();

// Slides in from the right. Closing (Esc, x, a click outside) or Cmd+Enter saves whatever changed.
export function SessionDrawer({
  row,
  onClose,
}: {
  row: SessionRow;
  onClose: (edit: SessionEdit | null) => void; // null: nothing changed
}) {
  const [draft, setDraft] = useState<SessionEdit>(() => ({ ...row }));
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const close = () => {
    const d = draftRef.current;
    onClose(d.goal.trim() && changed(d, row) ? { ...d, goal: d.goal.trim() } : null);
  };
  const closeRef = useRef(close);
  closeRef.current = close;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || (e.key === "Enter" && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        closeRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const set = <K extends keyof SessionEdit>(k: K, v: SessionEdit[K]) => setDraft((d) => ({ ...d, [k]: v }));

  return (
    <div className="fixed inset-0 z-30" role="presentation">
      <button aria-label="Close editor" className="absolute inset-0 cursor-default bg-ink/40" onClick={close} tabIndex={-1} type="button" />
      <aside
        aria-label="Edit session"
        className="drawer absolute inset-y-0 right-0 flex w-full flex-col border-l border-line bg-panel px-7 pt-6 pb-5 sm:w-[460px]"
        role="dialog"
      >
        <div className="mb-8 flex items-center justify-between">
          <p className="eyebrow m-0 text-[11px]">Session</p>
          <button aria-label="Close" className="cursor-pointer bg-transparent p-1 text-lg leading-none text-mist hover:text-cream" onClick={close} type="button">
            ×
          </button>
        </div>
        <textarea
          aria-label="Goal"
          autoFocus
          className="w-full resize-none border-0 bg-transparent p-0 text-2xl leading-snug tracking-[-0.02em] text-cream outline-none [field-sizing:content] placeholder:text-mist/50"
          maxLength={200}
          onChange={(e) => set("goal", e.target.value.replace(/\n/g, " "))}
          placeholder="What did this block produce?"
          rows={1}
          value={draft.goal}
        />
        <div className="mt-4 mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line pb-5 font-mono text-xs text-mist">
          <label className="flex items-center gap-1.5">
            <input
              aria-label="Minutes"
              className={`${quiet} w-10 text-right [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none`}
              max={1440}
              min={0}
              onChange={(e) => set("minutes", Math.max(0, Math.round(Number(e.target.value) || 0)))}
              type="number"
              value={draft.minutes}
            />
            MIN
          </label>
          <span aria-hidden="true">·</span>
          <select aria-label="Outcome" className={quiet} onChange={(e) => set("outcome", e.target.value)} value={draft.outcome}>
            <option value="done">Done</option>
            <option value="partial">Partial</option>
            <option value="not done">Not done</option>
            <option value="unrecorded">Unrecorded</option>
          </select>
          <span aria-hidden="true">·</span>
          <select
            aria-label="Focus"
            className={quiet}
            onChange={(e) => set("focus_pct", e.target.value === "" ? null : Number(e.target.value))}
            value={draft.focus_pct ?? ""}
          >
            <option value="">Focus –</option>
            {FOCUS_STEPS.map((f) => (
              <option key={f} value={f}>Focus {f}%</option>
            ))}
          </select>
          <span aria-hidden="true">·</span>
          <input
            aria-label="Started"
            className={`${quiet} [color-scheme:dark]`}
            onChange={(e) => e.target.value && set("started_at", new Date(e.target.value))}
            type="datetime-local"
            value={toLocalInput(draft.started_at)}
          />
        </div>
        <textarea
          aria-label="Notes"
          className="min-h-0 w-full flex-1 resize-none border-0 bg-transparent p-0 text-[15px] leading-relaxed text-cream outline-none placeholder:text-mist/50"
          maxLength={20000}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Notes: what you did, what's left, what got in the way…"
          value={draft.notes ?? ""}
        />
        <p className="eyebrow m-0 mt-4 text-[10px]">Esc or ⌘↵ saves and closes</p>
      </aside>
    </div>
  );
}
