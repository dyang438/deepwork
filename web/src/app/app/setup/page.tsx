import { connection } from "next/server";
import { redirect } from "next/navigation";

import { getUser } from "@/auth/server";
import { getSetupStatus } from "@/lib/setup";

import { SetupGuide } from "./guide";

export default async function SetupPage() {
  await connection();
  const user = await getUser();
  if (!user) redirect("/auth/sign-in");
  return <SetupGuide initial={await getSetupStatus(user.id)} page />;
}
