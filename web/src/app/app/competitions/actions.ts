"use server";

import { randomBytes, randomUUID } from "node:crypto";

import { and, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getUser } from "@/auth/server";
import { getDb } from "@/lib/db";
import { competitionMembers, competitions } from "@/lib/schema";

async function displayName(userId: string, fallback: string) {
  const { rows } = await getDb().execute(sql`select name from neon_auth."user" where id = ${userId}`);
  return String(rows[0]?.name || fallback).slice(0, 60);
}

export type FormState = { error: string } | null;

const createInput = z.object({ name: z.string().trim().min(1).max(80), ends_at: z.string().optional() });

export async function createCompetition(_: FormState, form: FormData): Promise<FormState> {
  const user = await getUser();
  if (!user) return { error: "Sign in first." };
  const input = createInput.safeParse({ name: form.get("name"), ends_at: form.get("ends_at") || undefined });
  if (!input.success) return { error: "Give it a name (up to 80 characters)." };
  const endsAt = input.data.ends_at ? new Date(`${input.data.ends_at}T23:59:59`) : null;
  if (endsAt && Number.isNaN(endsAt.getTime())) return { error: "That end date isn't valid." };
  const id = randomUUID();
  const db = getDb();
  await db.insert(competitions).values({ id, name: input.data.name, invite_code: randomBytes(6).toString("base64url"), created_by: user.id, ends_at: endsAt });
  await db.insert(competitionMembers).values({ competition_id: id, user_id: user.id, display_name: await displayName(user.id, user.email) });
  redirect(`/app/competitions/${id}`);
}

export async function joinCompetition(code: string): Promise<FormState> {
  const user = await getUser();
  if (!user) return { error: "Sign in first." };
  const db = getDb();
  const [comp] = await db.select({ id: competitions.id }).from(competitions).where(eq(competitions.invite_code, code));
  if (!comp) return { error: "That invite link doesn't match a competition." };
  await db
    .insert(competitionMembers)
    .values({ competition_id: comp.id, user_id: user.id, display_name: await displayName(user.id, user.email) })
    .onConflictDoNothing();
  redirect(`/app/competitions/${comp.id}`);
}

export async function leaveCompetition(competitionId: string) {
  const user = await getUser();
  if (!user) return;
  await getDb()
    .delete(competitionMembers)
    .where(and(eq(competitionMembers.competition_id, competitionId), eq(competitionMembers.user_id, user.id)));
  redirect("/app/competitions");
}
