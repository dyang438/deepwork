import { sql } from "drizzle-orm";

import { cliUser, unauthorized } from "@/lib/cli-auth";
import { getDb } from "@/lib/db";

// `deepwork agent` calls this every few seconds: it checks in, then claims the oldest fresh command, if any.
export async function POST(request: Request) {
  const userId = await cliUser(request);
  if (!userId) return unauthorized();
  const host = (request.headers.get("x-deepwork-host") ?? "").slice(0, 80) || null;
  const db = getDb();
  // Write the check-in only every ~15 s, so idle polling doesn't stream updates to every open dashboard.
  await db.execute(sql`
    INSERT INTO cli_agents (user_id, host, seen_at) VALUES (${userId}, ${host}, now())
    ON CONFLICT (user_id) DO UPDATE SET host = excluded.host, seen_at = excluded.seen_at
    WHERE cli_agents.seen_at < now() - interval '15 seconds'`);
  const { rows } = await db.execute(sql`
    UPDATE cli_commands SET claimed_at = now()
    WHERE id = (SELECT id FROM cli_commands
                WHERE user_id = ${userId} AND claimed_at IS NULL AND created_at > now() - interval '2 minutes'
                ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED)
    RETURNING id, kind, goal, minutes`);
  return Response.json({ command: rows[0] ?? null }, { headers: { "Cache-Control": "no-store" } });
}
