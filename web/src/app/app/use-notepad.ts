"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { saveNotepad } from "./notepad-actions";

export function useNotepad(userId: string, initial: string) {
  const [text, setText] = useState(initial);
  const [status, setStatus] = useState<"saved" | "unsaved" | "saving" | "error">("saved");
  const [error, setError] = useState<string | null>(null);
  const latest = useRef(initial);
  const saved = useRef(initial);
  const pending = useRef<Promise<boolean> | null>(null);
  const storageKey = `deepwork:notepad-draft:${userId}`;

  const change = useCallback((value: string) => {
    latest.current = value;
    setText(value);
    setStatus(value === saved.current ? "saved" : "unsaved");
    setError(null);
    try {
      if (value === saved.current) localStorage.removeItem(storageKey);
      else localStorage.setItem(storageKey, value);
    } catch { /* Account saving still works when browser storage is unavailable. */ }
  }, [storageKey]);

  useEffect(() => {
    try {
      const draft = localStorage.getItem(storageKey);
      if (draft !== null && draft.length <= 50_000) change(draft);
    } catch { /* Browser storage may be disabled. */ }
  }, [change, storageKey]);

  const flush = useCallback((): Promise<boolean> => {
    if (pending.current) return pending.current;
    const save = async () => {
      while (latest.current !== saved.current) {
        const value = latest.current;
        setStatus("saving");
        try {
          const result = await saveNotepad(userId, { text: value });
          if (!result.ok) throw new Error(result.error);
          saved.current = value;
          if (latest.current === value) {
            try { localStorage.removeItem(storageKey); } catch { /* Saved to the account. */ }
          }
        } catch (cause) {
          setStatus("error");
          setError(cause instanceof Error ? cause.message : "Couldn't sync your notes.");
          return false;
        }
      }
      setStatus("saved");
      setError(null);
      return true;
    };
    // One writer drains changes in order, including typing that happens during a save.
    const task = save();
    pending.current = task;
    void task.finally(() => { pending.current = null; });
    return task;
  }, [storageKey, userId]);

  useEffect(() => {
    if (latest.current === saved.current) return;
    const timer = setTimeout(() => void flush(), 700);
    return () => clearTimeout(timer);
  }, [text, flush]);

  useEffect(() => {
    const save = () => void flush();
    window.addEventListener("online", save);
    window.addEventListener("pagehide", save);
    return () => {
      window.removeEventListener("online", save);
      window.removeEventListener("pagehide", save);
    };
  }, [flush]);

  return { text, change, status, error, flush };
}
