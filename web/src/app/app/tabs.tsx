"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const TABS = [
  { href: "/app", label: "Personal", active: (p: string) => p === "/app" },
  { href: "/app/competitions", label: "My competitions", active: (p: string) => p.startsWith("/app/competitions") },
];

export function Tabs() {
  const path = usePathname();
  const router = useRouter();
  // n flips between the two tabs (outside text fields and dialogs).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key !== "n" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) || document.querySelector('[role="dialog"], [role="alertdialog"]')) return;
      e.preventDefault();
      router.push(TABS[0].active(path) ? TABS[1].href : TABS[0].href);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [path, router]);
  return (
    <div className="flex rounded-full border border-line bg-ink/70 p-1 shadow-[0_8px_30px_rgb(0_0_0/0.35)] backdrop-blur">
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
    </div>
  );
}
