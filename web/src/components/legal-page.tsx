import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "./logo";

// Shared frame for /privacy and /terms: plain, readable, in the site's palette.
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <main className="min-h-screen bg-ink px-6 py-10 text-cream sm:px-8">
      <div className="mx-auto max-w-2xl">
        <Link aria-label="Home" className="inline-block" href="/">
          <Logo className="size-12" />
        </Link>
        <h1 className="mt-10 mb-2 text-4xl font-normal tracking-[-0.03em]">{title}</h1>
        <p className="eyebrow mb-10 text-[11px]">Last updated {updated}</p>
        <div className="legal space-y-5 text-[15px] leading-relaxed text-cream/90 [&_a]:text-mint [&_a]:underline [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-normal [&_h2]:text-cream [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_ul]:space-y-2">
          {children}
        </div>
        <p className="mt-14 border-t border-line pt-5 font-mono text-[11px] text-mist">
          <Link className="hover:text-cream" href="/privacy">Privacy</Link> · <Link className="hover:text-cream" href="/terms">Terms</Link> ·{" "}
          <Link className="hover:text-cream" href="/">deepwork.garden</Link>
        </p>
      </div>
    </main>
  );
}
