import { sql } from "drizzle-orm";

import { cliUser, unauthorized } from "@/lib/cli-auth";
import { getDb } from "@/lib/db";

export async function GET(request: Request) {
  const userId = await cliUser(request);
  if (!userId) return unauthorized();
  const { rows } = await getDb().execute(sql`select email from neon_auth."user" where id = ${userId}`);
  return Response.json({ user_id: userId, email: rows[0]?.email ?? null });
}
