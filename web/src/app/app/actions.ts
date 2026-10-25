"use server";

import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { getUser } from "@/auth/server";
import { getDb } from "@/lib/db";
import { deepSessions } from "@/lib/schema";

// Typed results rather than throws: in production Next.js hides a thrown error's message.
export type WriteResult =
  | { kind: "committed"; txid: string }
  | { kind: "unchanged" }
  | { kind: "rejected"; reason: "UNAUTHENTICATED" | "INVALID_INPUT" };

const addInput = z.object({
  id: z.uuid(),
  goal: z.string().trim().min(1).max(200),
  minutes: z.number().int().min(1).max(600),
  outcome: z.enum(["done", "partial", "not done"]),
  focus_pct: z.number().int().min(0).max(100).nullable(),
});
const focusInput = z.object({ id: z.uuid(), focus_pct: z.number().int().min(0).max(100).nullable() });
const deleteInput = z.object({ id: z.uuid() });

const txid = sql<string>`pg_current_xact_id()::text`;
const toResult = (row?: { txid: string }): WriteResult =>
  row ? { kind: "committed", txid: row.txid } : { kind: "unchanged" };

export async function logSession(pageUserId: string, raw: z.input<typeof addInput>): Promise<WriteResult> {
  const user = await getUser(pageUserId); // every action checks the session itself: proxy.ts skips actions
  if (!user) return { kind: "rejected", reason: "UNAUTHENTICATED" };
  const input = addInput.safeParse(raw);
  if (!input.success) return { kind: "rejected", reason: "INVALID_INPUT" };
  const [row] = await getDb()
    .insert(deepSessions)
    .values({ ...input.data, user_id: user.id }) // user_id from the session only
    .onConflictDoNothing({ target: deepSessions.id })
    .returning({ txid });
  return toResult(row);
}

export async function deleteSession(pageUserId: string, raw: z.input<typeof deleteInput>): Promise<WriteResult> {
  const user = await getUser(pageUserId);
  if (!user) return { kind: "rejected", reason: "UNAUTHENTICATED" };
  const input = deleteInput.safeParse(raw);
  if (!input.success) return { kind: "rejected", reason: "INVALID_INPUT" };
  const [row] = await getDb()
    .delete(deepSessions)
    .where(and(eq(deepSessions.id, input.data.id), eq(deepSessions.user_id, user.id)))
    .returning({ txid });
  return toResult(row);
}

export async function setFocus(pageUserId: string, raw: z.input<typeof focusInput>): Promise<WriteResult> {
  const user = await getUser(pageUserId);
  if (!user) return { kind: "rejected", reason: "UNAUTHENTICATED" };
  const input = focusInput.safeParse(raw);
  if (!input.success) return { kind: "rejected", reason: "INVALID_INPUT" };
  const [row] = await getDb()
    .update(deepSessions)
    .set({ focus_pct: input.data.focus_pct })
    .where(and(eq(deepSessions.id, input.data.id), eq(deepSessions.user_id, user.id)))
    .returning({ txid });
  return toResult(row);
}
