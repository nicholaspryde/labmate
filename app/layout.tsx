import type { Metadata } from "next";
import { DialRoot } from "dialkit";
import { AuthButton } from "@/components/auth/auth-button";
import { HelpButton } from "@/components/HelpButton";
import { Providers } from "@/components/providers";
import "./globals.css";
import "dialkit/styles.css";

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
      <head>
        <link rel="preconnect" href="https://rsms.me/" />
        <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
      </head>
      <body className="antialiased">
        <div aria-hidden className="pointer-events-none fixed h-0 w-0 overflow-hidden opacity-0">
          <input type="text" name="labmate-prevent-autofill" tabIndex={-1} autoComplete="off" readOnly />
        </div>
        <Providers>
          {children}
          <HelpButton />
          <AuthButton />
          <DialRoot />
        </Providers>
      </body>
    </html>
  );
}
