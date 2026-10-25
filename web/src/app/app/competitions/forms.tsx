"use client";

import { useActionState, useState, useTransition } from "react";

import { createCompetition, joinCompetition } from "./actions";

const input =
  "w-full rounded-full border border-line bg-ink px-4 py-2.5 text-cream outline-none placeholder:text-mist/60 focus:border-mint/70";
const button = "cursor-pointer rounded-full bg-cream px-5 py-2.5 font-medium text-ink hover:bg-white disabled:opacity-60";

export function CreateForm() {
  const [state, action, pending] = useActionState(createCompetition, null);
  return (
    <form action={action} className="flex flex-col gap-3 rounded-2xl border border-line bg-panel/80 p-5">
      <p className="eyebrow m-0 text-[11px]">Start a competition</p>
      <input aria-label="Competition name" className={input} maxLength={80} name="name" placeholder="November deep work" required />
      <label className="flex items-center gap-3 text-sm text-mist">
        Ends (optional)
        <input aria-label="End date" className={`${input} w-auto flex-1`} name="ends_at" type="date" />
      </label>
      <button className={button} disabled={pending} type="submit">
        {pending ? "Creating…" : "Create"}
      </button>
      {state?.error && <p className="m-0 text-sm text-rose" role="alert">{state.error}</p>}
    </form>
  );
}

export function JoinForm() {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="flex flex-col gap-3 rounded-2xl border border-line bg-panel/80 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        const code = value.trim().split("/").filter(Boolean).at(-1) ?? ""; // accepts the link or the bare code
        start(async () => setError((await joinCompetition(code))?.error ?? null));
      }}
    >
      <p className="eyebrow m-0 text-[11px]">Join with an invite</p>
      <input aria-label="Invite link or code" className={input} onChange={(e) => setValue(e.target.value)} placeholder="godeep.work/join/…" required value={value} />
      <button className={button} disabled={pending} type="submit">
        {pending ? "Joining…" : "Join"}
      </button>
      {error && <p className="m-0 text-sm text-rose" role="alert">{error}</p>}
    </form>
  );
}
