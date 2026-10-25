"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import type { Defaults } from "@/lib/settings";

import { saveDefaults } from "./actions";

const FOCUS_STEPS = [100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 0];
const field =
  "w-full rounded-lg border border-line bg-ink px-3 py-2 text-cream outline-none focus:border-mint/60 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none";

// A bare gear, fixed at the bottom left; opens the composer defaults.
export function SettingsGear({ defaults }: { defaults: Defaults }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        aria-label="Settings"
        className="fixed bottom-6 left-6 z-20 cursor-pointer bg-transparent p-1 text-mist transition hover:rotate-45 hover:text-cream"
        onClick={() => setOpen(true)}
        type="button"
      >
        <svg aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" viewBox="0 0 24 24">
          <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-ink/70 p-5 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <form
            aria-label="Defaults"
            className="composer w-full max-w-sm rounded-2xl border border-line bg-panel p-6"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const values = {
                minutes: Number(fd.get("minutes")),
                outcome: String(fd.get("outcome")) as Defaults["outcome"],
                focus: fd.get("focus") ? Number(fd.get("focus")) : null,
              };
              start(async () => {
                const r = await saveDefaults(values);
                if (!r.ok) return setError(r.error ?? "Couldn't save.");
                setOpen(false);
                router.refresh(); // the composer picks up the new defaults
              });
            }}
            role="dialog"
          >
            <p className="eyebrow m-0 mb-1 text-[11px]">Settings</p>
            <h2 className="mt-0 mb-6 text-2xl font-normal tracking-[-0.03em]">Defaults</h2>
            <label className="mb-4 block text-sm text-mist">
              Session length (minutes)
              <input autoFocus className={`${field} mt-1.5`} defaultValue={defaults.minutes} max={600} min={1} name="minutes" required type="number" />
            </label>
            <label className="mb-4 block text-sm text-mist">
              Outcome
              <select className={`${field} mt-1.5`} defaultValue={defaults.outcome} name="outcome">
                <option value="done">Done</option>
                <option value="partial">Partial</option>
                <option value="not done">Not done</option>
              </select>
            </label>
            <label className="mb-6 block text-sm text-mist">
              Focus
              <select className={`${field} mt-1.5`} defaultValue={defaults.focus ?? ""} name="focus">
                <option value="">Leave unrated</option>
                {FOCUS_STEPS.map((f) => (
                  <option key={f} value={f}>{f}%</option>
                ))}
              </select>
            </label>
            {error && <p className="mb-4 text-sm text-rose" role="alert">{error}</p>}
            <div className="flex items-center justify-end gap-4">
              <Link className="mr-auto text-sm text-mist hover:text-cream" href="/app/setup" onClick={() => setOpen(false)}>
                Setup guide
              </Link>
              <button className="cursor-pointer text-sm text-mist hover:text-cream" onClick={() => setOpen(false)} type="button">
                Cancel
              </button>
              <button className="cursor-pointer rounded-full bg-cream px-5 py-2 text-sm font-medium text-ink hover:bg-white disabled:opacity-60" disabled={pending} type="submit">
                {pending ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
