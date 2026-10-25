"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Comp = { id: string; name: string; meta: string };

// Your competitions, keyboard-friendly like the session history: j / k move, Enter opens.
export function CompList({ comps }: { comps: Comp[] }) {
  const [sel, setSel] = useState(-1);
  const router = useRouter();
  const state = useRef({ sel, comps });
  state.current = { sel, comps };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) || document.querySelector("[data-dw-dialog]")) return;
      const { sel, comps } = state.current;
      if (e.key === "j") setSel(Math.min(sel + 1, comps.length - 1));
      else if (e.key === "k") setSel(Math.max(sel - 1, 0));
      else if (e.key === "Enter" && comps[sel]) router.push(`/app/competitions/${comps[sel].id}`);
      else if (e.key === "Escape") setSel(-1);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);
  return (
    <ul className="m-0 list-none border-t border-line p-0">
      {comps.map((c, i) => (
        <li aria-selected={i === sel} className="relative border-b border-line" key={c.id}>
          {i === sel && <span aria-hidden="true" className="absolute inset-y-3 -left-3 w-0.5 rounded bg-mint" />}
          <Link
            className={`-mx-3 flex items-center justify-between gap-4 rounded-lg px-3 py-4 hover:text-mint ${i === sel ? "bg-cream/[0.05]" : ""}`}
            href={`/app/competitions/${c.id}`}
          >
            <span className="text-lg">{c.name}</span>
            <span className="font-mono text-xs text-mist">{c.meta}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
