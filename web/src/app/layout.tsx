import type { Metadata } from "next";
import { Cinzel, Source_Serif_4 } from "next/font/google";
import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/site-header";
import { SessionProvider } from "@/components/session-provider";
import { getOrCreateSession } from "@/lib/session";
import "./globals.css";

const cinzel = Cinzel({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Arcane Archives — D&D 3.5 Reference",
    template: "%s — Arcane Archives",
  },
  description: "A comprehensive D&D 3.5 Edition reference — spells, feats, monsters, classes, and more.",
  robots: { index: true, follow: true },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getOrCreateSession();

  return (
    <html lang="en" suppressHydrationWarning className={`${cinzel.variable} ${sourceSerif.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased">
        <Providers>
          <SessionProvider nonce={session.nonce}>
            <SiteHeader />
            <main className="main-content">{children}</main>
            <footer className="site-footer">
              D&D 3.5 Edition reference material. Not affiliated with Wizards of the Coast.
            </footer>
          </SessionProvider>
        </Providers>
      </body>
    </html>
  );
}
