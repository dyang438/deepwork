import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Geist_Mono, Inter } from "next/font/google";

import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: "The Garden",
  description: "Timed deep work blocks. Log each block and watch your deep hours add up.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    // On the auth pages, next-themes (inside NeonAuthUIProvider) runs a pre-hydration script that sets class and
    // color-scheme on <html> from the saved or system theme, which the server can't know. This suppresses
    // <html>'s own attributes only.
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
