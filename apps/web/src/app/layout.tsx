import "./globals.css";

import type { Metadata } from "next";
import { Geist, Newsreader } from "next/font/google";
import { PropsWithChildren } from "react";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

const serif = Newsreader({
  subsets: ["latin"],
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: "Jurisflow",
  description: "Matter-first legal AI workspace for German legal teams.",
};

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="de" className={geist.variable}>
      <body className={`${geist.variable} ${serif.variable} font-sans`}>{children}</body>
    </html>
  );
}
