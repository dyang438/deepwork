import "server-only";

import { eq } from "drizzle-orm";

import { getDb } from "./db";
import { userSettings } from "./schema";

export type Defaults = { minutes: number; outcome: "done" | "partial" | "not done"; focus: number | null };

export const FALLBACK: Defaults = { minutes: 90, outcome: "done", focus: null };

export async function getDefaults(userId: string): Promise<Defaults> {
  const [row] = await getDb().select().from(userSettings).where(eq(userSettings.user_id, userId));
  if (!row) return FALLBACK;
  return { minutes: row.default_minutes, outcome: row.default_outcome as Defaults["outcome"], focus: row.default_focus };
}
