"use client";

import { useEffect, useRef } from "react";

// "Are you sure?" for deleting a session. d or Enter deletes; Esc or a click outside cancels.
export function ConfirmDelete({ goal, onConfirm, onCancel }: { goal: string; onConfirm: () => void; onCancel: () => void }) {
  const handlers = useRef({ onConfirm, onCancel });
  handlers.current = { onConfirm, onCancel };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "d" || e.key === "Enter") handlers.current.onConfirm();
      else if (e.key === "Escape") handlers.current.onCancel();
      else return;
      e.preventDefault();
      e.stopImmediatePropagation();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);
  return (
    <div className="fade-in fixed inset-0 z-40 flex items-center justify-center bg-ink/70 p-5 backdrop-blur-sm" onClick={onCancel}>
      <div
        aria-label="Delete session"
        aria-modal="true"
        className="pop-in w-full max-w-sm rounded-2xl border border-line bg-panel p-6"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog" data-dw-dialog=""
      >
        <p className="m-0 text-lg">Are you sure you want to delete this session?</p>
        <p className="m-0 mt-2 truncate text-sm text-mist">{goal}</p>
        <div className="mt-6 flex items-center justify-end gap-4">
          <button className="cursor-pointer bg-transparent text-sm text-mist hover:text-cream" onClick={onCancel} type="button">
            Cancel <span className="ml-1 font-mono text-[11px] text-mist/70">ESC</span>
          </button>
          <button
            className="cursor-pointer rounded-full border border-rose/60 bg-rose/10 px-4 py-2 text-sm text-rose outline-none hover:bg-rose/20"
            onClick={onConfirm}
            type="button"
          >
            Delete <span className="ml-1 font-mono text-[11px] opacity-70">D</span>
          </button>
        </div>
      </div>
    </div>
  );
}
