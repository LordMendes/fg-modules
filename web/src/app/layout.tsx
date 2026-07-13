import type { Metadata } from "next";
import { headers } from "next/headers";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/site-header";
import { SessionProvider } from "@/components/session-provider";
import { JsonLd } from "@/components/json-ld";
import { getSession, SESSION_NONCE_HEADER } from "@/lib/session";
import {
  absoluteUrl,
  DEFAULT_DESCRIPTION,
  SITE_NAME,
  siteUrl,
} from "@/lib/seo";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: `${SITE_NAME} — D&D 3.5 Reference`,
    template: `%s — ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  robots: { index: true, follow: true },
  openGraph: {
    title: `${SITE_NAME} — D&D 3.5 Reference`,
    description: DEFAULT_DESCRIPTION,
    url: absoluteUrl("/"),
    siteName: SITE_NAME,
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — D&D 3.5 Reference`,
    description: DEFAULT_DESCRIPTION,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headerStore = await headers();
  const nonce =
    headerStore.get(SESSION_NONCE_HEADER) ?? (await getSession())?.nonce ?? "";

  return (
    <html lang="en" suppressHydrationWarning className={`${plusJakarta.variable} ${inter.variable} h-full`}>
      <body className="min-h-full min-w-0 flex flex-col antialiased">
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: SITE_NAME,
            url: absoluteUrl("/"),
            description: DEFAULT_DESCRIPTION,
            potentialAction: {
              "@type": "SearchAction",
              target: {
                "@type": "EntryPoint",
                urlTemplate: `${absoluteUrl("/search")}?q={search_term_string}`,
              },
              "query-input": "required name=search_term_string",
            },
          }}
        />
        <Providers>
          <SessionProvider nonce={nonce}>
            <SiteHeader />
            <main className="main-content min-w-0 w-full">{children}</main>
            <footer className="site-footer">
              D&D 3.5 Edition reference material. Not affiliated with Wizards of the Coast.
            </footer>
          </SessionProvider>
        </Providers>
      </body>
    </html>
  );
}
