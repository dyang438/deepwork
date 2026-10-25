import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { type ReactNode, Suspense } from "react";

import roses from "../../../public/roses.jpg";
import { getUser } from "@/auth/server";
import { UserMenu } from "@/auth/user-menu";
import { Logo } from "@/components/logo";

import { getDefaults } from "@/lib/settings";
import { getSetupStatus } from "@/lib/setup";
import { getEnv } from "@/lib/env";
import { getNotepad } from "@/lib/notepad";
import { loadActive, loadSessions } from "@/lib/sessions";

import { RealtimeRoot } from "../realtime-root";
import { FocusMode } from "./focus-mode";
import { SettingsGear } from "./settings/gear";
import { SetupInfo } from "./setup/info";
import { Tabs } from "./tabs";

async function Account() {
  await connection();
  const user = await getUser();
  return user ? <UserMenu email={user.email} /> : null;
}

async function Gear() {
  await connection();
  const user = await getUser();
  if (!user) return null;
  const [defaults, setup] = await Promise.all([getDefaults(user.id), getSetupStatus(user.id)]);
  return (
    <>
      <SettingsGear defaults={defaults} />
      <SetupInfo initial={setup} />
    </>
  );
}

// Shared frame for the signed-in pages: the painting band, and the Personal / My competitions bar.
function SiteFrame({ children }: { children: ReactNode }) {
  return (
    <main className="relative min-h-screen bg-ink">
      {/* The painting gets the top of the page; all controls sit along the bottom edge. */}
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-[30rem] overflow-hidden">
        <Image alt="" className="object-cover object-[50%_25%] opacity-90" fill placeholder="blur" priority sizes="100vw" src={roses} />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/0 via-ink/45 to-ink" />
      </div>
      <header className="relative px-6 pt-6 sm:px-8">
        <Link aria-label="Home" className="inline-block" href="/">
          <Logo className="size-14" />
        </Link>
      </header>
      <div className="relative mx-auto w-full max-w-3xl px-5 pt-32 pb-32">
        {children}
      </div>
      <nav aria-label="Sections" className="fixed bottom-5 left-1/2 z-20 -translate-x-1/2">
        <Tabs />
      </nav>
      <div className="fixed right-6 bottom-6 z-20">
        <Suspense>
          <Account />
        </Suspense>
      </div>
      <Suspense>
        <Gear />
      </Suspense>
    </main>
  );
}

async function SessionShell({ children }: { children: ReactNode }) {
  await connection();
  const user = await getUser();
  if (!user) redirect("/auth/sign-in");
  const [active, sessions, notepad] = await Promise.all([
    loadActive(user.id), loadSessions(user.id), getNotepad(user.id),
  ]);
  return (
    <RealtimeRoot key={user.id} url={getEnv().realtimeUrl}>
      <FocusMode active={active} initialNotepad={notepad} serverNow={Date.now()} sessions={sessions} userId={user.id}>
        {children}
      </FocusMode>
    </RealtimeRoot>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<main aria-busy="true" className="min-h-screen bg-ink" />}>
      <SessionShell><SiteFrame>{children}</SiteFrame></SessionShell>
    </Suspense>
  );
}
