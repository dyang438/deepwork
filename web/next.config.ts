import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Don't let `next dev` write AGENTS.md / CLAUDE.md into the app.
  agentRules: false,
  experimental: {
    // Keep visited pages in the client router cache, so switching tabs back and forth doesn't refetch them.
    // The data on them is live anyway (Realtime subscriptions resync on mount).
    staleTimes: { dynamic: 300, static: 300 },
  },
};

export default nextConfig;
