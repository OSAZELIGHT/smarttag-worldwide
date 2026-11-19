import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SmartTag Worldwide | Your world, your people",
  description: "One connected social community for sharing moments, discovering people and building together. Powered by GC Smart Technology.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
