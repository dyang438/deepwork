import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

// The single schema source: the app and `drizzle-kit push` both read it. Columns are snake_case on purpose:
// Realtime builds live rows from PostgreSQL's result names, so they must match the server rows' keys.
export const deepSessions = pgTable(
  "deep_sessions",
  {
    // Created in the browser, so the optimistic row and the live row share it. The primary key is the
    // replica identity Realtime needs.
    id: uuid("id").primaryKey(),
    // The Managed Better Auth user id; only ever set from the session.
    user_id: uuid("user_id").notNull(),
    goal: text("goal").notNull(),
    minutes: integer("minutes").notNull(),
    outcome: text("outcome").notNull(), // done | partial | not done
    started_at: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("deep_sessions_user_id_started_at_idx").on(t.user_id, t.started_at)],
);
