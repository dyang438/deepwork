"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";

import { getUser } from "@/auth/server";
import { getDb } from "@/lib/db";
import { userSettings } from "@/lib/schema";

const input = z.object({ text: z.string().max(50_000), base: z.string().max(50_000).optional() });

export async function saveNotepad(pageUserId: string, raw: z.input<typeof input>) {
  const user = await getUser(pageUserId);
  if (!user) return { ok: false, error: "Your sign-in changed. Refresh to sync your notes." };
  const parsed = input.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Keep notes under 50,000 characters." };
  const db = getDb();
  let { text } = parsed.data;
  const { base } = parsed.data;
  // Lines the CLI appended since this page last saved (`deepwork capture`) are kept, not overwritten.
  const [row] = await db.select({ notepad: userSettings.notepad }).from(userSettings).where(eq(userSettings.user_id, user.id));
  const current = row?.notepad ?? "";
  if (base !== undefined && current !== base && current.startsWith(base)) text = (text + current.slice(base.length)).slice(0, 50_000);
  await db.insert(userSettings)
    .values({ user_id: user.id, notepad: text })
    .onConflictDoUpdate({ target: userSettings.user_id, set: { notepad: text } });
  return { ok: true, text };
}
