import { redirect } from "next/navigation";
import { connection } from "next/server";

import { getUser } from "@/auth/server";
import { UserMenu } from "@/auth/user-menu";
import { getEnv } from "@/lib/env";
import { loadSessions } from "@/lib/sessions";

import { RealtimeRoot } from "../realtime-root";
import { SessionList } from "./session-list";

export async function Dashboard() {
  // Request time only: the sealed query is a bearer token for this user's data, never prerender it.
  await connection();
  const user = await getUser();
  if (!user) redirect("/auth/sign-in"); // backstop: proxy.ts already redirected signed-out page loads
  const { rows, sealedQuery } = await loadSessions(user.id);
  return (
    <>
      <UserMenu email={user.email} />
      <RealtimeRoot key={sealedQuery.queryFingerprint} url={getEnv().realtimeUrl}>
        <SessionList initialSessions={rows} sealedQuery={sealedQuery} userId={user.id} />
      </RealtimeRoot>
    </>
  );
}
