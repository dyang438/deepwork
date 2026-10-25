import type { NextRequest } from "next/server";

import { getAuth } from "@/auth/server";

let middleware:
  ReturnType<ReturnType<typeof getAuth>["middleware"]> | undefined;

export default function proxy(request: NextRequest) {
  // Signed-out page loads get an HTTP redirect. Server Actions skip it and return UNAUTHENTICATED themselves.
  if (request.headers.has("next-action")) return;
  // Public pages (/, /cli, /join/*) only need the middleware right after Google sends the user back: it trades
  // the verifier in the URL for the session cookie. Otherwise they stay open to signed-out visitors.
  const isPublic = !request.nextUrl.pathname.startsWith("/app");
  if (isPublic && !request.nextUrl.searchParams.has("neon_auth_session_verifier")) return;
  middleware ??= getAuth().middleware({ loginUrl: "/auth/sign-in" });
  return middleware(request);
}

// The dashboard, plus the public pages a Google sign-in can return to. /api/* routes answer 401 themselves.
export const config = { matcher: ["/", "/app/:path*", "/cli", "/join/:path*"] };
