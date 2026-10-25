"use client";

import { useRouter } from "next/navigation";
import { startTransition } from "react";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  return (
    <main className="min-h-screen bg-ink px-5 py-24 text-cream">
      <div className="mx-auto w-full max-w-3xl">
        <p
          role="alert"
          className="mb-4 rounded-2xl border border-line bg-panel p-4 text-rose"
        >
          Couldn&apos;t load your sessions.
        </p>
        <button
          className="cursor-pointer rounded-full bg-cream px-5 py-2.5 font-medium text-ink hover:bg-white"
          // reset() alone re-renders the client tree with the same failed server payload. Refresh first, so the
          // retry runs the Server Components again, in one transition with the reset.
          onClick={() =>
            startTransition(() => {
              router.refresh();
              reset();
            })
          }
          type="button"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
