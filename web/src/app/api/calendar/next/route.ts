import { eq } from "drizzle-orm";

import { getUser } from "@/auth/server";
import { getDb } from "@/lib/db";
import { calendarStatus } from "@/lib/google-calendar";
import { googleCalendarAttempts } from "@/lib/schema";

// ?from=&to= (ISO) is the browser's local day, for drawing events on the today timeline.
export async function GET(request: Request) {
  const user = await getUser();
  if (!user) return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const q = new URL(request.url).searchParams;
  const date = (k: string) => (q.get(k) && !Number.isNaN(Date.parse(q.get(k)!)) ? new Date(q.get(k)!) : undefined);
  const status = await calendarStatus(user.id, date("from"), date("to"));
  // Not connected: say how the last connect attempt ended, if it didn't take.
  const [attempt] = status.connected ? [] : await getDb().select().from(googleCalendarAttempts).where(eq(googleCalendarAttempts.user_id, user.id));
  return Response.json({ ...status, attempt: attempt && { outcome: attempt.outcome, detail: attempt.detail } }, { headers: { "Cache-Control": "private, no-store" } });
}
