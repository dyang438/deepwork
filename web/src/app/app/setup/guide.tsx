"use client";

import { type ReactNode, useEffect, useState } from "react";

import type { SetupStatus } from "@/lib/setup";

import { setupStatus } from "./actions";

const HIDE_KEY = "godeep-setup-hidden";

function Command({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-2 flex items-center gap-3 rounded-lg bg-ink/80 px-3 py-2 font-mono text-[13px] text-cream">
      <span aria-hidden="true" className="text-mist">$</span>
      <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap">{text}</code>
      <button
        className="cursor-pointer bg-transparent font-mono text-[11px] text-mist hover:text-cream"
        onClick={async () => {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        type="button"
      >
        {copied ? "COPIED" : "COPY"}
      </button>
    </div>
  );
}

function Step({ n, done, title, children }: { n: number; done?: boolean; title: string; children: ReactNode }) {
  return (
    <li className={`grid grid-cols-[2rem_1fr] gap-x-3 border-t border-line py-5 ${done ? "opacity-55" : ""}`}>
      <span className={`pt-0.5 font-mono text-sm ${done ? "text-mint" : "text-mist"}`}>{done ? "✓" : String(n).padStart(2, "0")}</span>
      <div className="min-w-0">
        <p className="m-0 text-[17px]">{title}</p>
        <div className="mt-1 text-sm leading-relaxed text-mist">{children}</div>
      </div>
    </li>
  );
}

// Shown on the dashboard until the Mac is set up (and on /app/setup any time). Ticks itself off live.
export function SetupGuide({ initial, page = false }: { initial: SetupStatus; page?: boolean }) {
  const [status, setStatus] = useState(initial);
  const [hidden, setHidden] = useState(false);
  const complete = status.cli && status.agent;
  useEffect(() => {
    if (!page) setHidden(localStorage.getItem(HIDE_KEY) === "1");
  }, [page]);
  useEffect(() => {
    if (complete) return;
    const t = setInterval(async () => {
      const s = await setupStatus().catch(() => null);
      if (s) setStatus(s);
    }, 4000);
    return () => clearInterval(t);
  }, [complete]);
  if (!page && (hidden || complete)) return null;

  return (
    <section aria-label="Set up your Mac" className={page ? "" : "composer mb-12"} data-testid="setup">
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <h2 className="m-0 text-2xl font-normal tracking-[-0.02em]">Set up your Mac</h2>
        {!page && (
          <button
            className="cursor-pointer bg-transparent font-mono text-[11px] text-mist hover:text-cream"
            onClick={() => {
              localStorage.setItem(HIDE_KEY, "1");
              setHidden(true);
            }}
            type="button"
          >
            HIDE
          </button>
        )}
      </div>
      <p className="m-0 mb-4 text-sm text-mist">
        deepwork runs your blocks on your Mac: it quits chat apps, turns on Do Not Disturb and blocks distracting sites. This page tracks them.
      </p>
      <ol className="m-0 list-none p-0">
        <Step done={status.cli} n={1} title="Install the CLI">
          Needs macOS with git and python3 (both come with the Xcode command line tools).
          <Command text="curl -fsSL https://godeep.work/install.sh | sh" />
        </Step>
        <Step done={status.cli} n={2} title="Connect it to this account">
          Your terminal shows a code; confirm it in the browser tab that opens.
          <Command text="deepwork login" />
        </Step>
        <Step done={status.agent} n={3} title="Let + start blocks from here">
          Runs a small background program at login that picks up blocks you start on this page.
          <Command text="deepwork agent install" />
        </Step>
        <Step n={4} title="Block distracting sites (optional)">
          In Chrome, open <code className="font-mono text-cream">chrome://extensions</code>, turn on Developer mode, click Load
          unpacked and choose <code className="font-mono text-cream">~/deepwork/chrome-ext</code>.
        </Step>
        <Step n={5} title="Do Not Disturb (optional)">
          In the Shortcuts app, make two shortcuts: <code className="font-mono text-cream">deepwork-on</code> (Set Focus: Do Not
          Disturb, On) and <code className="font-mono text-cream">deepwork-off</code> (Off).
        </Step>
      </ol>
      <p className="m-0 border-t border-line pt-4 text-sm text-mist">
        Then start a block here with <kbd className="rounded border border-line border-b-2 px-1.5 font-mono text-xs text-cream">+</kbd>,
        or in your terminal with <code className="font-mono text-cream">deepwork 90</code>.
      </p>
    </section>
  );
}
