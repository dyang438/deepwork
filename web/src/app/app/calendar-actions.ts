"use server";

import { randomBytes } from "node:crypto";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";

import { getUser } from "@/auth/server";
import { getDb } from "@/lib/db";
import { calFeeds } from "@/lib/schema";

/** The user's private calendar feed URL, created on first use. */
export async function calendarFeedUrl(): Promise<string | null> {
  const user = await getUser();
  if (!user) return null;
  const db = getDb();
  let [feed] = await db.select({ token: calFeeds.token }).from(calFeeds).where(eq(calFeeds.user_id, user.id));
  if (!feed) {
    [feed] = await db
      .insert(calFeeds)
      .values({ user_id: user.id, token: randomBytes(18).toString("base64url") })
      .onConflictDoNothing()
      .returning({ token: calFeeds.token });
    feed ??= (await db.select({ token: calFeeds.token }).from(calFeeds).where(eq(calFeeds.user_id, user.id)))[0];
  }
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}/cal/${feed.token}.ics`;
}
