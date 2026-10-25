import "server-only";

import { desc, eq } from "drizzle-orm";

import { getDb } from "./db";
import { getRealtime } from "./realtime";
import { activeSessions, cliAgents, deepSessions } from "./schema";

// The only place the live query is built, so the server read, the seal and every renewal match.
// `userId` must come from getUser(), never from the client.
function sessionsQuery(userId: string) {
  return getDb()
    .select({
      id: deepSessions.id,
      goal: deepSessions.goal,
      minutes: deepSessions.minutes,
      outcome: deepSessions.outcome,
      focus_pct: deepSessions.focus_pct,
      notes: deepSessions.notes,
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

// The CLI session running right now, if any (one row per user).
function activeQuery(userId: string) {
  return getDb()
    .select({
      user_id: activeSessions.user_id,
      goal: activeSessions.goal,
      started_at: activeSessions.started_at,
      ends_at: activeSessions.ends_at,
    })
    .from(activeSessions)
    .where(eq(activeSessions.user_id, userId));
}

export type ActiveRow = Awaited<ReturnType<typeof activeQuery>>[number];

export async function loadActive(userId: string) {
  const query = activeQuery(userId);
  const [rows, sealedQuery] = await Promise.all([query, getRealtime().seal({ query })]);
  return { rows, sealedQuery };
}

export const sealActive = (userId: string) => getRealtime().seal({ query: activeQuery(userId) });

// When the user's Mac agent last checked in (live, so + knows whether it can start a block).
function agentQuery(userId: string) {
  return getDb()
    .select({ user_id: cliAgents.user_id, host: cliAgents.host, seen_at: cliAgents.seen_at })
    .from(cliAgents)
    .where(eq(cliAgents.user_id, userId));
}

export type AgentRow = Awaited<ReturnType<typeof agentQuery>>[number];

export async function loadAgent(userId: string) {
  const query = agentQuery(userId);
  const [rows, sealedQuery] = await Promise.all([query, getRealtime().seal({ query })]);
  return { rows, sealedQuery };
}

export const sealAgent = (userId: string) => getRealtime().seal({ query: agentQuery(userId) });
