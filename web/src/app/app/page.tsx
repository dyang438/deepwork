import Image from "next/image";
import { Suspense } from "react";

import roses from "../../../public/roses.jpg";
import { Dashboard } from "./dashboard";

export default function AppPage() {
  return (
    <main className="relative min-h-screen bg-ink">
      {/* A band of the painting behind the header, fading into the page. */}
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-80 overflow-hidden">
        <Image alt="" className="object-cover object-[50%_20%] opacity-70" fill placeholder="blur" priority sizes="100vw" src={roses} />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/20 via-ink/70 to-ink" />
      </div>
      <div className="relative mx-auto w-full max-w-3xl px-5 pt-24 pb-16">
        <p className="eyebrow mb-3 flex items-center gap-2">
          <span aria-hidden="true" className="size-2.5 rounded-[2px] bg-mint" />
          godeep.work
        </p>
        <h1 className="mt-0 mb-10 text-5xl font-normal tracking-[-0.04em]">Your deep work</h1>
        <Suspense fallback={<p className="text-mist">Loading sessions</p>}>
          <Dashboard />
        </Suspense>
      </div>
    </main>
  );
}
