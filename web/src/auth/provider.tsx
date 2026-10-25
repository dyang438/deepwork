"use client";

import { NeonAuthUIProvider } from "@neondatabase/auth-ui";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { authClient } from "./client";

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  return (
    <NeonAuthUIProvider
      authClient={authClient}
      defaultTheme="dark"
      navigate={router.push}
      replace={router.replace}
      onSessionChange={() => {
        window.location.assign("/app");
        // Never settles, so the auth UI doesn't also navigate client-side.
        return new Promise<never>(() => {});
      }}
      Link={Link}
      redirectTo="/app"
      social={{ providers: ["google"] }}
    >
      {children}
    </NeonAuthUIProvider>
  );
}
