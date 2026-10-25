"use server";

import { and, eq, gt, isNull } from "drizzle-orm";

import { getUser } from "@/auth/server";
import { newSecret, sha256 } from "@/lib/cli-auth";
import { getDb } from "@/lib/db";
import { cliLogins, cliTokens } from "@/lib/schema";

export type ApproveResult = { ok: true } | { ok: false; error: string };

// Step 2 of `deepwork login`: the signed-in user confirms the code their terminal shows.
export async function approveCli(userCode: string): Promise<ApproveResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Sign in first." };
  const token = newSecret();
  const db = getDb();
  const [login] = await db
    .update(cliLogins)
    .set({ user_id: user.id, token })
    .where(and(eq(cliLogins.user_code, userCode), isNull(cliLogins.token), gt(cliLogins.expires_at, new Date())))
    .returning({ device_code: cliLogins.device_code });
  if (!login) return { ok: false, error: "That code has expired or was already used. Run deepwork login again." };
  await db.insert(cliTokens).values({ token_hash: sha256(token), user_id: user.id });
  return { ok: true };
}
