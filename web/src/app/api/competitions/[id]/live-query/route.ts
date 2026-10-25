import { getUser } from "@/auth/server";
import { getMembership, sealLeaderboard } from "@/lib/competitions";

const noStore = { "Cache-Control": "private, no-store" };

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await request.json(); // the user the page was loaded for
  const user = await getUser(userId);
  if (!user) return Response.json({ error: "UNAUTHENTICATED" }, { status: 401, headers: noStore });
  const { id } = await params;
  if (!(await getMembership(id, user.id))) return Response.json({ error: "NOT_A_MEMBER" }, { status: 403, headers: noStore });
  return Response.json(await sealLeaderboard(id, user.id), { headers: noStore });
}
