"use client";

import { useState, useTransition } from "react";

import { leaveCompetition } from "../actions";

export function InviteLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="eyebrow shrink-0 text-[11px]">Invite</span>
      <code className="truncate font-mono text-sm text-cream" data-testid="invite-url">{url}</code>
      <button
        className="shrink-0 cursor-pointer rounded-full border border-cream/25 px-3.5 py-1.5 text-sm hover:border-cream/60"
        onClick={async () => {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        type="button"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

export function LeaveButton({ competitionId }: { competitionId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      className="cursor-pointer text-sm text-mist hover:text-rose"
      disabled={pending}
      onClick={() => start(() => leaveCompetition(competitionId))}
      type="button"
    >
      Leave competition
    </button>
  );
}
