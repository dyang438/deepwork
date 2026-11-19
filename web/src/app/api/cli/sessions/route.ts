import { sql } from "drizzle-orm";
import { z } from "zod";

import { cliUser, unauthorized } from "@/lib/cli-auth";
import { getDb } from "@/lib/db";
import { deepSessions } from "@/lib/schema";

const session = z.object({
  id: z.uuid(), // uuid5 of the CLI's record id, so re-sending the whole log never duplicates
  goal: z.string().trim().min(1).max(200),
  minutes: z.number().int().min(0).max(1440),
  outcome: z.enum(["done", "partial", "not done", "unrecorded"]),
  started_at: z.iso.datetime({ offset: true }),
  focus_pct: z.number().int().min(0).max(100).nullable().optional(),
  activity_focus_pct: z.number().int().min(0).max(100).nullable().optional(),
});
const input = z.object({ sessions: z.array(session).max(5000) });

// Upload finished sessions from the CLI's local log. Upserts by id, only ever for the token's own user.
export async function POST(request: Request) {
  const userId = await cliUser(request);
  if (!userId) return unauthorized();
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "INVALID_INPUT", issues: parsed.error.issues.slice(0, 3) }, { status: 400 });
  const rows = parsed.data.sessions.map((s) => ({
    ...s,
    focus_pct: s.focus_pct ?? null,
    activity_focus_pct: s.activity_focus_pct ?? null,
    user_id: userId,
    started_at: new Date(s.started_at),
  }));
  if (rows.length)
    await getDb()
      .insert(deepSessions)
      .values(rows)
      .onConflictDoUpdate({
        target: deepSessions.id,
        // Keep edits to manual ratings and accept measured focus whenever the CLI has it.
        set: {
          focus_pct: sql`COALESCE(${deepSessions.focus_pct}, excluded.focus_pct)`,
          activity_focus_pct: sql`COALESCE(excluded.activity_focus_pct, ${deepSessions.activity_focus_pct})`,
        },
        setWhere: sql`${deepSessions.user_id} = ${userId}`, // never touch another user's row
      });
  return Response.json({ synced: rows.length });
}
