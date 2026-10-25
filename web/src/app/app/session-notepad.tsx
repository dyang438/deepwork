"use client";

import { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import type { useNotepad } from "./use-notepad";

export function SessionNotepad({
  notes,
  open,
  onToggle,
}: {
  notes: ReturnType<typeof useNotepad>;
  open: boolean;
  onToggle: () => void;
}) {
  const [preview, setPreview] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open && !preview) input.current?.focus();
  }, [open, preview]);

  return (
    <section aria-label="Session notepad" className="mt-10">
      <div className={`flex items-center ${open ? "justify-between border-b border-line pb-4" : "justify-center"}`}>
        <button
          aria-controls={open ? "session-notepad" : undefined}
          aria-expanded={open}
          aria-keyshortcuts="n"
          aria-label={open ? "Close notepad" : "Open notepad"}
          className="cursor-pointer bg-transparent p-0 text-cream/80 hover:text-mint focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-mint"
          onClick={onToggle}
          type="button"
        >
          <kbd className="flex size-9 items-center justify-center rounded-md border border-line border-b-[3px] bg-panel font-mono text-sm">n</kbd>
        </button>
        {open && (
          <div className="flex items-center gap-5 text-xs">
            <span className={notes.status === "error" ? "text-rose" : "text-mist/60"} role="status">
              {notes.status === "saving" ? "Saving…" : notes.status === "saved" ? "Saved" : notes.status === "error" ? "Not synced" : ""}
            </span>
            <button
              className="cursor-pointer bg-transparent p-0 text-mist hover:text-cream"
              onClick={() => setPreview((value) => !value)}
              type="button"
            >
              {preview ? "Write" : "Preview"}
            </button>
          </div>
        )}
      </div>
      {open && (
        <div className="composer pt-6" id="session-notepad">
          {preview ? (
            <div aria-label="Markdown preview" className="notepad-markdown min-h-[35dvh]">
              {notes.text ? (
                <Markdown remarkPlugins={[remarkGfm]} skipHtml
                  components={{ a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noreferrer" /> }}>
                  {notes.text}
                </Markdown>
              ) : <p className="text-mist/40">Nothing written yet.</p>}
            </div>
          ) : (
            <textarea
              aria-label="Markdown notes"
              className="block min-h-[35dvh] w-full resize-y border-0 bg-transparent p-0 font-mono text-sm leading-7 text-cream outline-none placeholder:text-mist/35"
              maxLength={50_000}
              onBlur={() => void notes.flush()}
              onChange={(event) => notes.change(event.target.value)}
              placeholder="Write in Markdown…"
              ref={input}
              spellCheck={false}
              value={notes.text}
            />
          )}
          {notes.error && (
            <p className="mt-4 text-xs text-rose" role="alert">
              {notes.error}{" "}
              <button className="cursor-pointer underline underline-offset-4" onClick={() => void notes.flush()} type="button">Retry</button>
            </p>
          )}
        </div>
      )}
    </section>
  );
}
