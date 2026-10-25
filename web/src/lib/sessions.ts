import "server-only";

import { desc, eq } from "drizzle-orm";

import { getDb } from "./db";
import { getRealtime } from "./realtime";
import { deepSessions } from "./schema";

// The only place the live query is built, so the server read, the seal and every renewal match.
// `userId` must come from getUser(), never from the client.
function sessionsQuery(userId: string) {
  return getDb()
    .select({
      id: deepSessions.id,
      goal: deepSessions.goal,
      minutes: deepSessions.minutes,
      outcome: deepSessions.outcome,
      started_at: deepSessions.started_at,
    })
    .from(deepSessions)
    .where(eq(deepSessions.user_id, userId))
    .orderBy(desc(deepSessions.started_at), desc(deepSessions.id))
    .limit(200);
}

export type SessionRow = Awaited<ReturnType<typeof sessionsQuery>>[number];

export async function loadSessions(userId: string) {
  const query = sessionsQuery(userId);
  const [rows, sealedQuery] = await Promise.all([query, getRealtime().seal({ query })]);
  return { rows, sealedQuery };
}

export const sealSessions = (userId: string) => getRealtime().seal({ query: sessionsQuery(userId) });
