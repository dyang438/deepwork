import { eq } from "drizzle-orm";

import { getUser } from "@/auth/server";
import { getDb } from "@/lib/db";
import { googleCalendarGrants, googleTokenCache } from "@/lib/schema";

// Revokes the Calendar grant at Google and forgets our copies of its tokens.
export async function POST() {
  const user = await getUser();
  if (!user) return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const db = getDb();
  const [grant] = await db.select().from(googleCalendarGrants).where(eq(googleCalendarGrants.user_id, user.id));
  if (grant)
    await fetch("https://oauth2.googleapis.com/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: grant.refresh_token }),
    }).catch(() => {});
  await db.delete(googleCalendarGrants).where(eq(googleCalendarGrants.user_id, user.id));
  await db.delete(googleTokenCache).where(eq(googleTokenCache.user_id, user.id));
  return Response.json({ ok: true });
}
