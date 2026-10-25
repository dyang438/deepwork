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
    <nav className="flex items-center gap-3 text-[13px] text-mist">
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
