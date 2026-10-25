import { redirect } from "next/navigation";
import { connection } from "next/server";

import { getUser } from "@/auth/server";
import { getEnv } from "@/lib/env";
import { loadActive, loadSessions } from "@/lib/sessions";
import { getDefaults } from "@/lib/settings";

import { RealtimeRoot } from "../realtime-root";
import { ActiveBanner } from "./active-banner";
import { SessionList } from "./session-list";

export async function Dashboard() {
  // Request time only: the sealed query is a bearer token for this user's data, never prerender it.
  await connection();
  const user = await getUser();
  if (!user) redirect("/auth/sign-in"); // backstop: proxy.ts already redirected signed-out page loads
  const [{ rows, sealedQuery }, active, defaults] = await Promise.all([loadSessions(user.id), loadActive(user.id), getDefaults(user.id)]);
  return (
    <>
      <RealtimeRoot key={sealedQuery.queryFingerprint} url={getEnv().realtimeUrl}>
        <ActiveBanner initial={active.rows} sealedQuery={active.sealedQuery} userId={user.id} />
        <SessionList defaults={defaults} initialSessions={rows} sealedQuery={sealedQuery} userId={user.id} />
      </RealtimeRoot>
    </>
  );
}
