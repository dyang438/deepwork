import { Suspense } from "react";

import { Dashboard } from "./dashboard";

export default function AppPage() {
  return (
    <>
      <Suspense fallback={<p className="text-mist">Loading sessions</p>}>
        <Dashboard />
      </Suspense>
    </>
  );
}
