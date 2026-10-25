import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { cliLogins } from "@/lib/schema";

// Step 3: the CLI polls until the user approves, then receives its token exactly once.
export async function POST(request: Request) {
  const { device_code } = (await request.json().catch(() => ({}))) as { device_code?: string };
  if (!device_code) return Response.json({ error: "device_code required" }, { status: 400 });
  const db = getDb();
  const [login] = await db.select().from(cliLogins).where(eq(cliLogins.device_code, device_code));
  if (!login || login.expires_at < new Date()) {
    if (login) await db.delete(cliLogins).where(eq(cliLogins.device_code, device_code));
    return Response.json({ error: "expired" }, { status: 410 });
  }
  if (!login.token) return Response.json({ status: "pending" }, { status: 202 });
  await db.delete(cliLogins).where(eq(cliLogins.device_code, device_code));
  return Response.json({ token: login.token });
}
