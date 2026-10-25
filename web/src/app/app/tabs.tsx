"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/app", label: "Personal", active: (p: string) => p === "/app" },
  { href: "/app/competitions", label: "My competitions", active: (p: string) => p.startsWith("/app/competitions") },
];

export function Tabs() {
  const path = usePathname();
  return (
    <nav aria-label="Sections" className="flex rounded-full border border-line bg-ink/60 p-1 backdrop-blur">
      {TABS.map((t) => (
        <Link
          aria-current={t.active(path) ? "page" : undefined}
          className={`rounded-full px-4 py-1.5 text-sm ${t.active(path) ? "bg-cream text-ink" : "text-mist hover:text-cream"}`}
          href={t.href}
          key={t.href}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
