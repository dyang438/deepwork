import { readFileSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { parse } from "dotenv";

const vars = parse(readFileSync(".env.local"));
let url = new URL(vars.DATABASE_URL_UNPOOLED || vars.DATABASE_URL);
if (process.argv[2] === "test") {
  const connection = execFileSync("neon", [
    "connection-string", "philosophy-check-20261025",
    "--database-name", url.pathname.slice(1),
    "--role-name", decodeURIComponent(url.username),
    "--ssl", "verify-full",
  ], { encoding: "utf8" }).trim();
  url = new URL(connection);
}
url.hostname = url.hostname.replace("-pooler.", ".");
url.searchParams.set("sslmode", "verify-full");
console.log(`Checking philosophy column on ${process.argv[2] === "test" ? "test branch" : "current database"}`);
const result = spawnSync("./node_modules/.bin/drizzle-kit", [
  "push", "--config", ".philosophy-migration.config.ts", "--strict", "--verbose",
], { stdio: "inherit", env: { ...process.env, PHILOSOPHY_MIGRATION_URL: url.toString() } });
process.exit(result.status ?? 1);
