import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "CLAWDETTE CORE",
  description: "Living local-first neural intelligence system for Codex.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
