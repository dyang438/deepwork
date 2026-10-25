import "server-only";

import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { getEnv } from "./env";

// One pool per server process; the globalThis slot survives dev hot reloads.
const slot = globalThis as typeof globalThis & { dwPool?: Pool };
let db: ReturnType<typeof drizzle> | undefined;

/** Lazy. Columns stay snake_case (see schema.ts). */
export function getDb() {
  if (!slot.dwPool) {
    slot.dwPool = new Pool({ connectionString: getEnv().databaseUrl, max: 5 });
    attachDatabasePool(slot.dwPool); // on Vercel, closes idle clients before a function instance suspends
  }
  return (db ??= drizzle(slot.dwPool));
}
