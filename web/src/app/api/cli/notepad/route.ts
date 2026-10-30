import { sql } from "drizzle-orm";
import { z } from "zod";

import { cliUser, unauthorized } from "@/lib/cli-auth";
import { getDb } from "@/lib/db";
import { userSettings } from "@/lib/schema";

const input = z.object({ lines: z.array(z.string().trim().min(1).max(2000)).min(1).max(50) });

// `deepwork capture` and shutdown open loops: appended to the bottom of the user's notepad, one line each.
export async function POST(request: Request) {
  const userId = await cliUser(request);
  if (!userId) return unauthorized();
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "INVALID_INPUT" }, { status: 400 });
  const add = parsed.data.lines.join("\n") + "\n";
  // Starts on a fresh line, and the notepad's 50,000-character limit still holds.
  const joined = sql`CASE WHEN ${userSettings.notepad} = '' OR right(${userSettings.notepad}, 1) = E'\\n'
    THEN ${userSettings.notepad} || ${add} ELSE ${userSettings.notepad} || E'\\n' || ${add} END`;
  const [row] = await getDb()
    .insert(userSettings)
    .values({ user_id: userId, notepad: add })
    .onConflictDoUpdate({ target: userSettings.user_id, set: { notepad: joined }, setWhere: sql`length(${joined}) <= 50000` })
    .returning({ user_id: userSettings.user_id });
  if (!row) return Response.json({ error: "NOTEPAD_FULL" }, { status: 413 });
  return Response.json({ ok: true });
}
