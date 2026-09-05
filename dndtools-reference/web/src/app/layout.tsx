import type { Metadata } from "next";
import { headers } from "next/headers";
import Script from "next/script";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { EncounterProvider } from "@/components/encounter/encounter-provider";
import { AppShell } from "@/components/app-shell";
import { Providers } from "@/components/providers";
import { SessionProvider } from "@/components/session-provider";
import { AuthProvider } from "@/components/auth-provider";
import { JsonLd } from "@/components/json-ld";
import { getCurrentUser } from "@/lib/auth/session";
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
    images: [
      {
        url: absoluteUrl("/opengraph-image"),
        secureUrl: absoluteUrl("/opengraph-image"),
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} — D&D 3.5 Reference`,
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — D&D 3.5 Reference`,
    description: DEFAULT_DESCRIPTION,
    images: [absoluteUrl("/opengraph-image")],
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
  const user = await getCurrentUser();

  return (
    <html lang="en" suppressHydrationWarning className={`${plusJakarta.variable} ${inter.variable} h-full`}>
      <body
        className="min-h-full min-w-0 flex flex-col antialiased"
        suppressHydrationWarning
      >
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
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <Providers>
          <SessionProvider nonce={nonce}>
            <AuthProvider user={user}>
              <EncounterProvider>
                <AppShell user={user}>{children}</AppShell>
              </EncounterProvider>
            </AuthProvider>
          </SessionProvider>
        </Providers>
        <Script id="plausible-init" strategy="beforeInteractive">
          {`window.plausible = window.plausible || function() { (window.plausible.q = window.plausible.q || []).push(arguments) }`}
        </Script>
        <Script
          defer
          data-domain="dnd-helper.com"
          src="https://analytics.lcmendes.com/js/script.file-downloads.hash.outbound-links.pageview-props.tagged-events.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
