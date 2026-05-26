import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { DialRoot } from "dialkit";
import "./globals.css";
import "dialkit/styles.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Timepoint Series Calendar",
  description: "Research event scheduler for timepoint-based protocols.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        {children}
        <DialRoot />
      </body>
    </html>
  );
}
