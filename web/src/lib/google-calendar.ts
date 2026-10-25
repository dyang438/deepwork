import "server-only";

import { sql } from "drizzle-orm";

import { getDb } from "./db";
import { googleTokenCache } from "./schema";

import { CALENDAR_SCOPES } from "./calendar-scopes";

export type NextEvent = { summary: string; start: string };
export type DayEvent = { summary: string; start: string; end: string };
export type CalendarStatus =
  | { connected: false }
  | { connected: true; next: NextEvent | null; events: DayEvent[]; reconnect?: true };

type Account = { accessToken: string | null; refreshToken: string | null; expiresAt: Date | null; scope: string | null };

// The Google grant Neon Auth stored when the user signed in or connected Calendar. Read only: we never edit neon_auth.
async function googleAccount(userId: string): Promise<Account | null> {
  const { rows } = await getDb().execute(sql`
    SELECT "accessToken", "refreshToken", "accessTokenExpiresAt", scope FROM neon_auth.account
    WHERE "userId" = ${userId} AND "providerId" = 'google' ORDER BY "updatedAt" DESC LIMIT 1`);
  const r = rows[0] as Record<string, unknown> | undefined;
  if (!r) return null;
  return {
    accessToken: (r.accessToken as string) ?? null,
    refreshToken: (r.refreshToken as string) ?? null,
    expiresAt: r.accessTokenExpiresAt ? new Date(r.accessTokenExpiresAt as string) : null,
    scope: (r.scope as string) ?? null,
  };
}

const hasCalendarScope = (scope: string | null) => CALENDAR_SCOPES.every((s) => scope?.includes(s));

// A usable access token: Neon's if still fresh, else one we refreshed earlier, else a new refresh. Null: reconnect needed.
async function accessToken(userId: string, account: Account): Promise<string | null> {
  const soon = Date.now() + 60_000;
  if (account.accessToken && account.expiresAt && account.expiresAt.getTime() > soon) return account.accessToken;
  const db = getDb();
  const { rows } = await db.execute(sql`SELECT access_token, expires_at FROM google_token_cache WHERE user_id = ${userId}`);
  const cached = rows[0] as { access_token: string; expires_at: string } | undefined;
  if (cached && new Date(cached.expires_at).getTime() > soon) return cached.access_token;
  if (!account.refreshToken || !process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) return null;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: account.refreshToken,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });
  if (!res.ok) return null; // revoked or expired grant
  const t = (await res.json()) as { access_token: string; expires_in: number };
  const expires_at = new Date(Date.now() + t.expires_in * 1000);
  await db
    .insert(googleTokenCache)
    .values({ user_id: userId, access_token: t.access_token, expires_at })
    .onConflictDoUpdate({ target: googleTokenCache.user_id, set: { access_token: t.access_token, expires_at } });
  return t.access_token;
}

type GEvent = {
  summary?: string;
  status?: string;
  transparency?: string;
  eventType?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  attendees?: { self?: boolean; responseStatus?: string }[];
};

async function google<T>(token: string, path: string): Promise<T | null> {
  const res = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (res.status === 401 || res.status === 403) throw new Error("UNAUTHORIZED");
  return res.ok ? ((await res.json()) as T) : null;
}

// Our own read-only Calendar grant, if the user connected through /api/calendar/connect.
async function ownGrant(userId: string): Promise<Account | null> {
  const { rows } = await getDb().execute(sql`SELECT refresh_token, scope FROM google_calendar_grants WHERE user_id = ${userId}`);
  const r = rows[0] as { refresh_token: string; scope: string } | undefined;
  return r ? { accessToken: null, refreshToken: r.refresh_token, expiresAt: null, scope: r.scope } : null;
}

/**
 * The user's busy events between from and to (their local day, from the browser), plus the next one starting after now.
 * Read live from Google and not stored anywhere.
 */
export async function calendarStatus(userId: string, from?: Date, to?: Date): Promise<CalendarStatus> {
  const own = await ownGrant(userId);
  const account = own && hasCalendarScope(own.scope) ? own : await googleAccount(userId);
  if (!account || !hasCalendarScope(account.scope)) return { connected: false };
  const token = await accessToken(userId, account);
  if (!token) return { connected: true, next: null, events: [], reconnect: true };
  try {
    const list = await google<{ items?: { id: string; selected?: boolean; primary?: boolean }[] }>(
      token,
      "/users/me/calendarList?minAccessRole=reader&fields=items(id,selected,primary)",
    );
    const calendars = (list?.items ?? []).filter((c) => c.primary || c.selected).map((c) => c.id);
    if (!calendars.length) calendars.push("primary");
    const now = new Date();
    const timeMin = from && from < now ? from : now;
    const timeMax = new Date(Math.max(now.getTime() + 24 * 3600_000, to?.getTime() ?? 0));
    const fields = "items(summary,status,transparency,eventType,start,end,attendees(self,responseStatus))";
    const results = await Promise.all(
      calendars.slice(0, 10).map((id) =>
        google<{ items?: GEvent[] }>(
          token,
          `/calendars/${encodeURIComponent(id)}/events?singleEvents=true&orderBy=startTime&maxResults=15` +
            `&timeMin=${timeMin.toISOString()}&timeMax=${timeMax.toISOString()}&fields=${encodeURIComponent(fields)}`,
        ),
      ),
    );
    const busy = results
      .flatMap((r) => r?.items ?? [])
      .filter(
        (e) =>
          e.status !== "cancelled" &&
          e.transparency !== "transparent" && // "free" events don't block time
          e.eventType !== "workingLocation" &&
          !!e.start?.dateTime && // all-day events don't have a start time to stop before
          !e.attendees?.some((a) => a.self && a.responseStatus === "declined"),
      )
      .sort((a, b) => new Date(a.start!.dateTime!).getTime() - new Date(b.start!.dateTime!).getTime());
    const first = busy.find((e) => new Date(e.start!.dateTime!).getTime() > now.getTime());
    const events = busy
      .filter((e) => (!from || new Date(e.end?.dateTime ?? e.start!.dateTime!) > from) && (!to || new Date(e.start!.dateTime!) < to))
      .map((e) => ({ summary: e.summary || "Busy", start: e.start!.dateTime!, end: e.end?.dateTime ?? e.start!.dateTime! }));
    return {
      connected: true,
      next: first ? { summary: first.summary || "Busy", start: first.start!.dateTime! } : null,
      events,
    };
  } catch {
    return { connected: true, next: null, events: [], reconnect: true };
  }
}
