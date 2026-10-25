import Link from "next/link";
import { connection } from "next/server";

import { getUser } from "@/auth/server";
import { Logo } from "@/components/logo";

import { GoogleButton } from "../google-button";
import { Approve } from "./approve";

// Opened by `deepwork login`. Public, so a signed-out visitor can sign in with Google and land back here.
export default async function CliPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  await connection();
  const code = ((await searchParams).code ?? "").toUpperCase();
  const valid = /^[A-Z]{4}-[A-Z]{4}$/.test(code);
  const user = await getUser();
  return (
    <main className="flex min-h-screen items-center justify-center bg-ink bg-[radial-gradient(ellipse_at_top,rgb(143_227_187/0.12),transparent_60%)] p-5">
      <div className="w-full max-w-md rounded-2xl border border-line bg-panel/80 p-8">
        <p className="eyebrow mb-6 flex items-center gap-2.5 text-cream">
          <Logo className="size-6" />
          godeep.work
        </p>
        <h1 className="mt-0 mb-3 text-3xl font-normal tracking-[-0.03em]">Connect the deepwork CLI</h1>
        {!valid ? (
          <p className="text-mist">
            No code here. Run <code className="font-mono text-cream">deepwork login</code> in your terminal.
          </p>
        ) : (
          <>
            <p className="mb-2 text-mist">Check that your terminal shows this code:</p>
            <p className="mb-8 font-mono text-4xl tracking-[0.12em] text-mint" data-testid="user-code">
              {code}
            </p>
            {user ? (
              <>
                <p className="mb-5 text-sm text-mist">Signed in as {user.email}</p>
                <Approve code={code} />
              </>
            ) : (
              <div className="flex flex-col items-start gap-4">
                <GoogleButton next={`/cli?code=${code}`} />
                <Link className="text-sm text-mist underline hover:text-cream" href="/auth/sign-in">
                  Or sign in with email, then reopen this link
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
