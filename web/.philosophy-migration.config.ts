import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./.philosophy-schema.ts",
  dialect: "postgresql",
  tablesFilter: ["user_settings"],
  dbCredentials: { url: process.env.PHILOSOPHY_MIGRATION_URL! },
});
