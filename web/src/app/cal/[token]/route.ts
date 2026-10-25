import { desc, eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { calFeeds, deepSessions } from "@/lib/schema";

// RFC 5545 text escaping, and UTC timestamps like 20261025T183000Z.
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

// A private, read-only feed of the user's sessions. The token in the URL is the only credential.
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const token = (await params).token.replace(/\.ics$/, "");
  const db = getDb();
  const [feed] = await db.select({ user_id: calFeeds.user_id }).from(calFeeds).where(eq(calFeeds.token, token));
  if (!feed) return new Response("Not found", { status: 404 });
  const rows = await db
    .select()
    .from(deepSessions)
    .where(eq(deepSessions.user_id, feed.user_id))
    .orderBy(desc(deepSessions.started_at))
    .limit(1000);
  const now = stamp(new Date());
  const events = rows.map((r) => {
    const end = new Date(r.started_at.getTime() + Math.max(r.minutes, 1) * 60_000);
    const desc = [`${r.minutes} min · ${r.outcome}`, r.focus_pct != null ? `focus ${r.focus_pct}%` : "", r.notes ?? ""]
      .filter(Boolean)
      .join("\n");
    return [
      "BEGIN:VEVENT",
      `UID:${r.id}@deepwork.garden`,
      `DTSTAMP:${now}`,
      `DTSTART:${stamp(r.started_at)}`,
      `DTEND:${stamp(end)}`,
      `SUMMARY:${esc(`Deep work: ${r.goal}`)}`,
      `DESCRIPTION:${esc(desc)}`,
      "TRANSP:OPAQUE",
      "END:VEVENT",
    ].join("\r\n");
  });
  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//deepwork.garden//sessions//EN",
    "CALSCALE:GREGORIAN",
    "X-WR-CALNAME:Deep work",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    ...events,
    "END:VCALENDAR",
    "",
  ].join("\r\n");
  return new Response(body, { headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "private, max-age=300" } });
}
