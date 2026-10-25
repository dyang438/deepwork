"use client";

import { authClient } from "./client";
import { leaveSession } from "./session-lost";

// The signed-in user's email and a Sign out button.
export function UserMenu({ email }: { readonly email: string }) {
  async function signOut() {
    await authClient.signOut();
    leaveSession();
  }

  return (
    <nav className="absolute inset-x-0 top-0 z-10 mx-auto flex w-full max-w-3xl items-center justify-end gap-3 px-5 pt-5 text-[13px] text-mist">
      <span className="truncate">{email}</span>
      <button
        className="cursor-pointer rounded-full border border-cream/25 px-3.5 py-1.5 font-medium text-cream hover:border-cream/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mint"
        onClick={signOut}
        type="button"
      >
        Sign out
      </button>
    </nav>
  );
}
