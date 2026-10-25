import { integer, pgTable, text, uuid } from "drizzle-orm/pg-core";

export const userSettings = pgTable("user_settings", {
  user_id: uuid("user_id").primaryKey(),
  default_minutes: integer("default_minutes").notNull().default(90),
  default_outcome: text("default_outcome").notNull().default("done"),
  default_focus: integer("default_focus"),
  philosophy: text("philosophy").notNull().default(""),
});
