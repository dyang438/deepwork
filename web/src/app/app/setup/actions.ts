"use server";

import { getUser } from "@/auth/server";
import { getSetupStatus, type SetupStatus } from "@/lib/setup";

export async function setupStatus(): Promise<SetupStatus | null> {
  const user = await getUser();
  return user ? getSetupStatus(user.id) : null;
}
