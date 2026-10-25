"use client";

import { createContext, useContext } from "react";

import type { ActiveRow } from "@/lib/sessions";

export const ActiveSessionContext = createContext<ActiveRow | null>(null);
export const useActiveSession = () => useContext(ActiveSessionContext);
