import "server-only";

import { eq } from "drizzle-orm";

import { getDb } from "./db";
import { userSettings } from "./schema";

// What everyone finds in Philosophy until they write their own.
export const DEFAULT_PHILOSOPHY = `Hello!

I created The Garden for two reasons.
I wanted to look at Da Vinci's Roses... and I wanted more time to look at Da Vinci's Roses.

Through working deeply, we have the chance to do something thought impossible. In aggregate, we're generating more time for our progression in life. I liken the prospect and allure to that of time travel for that reason.

You 100% have some goal, some dream that it's time to be overly ambitious about. This scratch space is for thinking about that. Don't worry when 90 minutes didn't get you as much work as you would have liked. In my case I wanted to time travel and all I could do was this website...

Before beginning logging your time, I have two suggestions!
Don't cheat yourself.
Don't be afraid enough to cheat yourself. Even in competitions no one is monitoring you. This isn't a time card (at least one can hope).

I'll see you in the future,
David
`;

export async function getPhilosophy(userId: string): Promise<string> {
  const [row] = await getDb()
    .select({ philosophy: userSettings.philosophy })
    .from(userSettings)
    .where(eq(userSettings.user_id, userId));
  return row?.philosophy || DEFAULT_PHILOSOPHY;
}
