"use client";

import { useEffect, useState } from "react";

import type { SetupStatus } from "@/lib/setup";

import { SetupGuide } from "./guide";

// A bare (i) next to the gear; opens the setup guide. A dot marks it until the Mac is set up.
export function SetupInfo({ initial }: { initial: SetupStatus }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  const incomplete = !(initial.cli && initial.agent);
  return (
    <>
      <button
        aria-label="Setup"
        className="fixed bottom-6 left-14 z-20 cursor-pointer bg-transparent p-1 text-mist transition hover:text-cream"
        onClick={() => setOpen(true)}
        type="button"
      >
        <svg aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9.5" />
          <path d="M12 11v5.5M12 7.6v.1" />
        </svg>
        {incomplete && <span aria-hidden="true" className="absolute top-0.5 right-0.5 size-1.5 rounded-full bg-mint" />}
      </button>
      {open && (
        <div className="fade-in fixed inset-0 z-30 flex items-center justify-center bg-ink/70 p-5 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div
            aria-label="Setup"
            className="pop-in max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-line bg-panel p-7"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
          >
            <SetupGuide initial={initial} page />
          </div>
        </div>
      )}
    </>
  );
}
