"use server";

import { z } from "zod";

import { getUser } from "@/auth/server";
import { getDb } from "@/lib/db";
import { userSettings } from "@/lib/schema";

const input = z.object({ text: z.string().max(50_000) });

export async function saveNotepad(pageUserId: string, raw: z.input<typeof input>) {
  const user = await getUser(pageUserId);
  if (!user) return { ok: false, error: "Your sign-in changed. Refresh to sync your notes." };
  const parsed = input.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Keep notes under 50,000 characters." };
  await getDb().insert(userSettings)
    .values({ user_id: user.id, notepad: parsed.data.text })
    .onConflictDoUpdate({ target: userSettings.user_id, set: { notepad: parsed.data.text } });
  return { ok: true };
}
