import { redirect } from "next/navigation";
import { connection } from "next/server";

import { getUser } from "@/auth/server";
import { getPhilosophy } from "@/lib/philosophy";
import { loadAgent, loadSessions } from "@/lib/sessions";
import { getDefaults } from "@/lib/settings";

import { SessionList } from "./session-list";

export async function Dashboard() {
  // Request time only: the sealed query is a bearer token for this user's data, never prerender it.
  await connection();
  const user = await getUser();
  if (!user) redirect("/auth/sign-in"); // backstop: proxy.ts already redirected signed-out page loads
  const [{ rows, sealedQuery }, agent, defaults, philosophy] = await Promise.all([
    loadSessions(user.id),
    loadAgent(user.id),
    getDefaults(user.id),
    getPhilosophy(user.id),
  ]);
  return (
    <SessionList key={sealedQuery.queryFingerprint} agent={agent} defaults={defaults} initialPhilosophy={philosophy} initialSessions={rows} sealedQuery={sealedQuery} userId={user.id} />
  );
}
