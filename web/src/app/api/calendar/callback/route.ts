import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { getUser } from "@/auth/server";
import { CALENDAR_SCOPES } from "@/lib/calendar-scopes";
import { getDb } from "@/lib/db";
import { googleCalendarAttempts, googleCalendarGrants, googleTokenCache } from "@/lib/schema";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const state = (await cookies()).get("gcal_state")?.value;
  const user = await getUser();
  if (!user) return NextResponse.redirect(`${url.origin}/auth/sign-in`);
  const db = getDb();
  // Every outcome is saved (never token values), so the settings gear can say why a connect didn't take.
  const back = async (outcome: string, detail = "") => {
    await db
      .insert(googleCalendarAttempts)
      .values({ user_id: user.id, outcome, detail })
      .onConflictDoUpdate({ target: googleCalendarAttempts.user_id, set: { outcome, detail, at: new Date() } });
    const res = NextResponse.redirect(`${url.origin}/app?calendar=${outcome}`);
    res.cookies.delete({ name: "gcal_state", path: "/" });
    return res;
  };
  if (url.searchParams.get("error")) return back("declined", url.searchParams.get("error")!);
  if (!state || url.searchParams.get("state") !== state) return back("error", state ? "state mismatch" : "state cookie missing");
  const code = url.searchParams.get("code");
  if (!code) return back("declined", "no code");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${url.origin}/api/calendar/callback`,
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });
  if (!res.ok) return back("error", `token exchange ${res.status}: ${((await res.json().catch(() => ({}))) as { error?: string }).error ?? ""}`);
  const t = (await res.json()) as { access_token: string; expires_in: number; refresh_token?: string; scope?: string };
  if (!CALENDAR_SCOPES.every((s) => t.scope?.includes(s))) return back("declined", `granted: ${t.scope ?? ""}`); // unticked a permission
  if (t.refresh_token)
    await db
      .insert(googleCalendarGrants)
      .values({ user_id: user.id, refresh_token: t.refresh_token, scope: t.scope ?? "" })
      .onConflictDoUpdate({ target: googleCalendarGrants.user_id, set: { refresh_token: t.refresh_token, scope: t.scope ?? "" } });
  const expires_at = new Date(Date.now() + t.expires_in * 1000);
  await db
    .insert(googleTokenCache)
    .values({ user_id: user.id, access_token: t.access_token, expires_at })
    .onConflictDoUpdate({ target: googleTokenCache.user_id, set: { access_token: t.access_token, expires_at } });
  return back(t.refresh_token ? "connected" : "short", `fields: ${Object.keys(t).join(",")}`);
}
