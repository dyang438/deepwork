import Image from "next/image";
import Link from "next/link";

import roses from "../../public/roses.jpg";
import { Logo } from "@/components/logo";

import { Distracted } from "./distracted";
import { GoogleButton } from "./google-button";
import { LandingKeys } from "./landing-keys";

// Public landing page; the dashboard lives at /app.
export default function Home() {
  return (
    <main className="relative flex h-dvh flex-col overflow-hidden bg-ink">
      <LandingKeys />
      <header className="relative z-10 flex items-center justify-between border-b border-line px-6 py-2 sm:px-8">
        <Logo className="size-16" />
        <nav className="flex items-center gap-6 text-sm">
          <a className="text-cream/90 hover:text-white" href="https://github.com/dyang438/deepwork">
            CLI
          </a>
          <Link className="rounded-full border border-cream/30 bg-ink/40 px-4 py-1.5 backdrop-blur hover:border-cream/60" href="/app">
            Dashboard
          </Link>
        </nav>
      </header>

      {/* The painting fills the hero and falls off into black, as Neon's hero visual does. */}
      <div aria-hidden="true" className="absolute inset-0">
        <Image alt="" className="object-cover object-[60%_30%]" fill placeholder="blur" priority sizes="100vw" src={roses} />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/70 to-transparent" />
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-ink/70 to-transparent" />
      </div>

      <section className="relative z-10 flex min-h-0 flex-1 flex-col justify-end px-6 pb-16 sm:px-8 sm:pb-20">
        <p className="eyebrow mb-5">
          Inspired by Cal Newport&apos;s <em>Deep Work: Rules for Focused Success in a Distracted World</em>
        </p>
        <h1 className="m-0 max-w-3xl text-[44px] leading-[1.05] font-normal tracking-[-0.04em] sm:text-[64px]">
          Take Charge of Your Time
          <br />
          in a <Distracted text="Distracted World" />
        </h1>
        <div className="mt-10 flex flex-wrap items-center gap-3">
          <GoogleButton />
        </div>
        <p className="eyebrow mt-16 border-t border-line pt-5 text-[11px] normal-case">
          Vincent van Gogh, <em>Roses</em>, 1890 · National Gallery of Art, Washington · Open Access
        </p>
      </section>
    </main>
  );
}
