import { index, integer, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

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
    focus_pct: integer("focus_pct"), // self-reported focus, 0-100; null until rated
    notes: text("notes"), // free-form, edited in the session drawer
    started_at: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("deep_sessions_user_id_started_at_idx").on(t.user_id, t.started_at)],
);

// The session a CLI is running right now, one row per user; the dashboard shows it live. Cleared when it ends.
export const activeSessions = pgTable("active_sessions", {
  user_id: uuid("user_id").primaryKey(),
  goal: text("goal").notNull(),
  started_at: timestamp("started_at", { withTimezone: true }).notNull(),
  ends_at: timestamp("ends_at", { withTimezone: true }).notNull(),
});

// `deepwork login` device flow: the CLI polls with device_code (secret); the browser confirms user_code.
export const cliLogins = pgTable("cli_logins", {
  device_code: text("device_code").primaryKey(),
  user_code: text("user_code").notNull().unique(),
  user_id: uuid("user_id"), // set when the signed-in user approves
  token: text("token"), // handed to the CLI once, then the row is deleted
  expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
});

// CLI bearer tokens, stored as sha256 hashes.
export const cliTokens = pgTable("cli_tokens", {
  token_hash: text("token_hash").primaryKey(),
  user_id: uuid("user_id").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  last_used_at: timestamp("last_used_at", { withTimezone: true }),
});

// Competitions: members' deep hours and self-reported focus since starts_at, shown as a live leaderboard.
export const competitions = pgTable("competitions", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  invite_code: text("invite_code").notNull().unique(),
  created_by: uuid("created_by").notNull(),
  starts_at: timestamp("starts_at", { withTimezone: true }).notNull().defaultNow(),
  ends_at: timestamp("ends_at", { withTimezone: true }),
});

export const competitionMembers = pgTable(
  "competition_members",
  {
    competition_id: uuid("competition_id").notNull(),
    user_id: uuid("user_id").notNull(),
    display_name: text("display_name").notNull(),
    joined_at: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.competition_id, t.user_id] }), index("competition_members_user_idx").on(t.user_id)],
);

// Per-user defaults for the session composer (gear menu, bottom left).
export const userSettings = pgTable("user_settings", {
  user_id: uuid("user_id").primaryKey(),
  default_minutes: integer("default_minutes").notNull().default(90),
  default_outcome: text("default_outcome").notNull().default("done"),
  default_focus: integer("default_focus"), // null: leave focus unrated
});

// Commands from the dashboard to the user's Mac. `deepwork agent` polls, claims and runs them.
export const cliCommands = pgTable("cli_commands", {
  id: uuid("id").primaryKey(),
  user_id: uuid("user_id").notNull(),
  kind: text("kind").notNull(), // start | stop
  goal: text("goal"),
  minutes: integer("minutes"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  claimed_at: timestamp("claimed_at", { withTimezone: true }),
});

// Last time each user's agent checked in, so the dashboard knows whether + can reach a Mac.
export const cliAgents = pgTable("cli_agents", {
  user_id: uuid("user_id").primaryKey(),
  host: text("host"),
  seen_at: timestamp("seen_at", { withTimezone: true }).notNull(),
});
