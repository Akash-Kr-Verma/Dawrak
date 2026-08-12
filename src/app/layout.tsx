import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Dawrak — Media & Information Literacy",
  description:
    "Judge real situations, find out what was really going on, then teach someone else. Dawrak builds media literacy one person at a time.",
};

export const viewport: Viewport = {
  themeColor: "#5A3FD6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-canvas text-ink-soft`}>
        {children}
      </body>
    </html>
  );
}
