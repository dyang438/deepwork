import Image from "next/image";
import Link from "next/link";

import roses from "../../public/roses.jpg";
import { Logo } from "@/components/logo";

import { Distracted } from "./distracted";
import { GoogleButton } from "./google-button";

// Public landing page; the dashboard lives at /app.
export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-ink">
      <header className="relative z-10 flex items-center justify-between border-b border-line px-6 py-4 sm:px-8">
        <span className="flex items-center gap-2.5 text-[15px] font-semibold tracking-[-0.02em]">
          <Logo className="size-7 drop-shadow-[0_0_10px_rgb(143_227_187/0.45)]" />
          godeep.work
        </span>
        <Link className="rounded-full border border-cream/30 bg-ink/50 px-4 py-1.5 text-sm backdrop-blur hover:border-cream/60" href="/app">
          Log in
        </Link>
      </header>

      {/* The painting fills the hero and falls off into black, as Neon's hero visual does. */}
      <div aria-hidden="true" className="absolute inset-0">
        <Image alt="" className="object-cover object-[60%_30%]" fill placeholder="blur" priority sizes="100vw" src={roses} />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/70 to-transparent" />
      </div>

      <section className="relative z-10 flex min-h-[calc(100vh-61px)] flex-col justify-end px-6 pb-16 sm:px-8 sm:pb-20">
        <p className="eyebrow mb-5">
          Inspired by Cal Newport&apos;s <em>Deep Work: Rules for Focused Success in a Distracted World</em>
        </p>
        <h1 className="m-0 max-w-3xl text-[44px] leading-[1.05] font-normal tracking-[-0.04em] sm:text-[64px]">
          Take Charge of Your Time
          <br />
          in a <Distracted text="Distracted World" />
        </h1>
        <p className="mt-6 mb-9 max-w-lg text-[17px] leading-relaxed text-mist">
          Log each block, watch your deep hours add up, live on every device.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <GoogleButton />
          <Link className="rounded-full border border-cream/25 px-6 py-3 text-[15px] hover:border-cream/60" href="/app">
            Open dashboard
          </Link>
        </div>
        <p className="eyebrow mt-16 border-t border-line pt-5 text-[11px] normal-case">
          Vincent van Gogh, <em>Roses</em>, 1890 · National Gallery of Art, Washington · Open Access
        </p>
      </section>
    </main>
  );
}
