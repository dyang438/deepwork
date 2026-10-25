import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";

import { getUser } from "@/auth/server";
import { getMembership, loadLeaderboard } from "@/lib/competitions";
import { getEnv } from "@/lib/env";

import { RealtimeRoot } from "../../../realtime-root";
import { InviteLink, LeaveButton } from "./controls";
import { Leaderboard } from "./leaderboard";

export default async function CompetitionPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const user = await getUser();
  if (!user) redirect("/auth/sign-in");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const comp = await getMembership(id, user.id);
  if (!comp) notFound();
  const { rows, sealedQuery } = await loadLeaderboard(id, user.id);
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  const day = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return (
    <>
      <p className="eyebrow mb-2 text-[11px]">
        {day(comp.starts_at)} {comp.ends_at ? `– ${day(comp.ends_at)}` : "onward"}
      </p>
      <h1 className="mt-0 mb-8 text-5xl font-normal tracking-[-0.04em]">{comp.name}</h1>
      <RealtimeRoot key={sealedQuery.queryFingerprint} url={getEnv().realtimeUrl}>
        <Leaderboard competitionId={id} initialRows={rows} meId={user.id} sealedQuery={sealedQuery} />
      </RealtimeRoot>
      <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
        <InviteLink url={`${origin}/join/${comp.invite_code}`} />
        <LeaveButton competitionId={id} />
      </div>
    </>
  );
}
