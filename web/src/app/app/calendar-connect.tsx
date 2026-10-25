"use client";

import { useEffect, useState } from "react";


type Status = { connected: boolean; reconnect?: boolean } | null;

// Optional: grants read-only Calendar access so + can stop a block 5 minutes before your next event.
export function CalendarConnect() {
  const [status, setStatus] = useState<Status>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/calendar/next", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);
  // The app's own read-only Calendar connection (offline access, so it keeps working past the first hour).
  const connect = () => window.location.assign("/api/calendar/connect");
  async function disconnect() {
    setError(null);
    const r = await fetch("/api/calendar/disconnect", { method: "POST" }).catch(() => null);
    if (r?.ok) setStatus({ connected: false });
    else setError("Couldn't disconnect. Revoke it at myaccount.google.com/permissions.");
  }
  const ok = status?.connected && !status.reconnect;
  return (
    <div className="mb-6 flex items-center justify-between gap-4 border-t border-line pt-5 text-sm">
      <div>
        <p className="m-0 text-cream">Google Calendar</p>
        <p className="m-0 mt-0.5 text-xs text-mist">
          {ok ? "Connected, read-only. + stops 5 minutes before your next event." : "Optional. Read-only, used to fit blocks before your next event."}
        </p>
        {error && <p className="m-0 mt-1 text-xs text-rose" role="alert">{error}</p>}
      </div>
      {status && !ok && (
        <button className="shrink-0 cursor-pointer rounded-full border border-cream/30 px-3.5 py-1.5 text-sm hover:border-cream/60" onClick={connect} type="button">
          {status.reconnect ? "Reconnect" : "Connect"}
        </button>
      )}
      {ok && (
        <button className="shrink-0 cursor-pointer bg-transparent font-mono text-[11px] text-mist hover:text-rose" onClick={disconnect} type="button">
          Disconnect
        </button>
      )}
    </div>
  );
}
