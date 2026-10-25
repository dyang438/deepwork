import "server-only";

import { rawSql } from "@neon/realtime/server";
import { and, eq, sql } from "drizzle-orm";

import { getDb } from "./db";
import { getRealtime } from "./realtime";
import { competitionMembers, competitions } from "./schema";

export type LeaderRow = {
  user_id: string;
  display_name: string;
  minutes: number;
  sessions: number;
  avg_focus: number | null; // minute-weighted average of the sessions that have a self-reported focus
};

// The only place the leaderboard SQL lives, so the server read, the seal and every renewal match.
// Authorized in the query: rows come back only while $2 is a member of competition $1.
const LEADERBOARD_SQL = `
  SELECT m.user_id, m.display_name,
         COALESCE(SUM(s.minutes), 0)::int AS minutes,
         COUNT(s.id)::int AS sessions,
         ROUND(SUM(s.minutes * s.focus_pct)::numeric / NULLIF(SUM(s.minutes) FILTER (WHERE s.focus_pct IS NOT NULL), 0))::int AS avg_focus
  FROM competition_members m
  JOIN competitions c ON c.id = m.competition_id
  LEFT JOIN deep_sessions s ON s.user_id = m.user_id AND s.started_at >= c.starts_at
       AND (c.ends_at IS NULL OR s.started_at < c.ends_at)
  WHERE m.competition_id = $1
    AND EXISTS (SELECT 1 FROM competition_members me WHERE me.competition_id = $1 AND me.user_id = $2)
  GROUP BY m.user_id, m.display_name`;

const leaderboardQuery = (competitionId: string, userId: string) =>
  rawSql<LeaderRow>(LEADERBOARD_SQL, [competitionId, userId]);

export async function loadLeaderboard(competitionId: string, userId: string) {
  const [{ rows }, sealedQuery] = await Promise.all([
    getDb().$client.query<LeaderRow>(LEADERBOARD_SQL, [competitionId, userId]),
    getRealtime().seal({ query: leaderboardQuery(competitionId, userId) }),
  ]);
  return { rows, sealedQuery };
}

export const sealLeaderboard = (competitionId: string, userId: string) =>
  getRealtime().seal({ query: leaderboardQuery(competitionId, userId) });

/** The competition, only if the user is a member of it. */
export async function getMembership(competitionId: string, userId: string) {
  const [row] = await getDb()
    .select({ id: competitions.id, name: competitions.name, invite_code: competitions.invite_code, starts_at: competitions.starts_at, ends_at: competitions.ends_at })
    .from(competitions)
    .innerJoin(competitionMembers, eq(competitionMembers.competition_id, competitions.id))
    .where(and(eq(competitions.id, competitionId), eq(competitionMembers.user_id, userId)));
  return row ?? null;
}

export async function myCompetitions(userId: string) {
  return getDb()
    .select({
      id: competitions.id,
      name: competitions.name,
      starts_at: competitions.starts_at,
      ends_at: competitions.ends_at,
      members: sql<number>`(SELECT COUNT(*)::int FROM competition_members x WHERE x.competition_id = ${competitions.id})`,
    })
    .from(competitions)
    .innerJoin(competitionMembers, eq(competitionMembers.competition_id, competitions.id))
    .where(eq(competitionMembers.user_id, userId))
    .orderBy(sql`${competitions.starts_at} DESC`);
}
