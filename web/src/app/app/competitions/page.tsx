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
  const day = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return (
    <>
      <h1 className="mt-0 mb-10 text-5xl font-normal tracking-[-0.04em]">My competitions</h1>
      {comps.length === 0 ? (
        <p className="mb-10 text-mist">None yet. Start one and send the invite link, or join with a link someone sent you.</p>
      ) : (
        <ul className="mb-12 list-none border-t border-line p-0">
          {comps.map((c) => (
            <li className="border-b border-line" key={c.id}>
              <Link className="flex items-center justify-between gap-4 py-4 hover:text-mint" href={`/app/competitions/${c.id}`}>
                <span className="text-lg">{c.name}</span>
                <span className="font-mono text-xs text-mist">
                  {c.members} {c.members === 1 ? "MEMBER" : "MEMBERS"} · {day(c.starts_at).toUpperCase()}
                  {c.ends_at ? ` – ${day(c.ends_at).toUpperCase()}` : " ONWARD"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <CreateForm />
        <JoinForm />
      </div>
    </>
  );
}
