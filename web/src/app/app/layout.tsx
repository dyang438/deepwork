import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { type ReactNode, Suspense } from "react";

import roses from "../../../public/roses.jpg";
import { getUser } from "@/auth/server";
import { UserMenu } from "@/auth/user-menu";
import { Logo } from "@/components/logo";

import { getDefaults } from "@/lib/settings";

import { SettingsGear } from "./settings/gear";
import { Tabs } from "./tabs";

async function Account() {
  await connection();
  const user = await getUser();
  return user ? <UserMenu email={user.email} /> : null;
}

async function Gear() {
  await connection();
  const user = await getUser();
  return user ? <SettingsGear defaults={await getDefaults(user.id)} /> : null;
}

// Shared frame for the signed-in pages: the painting band, and the Personal / My competitions bar.
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <main className="relative min-h-screen bg-ink">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-80 overflow-hidden">
        <Image alt="" className="object-cover object-[50%_20%] opacity-70" fill placeholder="blur" priority sizes="100vw" src={roses} />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/20 via-ink/70 to-ink" />
      </div>
      <div className="relative mx-auto w-full max-w-3xl px-5 pt-6 pb-16">
        <header className="mb-14 flex flex-wrap items-center gap-x-6 gap-y-3">
          <Link aria-label="Home" href="/">
            <Logo className="size-14" />
          </Link>
          <Tabs />
          <div className="ml-auto">
            <Suspense>
              <Account />
            </Suspense>
          </div>
        </header>
        {children}
      </div>
      <Suspense>
        <Gear />
      </Suspense>
    </main>
  );
}
