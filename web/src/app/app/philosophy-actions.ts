"use server";

import { z } from "zod";

import { getUser } from "@/auth/server";
import { getDb } from "@/lib/db";
import { userSettings } from "@/lib/schema";

const input = z.object({ userId: z.uuid(), text: z.string().max(50_000) });

export async function savePhilosophy(raw: z.input<typeof input>) {
  const parsed = input.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Keep your writing under 50,000 characters." };
  const user = await getUser();
  if (!user || user.id !== parsed.data.userId)
    return { ok: false, error: "Your sign-in changed. Refresh before saving." };
  await getDb()
    .insert(userSettings)
    .values({ user_id: user.id, philosophy: parsed.data.text })
    .onConflictDoUpdate({
      target: userSettings.user_id,
      set: { philosophy: parsed.data.text },
    });
  return { ok: true };
}
