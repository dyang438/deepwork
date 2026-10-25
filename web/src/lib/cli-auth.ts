import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { eq, sql } from "drizzle-orm";

import { getDb } from "./db";
import { cliTokens } from "./schema";

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
export const newSecret = () => randomBytes(32).toString("base64url");

// 8 letters from an alphabet without look-alikes, shown as ABCD-EFGH on both the terminal and the page.
export function newUserCode() {
  const abc = "BCDFGHJKLMNPQRSTVWXZ";
  const b = randomBytes(8);
  const s = [...b].map((x) => abc[x % abc.length]).join("");
  return `${s.slice(0, 4)}-${s.slice(4)}`;
}

/** The user a CLI request belongs to, from its `Authorization: Bearer <token>`, or null. */
export async function cliUser(request: Request): Promise<string | null> {
  const token = request.headers.get("authorization")?.match(/^Bearer (\S+)$/)?.[1];
  if (!token) return null;
  const [row] = await getDb()
    .update(cliTokens)
    .set({ last_used_at: sql`now()` })
    .where(eq(cliTokens.token_hash, sha256(token)))
    .returning({ user_id: cliTokens.user_id });
  return row?.user_id ?? null;
}

export const unauthorized = () => Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
