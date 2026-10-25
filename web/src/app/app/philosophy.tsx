"use client";

import { useEffect, useId, useRef, useState } from "react";

import { savePhilosophy } from "./philosophy-actions";

export function Philosophy({
  initial,
  onClose,
  open,
  userId,
}: {
  initial: string;
  onClose: () => void;
  open: boolean;
  userId: string;
}) {
  const [text, setText] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const writing = useRef<HTMLTextAreaElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    dialog.current?.showModal();
    writing.current?.focus();
  }, [open]);

  async function finish() {
    if (saving) return;
    if (text !== saved) {
      setSaving(true);
      setError(null);
      try {
        const result = await savePhilosophy({ userId, text });
        if (!result.ok) {
          setError(result.error ?? "Couldn't save. Your writing is still here.");
          return;
        }
        setSaved(text);
      } catch {
        setError("Couldn't save. Your writing is still here.");
        return;
      } finally {
        setSaving(false);
      }
    }
    dialog.current?.close();
    onClose();
  }

  if (!open) return null;

  return (
    <dialog
      aria-labelledby={titleId}
      className="pop-in fixed inset-0 m-auto max-h-[calc(100dvh-2.5rem)] w-[calc(100%-2.5rem)] max-w-2xl overflow-y-auto rounded-xl border border-line bg-panel p-6 text-cream backdrop:bg-ink/70 backdrop:backdrop-blur-sm sm:p-8"
      data-dw-dialog=""
      onCancel={(event) => {
        event.preventDefault();
        void finish();
      }}
      onClick={(event) => {
        const box = event.currentTarget.getBoundingClientRect();
        if (event.target === event.currentTarget &&
          (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom))
          void finish();
      }}
      ref={dialog}
    >
      <form
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            void finish();
          }
        }}
        onSubmit={(event) => {
          event.preventDefault();
          void finish();
        }}
      >
        <div className="mb-6 flex items-center justify-between gap-4">
          <h2 className="m-0 text-2xl font-normal tracking-[-0.03em]" id={titleId}>Philosophy</h2>
          <button
            aria-label="Save and close"
            className="cursor-pointer bg-transparent p-1 text-lg leading-none text-mist hover:text-cream disabled:opacity-50"
            disabled={saving}
            onClick={() => void finish()}
            type="button"
          >
            ×
          </button>
        </div>
        <textarea
          aria-label="Philosophy"
          className="block min-h-[40dvh] w-full resize-y border-0 bg-transparent p-0 text-base leading-7 text-cream outline-none placeholder:text-mist/40 disabled:opacity-70"
          disabled={saving}
          maxLength={50_000}
          onChange={(event) => {
            setText(event.target.value);
            setError(null);
          }}
          placeholder="Write here…"
          ref={writing}
          value={text}
        />
        <div className="mt-6 flex items-center justify-between gap-4 border-t border-line pt-4">
          <span className={`text-xs ${error ? "text-rose" : "text-mist/70"}`} role={error ? "alert" : "status"}>
            {error ?? (saving ? "Saving…" : text === saved ? "Saved" : "Unsaved")}
          </span>
          <button
            className="cursor-pointer bg-transparent p-0 text-sm text-cream hover:text-mint disabled:opacity-50"
            disabled={saving}
            type="submit"
          >
            Save
          </button>
        </div>
      </form>
    </dialog>
  );
}
