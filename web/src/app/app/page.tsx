import { Suspense } from "react";

import { Dashboard } from "./dashboard";

export default function AppPage() {
  return (
    <>
      <h1 className="mt-0 mb-10 text-5xl font-normal tracking-[-0.04em]">Your deep work</h1>
      <Suspense fallback={<p className="text-mist">Loading sessions</p>}>
        <Dashboard />
      </Suspense>
    </>
  );
}
