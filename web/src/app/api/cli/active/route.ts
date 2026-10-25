import { eq } from "drizzle-orm";
import { z } from "zod";

import { cliUser, unauthorized } from "@/lib/cli-auth";
import { getDb } from "@/lib/db";
import { activeSessions } from "@/lib/schema";

const input = z.object({ goal: z.string().trim().min(1).max(200), started_at: z.iso.datetime({ offset: true }), ends_at: z.iso.datetime({ offset: true }) });

// The CLI calls this when a session starts; the dashboard shows it live until DELETE.
export async function PUT(request: Request) {
  const userId = await cliUser(request);
  if (!userId) return unauthorized();
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "INVALID_INPUT" }, { status: 400 });
  const row = { goal: parsed.data.goal, started_at: new Date(parsed.data.started_at), ends_at: new Date(parsed.data.ends_at) };
  await getDb().insert(activeSessions).values({ user_id: userId, ...row }).onConflictDoUpdate({ target: activeSessions.user_id, set: row });
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const userId = await cliUser(request);
  if (!userId) return unauthorized();
  await getDb().delete(activeSessions).where(eq(activeSessions.user_id, userId));
  return Response.json({ ok: true });
}
