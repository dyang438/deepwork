"use client";

import { useState, useTransition } from "react";

import { joinCompetition } from "../../app/competitions/actions";

export function JoinButton({ code }: { code: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-start gap-3">
      <button
        className="cursor-pointer rounded-full bg-cream px-6 py-3 font-medium text-ink hover:bg-white disabled:opacity-60"
        disabled={pending}
        onClick={() => start(async () => setError((await joinCompetition(code))?.error ?? null))}
        type="button"
      >
        {pending ? "Joining…" : "Join competition"}
      </button>
      {error && <p className="m-0 text-sm text-rose" role="alert">{error}</p>}
    </div>
  );
}
