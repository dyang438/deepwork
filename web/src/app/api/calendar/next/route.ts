import { getUser } from "@/auth/server";
import { calendarStatus } from "@/lib/google-calendar";

// ?from=&to= (ISO) is the browser's local day, for drawing events on the today timeline.
export async function GET(request: Request) {
  const user = await getUser();
  if (!user) return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const q = new URL(request.url).searchParams;
  const date = (k: string) => (q.get(k) && !Number.isNaN(Date.parse(q.get(k)!)) ? new Date(q.get(k)!) : undefined);
  return Response.json(await calendarStatus(user.id, date("from"), date("to")), { headers: { "Cache-Control": "private, no-store" } });
}
