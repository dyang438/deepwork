import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";

import { getUser } from "@/auth/server";
import { myCompetitions } from "@/lib/competitions";

import { CreateForm, JoinForm } from "./forms";

export default async function CompetitionsPage() {
  await connection();
  const user = await getUser();
  if (!user) redirect("/auth/sign-in");
  const comps = await myCompetitions(user.id);
  const day = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return (
    <>
      <h1 className="mt-0 mb-10 text-5xl font-normal tracking-[-0.04em]">
        My competitions
      </h1>
      {/* Your competitions fill the column; start / join hang off its right edge on wide screens. */}
      <div className="relative">
        <div className="mb-10 flex flex-col gap-4 min-[1360px]:absolute min-[1360px]:top-0 min-[1360px]:left-full min-[1360px]:mb-0 min-[1360px]:ml-8 min-[1360px]:w-64">
          <CreateForm />
          <JoinForm />
        </div>
        <div className="min-w-0">
          {comps.length === 0 ? (
            <p className="m-0 text-mist">
              None yet. Start one and send the invite link, or join with a link
              someone sent you.
            </p>
          ) : (
            <ul className="m-0 list-none border-t border-line p-0">
              {comps.map((c) => (
                <li className="border-b border-line" key={c.id}>
                  <Link
                    className="flex items-center justify-between gap-4 py-4 hover:text-mint"
                    href={`/app/competitions/${c.id}`}
                  >
                    <span className="text-lg">{c.name}</span>
                    <span className="font-mono text-xs text-mist">
                      {c.members} {c.members === 1 ? "MEMBER" : "MEMBERS"} ·{" "}
                      {day(c.starts_at).toUpperCase()}
                      {c.ends_at
                        ? ` – ${day(c.ends_at).toUpperCase()}`
                        : " ONWARD"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
