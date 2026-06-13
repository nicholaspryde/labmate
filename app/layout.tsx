import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { DialRoot } from "dialkit";
import { InterfaceKit } from "interface-kit/react";
import { FeedbackButton } from "@/components/FeedbackButton";
import { Providers } from "@/components/providers";
import "./globals.css";
import "dialkit/styles.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Labmate",
  description: "Research event scheduler for timepoint-based protocols.",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
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
          <FeedbackButton />
          {process.env.NODE_ENV === "development" ? <InterfaceKit /> : null}
          <DialRoot />
        </Providers>
      </body>
    </html>
  );
}
