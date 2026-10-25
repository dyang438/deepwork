import { eq } from "drizzle-orm";
import { connection } from "next/server";

import { getUser } from "@/auth/server";
import { Logo } from "@/components/logo";
import { getDb } from "@/lib/db";
import { competitions } from "@/lib/schema";

import { GoogleButton } from "../../google-button";
import { JoinButton } from "./join-button";

// Public: an invite link works for people who haven't signed up yet.
export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  await connection();
  const { code } = await params;
  const [comp] = /^[\w-]{4,20}$/.test(code)
    ? await getDb().select({ name: competitions.name }).from(competitions).where(eq(competitions.invite_code, code))
    : [];
  const user = await getUser();
  return (
    <main className="flex min-h-screen items-center justify-center bg-ink bg-[radial-gradient(ellipse_at_top,rgb(143_227_187/0.12),transparent_60%)] p-5">
      <div className="w-full max-w-md rounded-2xl border border-line bg-panel/80 p-8">
        <Logo className="mb-4 size-16" />
        {!comp ? (
          <p className="text-mist">This invite link doesn&apos;t match a competition.</p>
        ) : (
          <>
            <p className="eyebrow mb-2 text-[11px]">You&apos;re invited to</p>
            <h1 className="mt-0 mb-8 text-3xl font-normal tracking-[-0.03em]">{comp.name}</h1>
            {user ? <JoinButton code={code} /> : <GoogleButton next={`/join/${code}`} />}
          </>
        )}
      </div>
    </main>
  );
}
