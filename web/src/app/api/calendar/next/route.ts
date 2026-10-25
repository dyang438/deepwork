import { getUser } from "@/auth/server";
import { calendarStatus } from "@/lib/google-calendar";

export async function GET() {
  const user = await getUser();
  if (!user) return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  return Response.json(await calendarStatus(user.id), { headers: { "Cache-Control": "private, no-store" } });
}
