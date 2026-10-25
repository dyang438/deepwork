"use client";

import { useState, useTransition } from "react";

import { approveCli } from "./actions";

export function Approve({ code }: { code: string }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<Awaited<ReturnType<typeof approveCli>> | null>(null);
  if (result?.ok)
    return (
      <p className="text-mint" role="status">
        Connected. You can close this tab and go back to your terminal.
      </p>
    );
  return (
    <div className="flex flex-col items-start gap-3">
      <button
        className="cursor-pointer rounded-full bg-cream px-6 py-3 font-medium text-ink hover:bg-white disabled:opacity-60"
        disabled={pending}
        onClick={() => start(async () => setResult(await approveCli(code)))}
        type="button"
      >
        {pending ? "Connecting…" : "Connect this terminal"}
      </button>
      {result && !result.ok && (
        <p className="text-sm text-rose" role="alert">
          {result.error}
        </p>
      )}
    </div>
  );
}
