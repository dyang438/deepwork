import "server-only";

import { eq } from "drizzle-orm";

import { getDb } from "./db";
import { cliAgents, cliTokens } from "./schema";

export type SetupStatus = { cli: boolean; agent: boolean };

/** Which setup steps this user has done: connected a CLI (`deepwork login`), run the agent at least once. */
export async function getSetupStatus(userId: string): Promise<SetupStatus> {
  const db = getDb();
  const [tokens, agents] = await Promise.all([
    db.select({ u: cliTokens.user_id }).from(cliTokens).where(eq(cliTokens.user_id, userId)).limit(1),
    db.select({ u: cliAgents.user_id }).from(cliAgents).where(eq(cliAgents.user_id, userId)).limit(1),
  ]);
  return { cli: tokens.length > 0, agent: agents.length > 0 };
}
