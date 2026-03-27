import "./globals.css";

import type { Metadata } from "next";
import { Manrope, Newsreader } from "next/font/google";
import { PropsWithChildren } from "react";

const sans = Manrope({
  subsets: ["latin"],
  variable: "--font-sans"
});

const serif = Newsreader({
  subsets: ["latin"],
  variable: "--font-serif"
});

export const metadata: Metadata = {
  title: "Jurisflow AI",
  description: "Chat-first Legal Research Console für deutsche Kanzleien."
};

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="de">
      <body className={`${sans.variable} ${serif.variable}`}>{children}</body>
    </html>
  );
}
