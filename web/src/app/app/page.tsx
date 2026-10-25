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
      <div aria-hidden="true" className="flex h-10 items-center">
        <span className="h-px w-full bg-line" />
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
