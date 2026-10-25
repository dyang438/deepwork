import { getDb } from "@/lib/db";
import { newSecret, newUserCode } from "@/lib/cli-auth";
import { cliLogins } from "@/lib/schema";

const TTL_S = 600;

// Step 1 of `deepwork login`: hand the CLI a secret device code to poll with and a short code to show.
export async function POST(request: Request) {
  const device_code = newSecret();
  const user_code = newUserCode();
  await getDb().insert(cliLogins).values({ device_code, user_code, expires_at: new Date(Date.now() + TTL_S * 1000) });
  const verification_url = `${new URL(request.url).origin}/cli?code=${user_code}`;
  return Response.json({ device_code, user_code, verification_url, interval: 2, expires_in: TTL_S });
}
