import { Suspense } from "react";

import { Dashboard } from "./dashboard";

// What the overview looks like before the sessions arrive: the same frame, with dashes for numbers.
function OverviewShell() {
  return (
    <section aria-busy="true">
      <h1 className="mt-0 mb-10 text-5xl font-normal tracking-[-0.04em]">Your deep work</h1>
      <div className="mb-3 h-[15px]" />
      <dl className="mb-10 grid grid-cols-3 overflow-hidden rounded-2xl border border-line">
        {["Deep hours today", "Sessions today", "Goals hit"].map((label, i) => (
          <div className={`bg-panel/80 p-5 ${i ? "border-l border-line" : ""}`} key={label}>
            <dt className="eyebrow text-[11px]">{label}</dt>
            <dd className="m-0 mt-2 text-4xl tracking-[-0.04em] text-mist/40">–</dd>
          </div>
        ))}
      </dl>
      <div className="flex w-full items-center justify-between gap-4 rounded-xl border border-line bg-panel/55 p-4">
        <div className="flex min-w-0 items-center gap-4">
          <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-mint/20 bg-mint/[0.07] font-mono text-2xl text-mint">+</span>
          <div className="min-w-0">
            <p className="m-0 text-sm text-cream">Start a block</p>
            <p className="m-0 mt-1 text-xs text-mist">Choose a goal and make space for it.</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 font-mono text-[10px] uppercase tracking-wide text-mist/70">
          <span>Press</span>
          <kbd className="flex h-7 min-w-7 items-center justify-center rounded-md border border-line border-b-2 bg-ink px-2 text-xs text-cream">+</kbd>
        </div>
      </div>
    </section>
  );
}

export default function AppPage() {
  return (
    <>
      <Suspense fallback={<OverviewShell />}>
        <Dashboard />
      </Suspense>
    </>
  );
}
