"use client";

import {
  Bungee,
  Courier_Prime,
  Lobster,
  Monoton,
  Pacifico,
  Playfair_Display,
  Press_Start_2P,
  Rubik_Mono_One,
  Special_Elite,
  UnifrakturMaguntia,
} from "next/font/google";
import { useEffect, useState } from "react";

// Not preloaded: the page renders the settled text first, so these only matter for the brief flicker.
const bungee = Bungee({
  weight: "400",
  subsets: ["latin"],
  preload: false,
  display: "swap",
});
const courier = Courier_Prime({
  weight: "400",
  subsets: ["latin"],
  preload: false,
  display: "swap",
});
const lobster = Lobster({
  weight: "400",
  subsets: ["latin"],
  preload: false,
  display: "swap",
});
const monoton = Monoton({
  weight: "400",
  subsets: ["latin"],
  preload: false,
  display: "swap",
});
const pacifico = Pacifico({
  weight: "400",
  subsets: ["latin"],
  preload: false,
  display: "swap",
});
const playfair = Playfair_Display({
  weight: "400",
  subsets: ["latin"],
  preload: false,
  display: "swap",
  style: "italic",
});
const pressStart = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  preload: false,
  display: "swap",
});
const rubikMono = Rubik_Mono_One({
  weight: "400",
  subsets: ["latin"],
  preload: false,
  display: "swap",
});
const specialElite = Special_Elite({
  weight: "400",
  subsets: ["latin"],
  preload: false,
  display: "swap",
});
const fraktur = UnifrakturMaguntia({
  weight: "400",
  subsets: ["latin"],
  preload: false,
  display: "swap",
});
const FONTS = [
  bungee,
  courier,
  lobster,
  monoton,
  pacifico,
  playfair,
  pressStart,
  rubikMono,
  specialElite,
  fraktur,
].map((f) => f.style.fontFamily);
const COLORS = [
  "#ff2d55",
  "#ffcc00",
  "#00e0ff",
  "#ff6b00",
  "#b14bff",
  "#00e599",
  "#ff3df0",
  "#f2efe2",
  "#c9a96e",
  "#e7b7ad",
];

type Glyph = { font: string; color: string; size: number } | null; // null: settled into the page's theme

const pick = <T,>(xs: readonly T[]) =>
  xs[Math.floor(Math.random() * xs.length)];

// Cycles each letter through clashing fonts, colors and sizes, fast at first, then slows and lets the letters
// settle one by one into the theme (mint italic Inter).
export function Distracted({ text }: { text: string }) {
  const [glyphs, setGlyphs] = useState<Glyph[]>(() =>
    [...text].map(() => null),
  );

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const settleAt = [...text].map(() => 0.45 + Math.random() * 0.55); // fraction of the run when each letter locks
    const ticks = 22;
    let tick = 0;
    let delay = 30;
    let timer: ReturnType<typeof setTimeout>;
    const step = () => {
      const progress = tick / ticks;
      setGlyphs(
        [...text].map((ch, i) =>
          ch === " " || progress >= settleAt[i]
            ? null
            : {
                font: pick(FONTS),
                color: pick(COLORS),
                size: 0.88 + Math.random() * 0.24,
              },
        ),
      );
      if (tick++ >= ticks) return;
      timer = setTimeout(step, delay);
      delay *= 1.13; // ~30 ms between frames at the start, ~400 ms by the end; about 3 s in all
    };
    step();
    return () => clearTimeout(timer);
  }, [text]);

  const cycling = glyphs.some(Boolean);
  // The settled text always holds the layout (invisible while cycling); the cycling letters are drawn over it,
  // so wide fonts and big glyphs never reflow the bottom-anchored hero.
  return (
    <span aria-label={text} className="relative inline-block text-mint italic" role="text">
      <span aria-hidden="true" className={cycling ? "invisible" : undefined}>
        {text}
      </span>
      {cycling && (
        <span aria-hidden="true" className="absolute top-0 left-0 w-max">
          {[...text].map((ch, i) => {
            const g = glyphs[i];
            return (
              <span
                key={i}
                style={g ? { fontFamily: g.font, color: g.color, fontSize: `${g.size}em`, fontStyle: "normal" } : undefined}
              >
                {ch}
              </span>
            );
          })}
        </span>
      )}
    </span>
  );
}
