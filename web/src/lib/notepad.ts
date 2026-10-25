import "server-only";

import { eq } from "drizzle-orm";

import { getDb } from "./db";
import { userSettings } from "./schema";

export async function getNotepad(userId: string): Promise<string> {
  const [row] = await getDb().select({ notepad: userSettings.notepad })
    .from(userSettings).where(eq(userSettings.user_id, userId));
  return row?.notepad ?? "";
}
