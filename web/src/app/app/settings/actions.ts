"use server";

import { z } from "zod";

import { getUser } from "@/auth/server";
import { getDb } from "@/lib/db";
import { userSettings } from "@/lib/schema";

const input = z.object({
  minutes: z.number().int().min(1).max(600),
  outcome: z.enum(["done", "partial", "not done"]),
  focus: z.number().int().min(0).max(100).nullable(),
});

export async function saveDefaults(raw: z.input<typeof input>): Promise<{ ok: boolean; error?: string }> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Sign in first." };
  const parsed = input.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Minutes must be between 1 and 600." };
  const row = { default_minutes: parsed.data.minutes, default_outcome: parsed.data.outcome, default_focus: parsed.data.focus };
  await getDb().insert(userSettings).values({ user_id: user.id, ...row }).onConflictDoUpdate({ target: userSettings.user_id, set: row });
  return { ok: true };
}
