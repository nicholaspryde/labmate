import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { DialRoot } from "dialkit";
import { InterfaceKit } from "interface-kit/react";
import { Providers } from "@/components/providers";
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
        <Providers>
          {children}
          {process.env.NODE_ENV === "development" ? <InterfaceKit /> : null}
          <DialRoot />
        </Providers>
      </body>
    </html>
  );
}
