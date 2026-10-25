import { randomBytes } from "node:crypto";

import { cookies } from "next/headers";

import { getUser } from "@/auth/server";
import { CALENDAR_SCOPES } from "@/lib/calendar-scopes";

// Starts the read-only Calendar connection: Google consent with offline access, so the grant outlives the hour.
export async function GET(request: Request) {
  const user = await getUser();
  const origin = new URL(request.url).origin;
  if (!user) return Response.redirect(`${origin}/auth/sign-in`);
  const state = randomBytes(24).toString("base64url");
  (await cookies()).set("gcal_state", state, { httpOnly: true, secure: origin.startsWith("https"), sameSite: "lax", maxAge: 600, path: "/api/calendar" });
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${origin}/api/calendar/callback`,
    response_type: "code",
    scope: CALENDAR_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    login_hint: user.email,
    state,
  }).toString();
  return Response.redirect(url.toString());
}
