import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Play Your Part - Media & Information Literacy",
  description: "Play your part in verifying media, spotting deepfakes, and protecting your community.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-[#F8FAFC]`}>
        {children}
      </body>
    </html>
  );
}
