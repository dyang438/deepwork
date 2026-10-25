import { cookies } from "next/headers";

import { getUser } from "@/auth/server";
import { CALENDAR_SCOPES } from "@/lib/calendar-scopes";
import { getDb } from "@/lib/db";
import { googleCalendarGrants, googleTokenCache } from "@/lib/schema";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const back = (q: string) => Response.redirect(`${url.origin}/app?calendar=${q}`);
  const jar = await cookies();
  const state = jar.get("gcal_state")?.value;
  jar.delete({ name: "gcal_state", path: "/api/calendar" });
  const user = await getUser();
  if (!user) return Response.redirect(`${url.origin}/auth/sign-in`);
  if (!state || url.searchParams.get("state") !== state) return back("error");
  const code = url.searchParams.get("code");
  if (!code) return back("declined"); // the user said no: everything else keeps working
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
  if (!res.ok) return back("error");
  const t = (await res.json()) as { access_token: string; expires_in: number; refresh_token?: string; scope?: string };
  // Field names only, never values: shows whether Google sent a refresh grant.
  console.log("[calendar] token response fields:", Object.keys(t).join(","));
  if (!CALENDAR_SCOPES.every((s) => t.scope?.includes(s))) return back("declined"); // unticked a permission
  const db = getDb();
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
  return back("connected");
}
