import Link from "next/link";
import { CookieSettingsButton } from "@/components/cookie-settings-button";
import { buildPageMetadata, SITE_NAME } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Privacy & cookies",
  description:
    "How DnD Helper uses cookies, local storage, and privacy-friendly analytics.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <article className="privacy-page">
      <header className="page-header">
        <h1>Privacy & cookies</h1>
        <p>
          This page explains how {SITE_NAME} uses cookies and similar technologies.
          It is a factual notice, not legal advice.
        </p>
      </header>

      <section className="privacy-section">
        <h2>Necessary cookies and storage</h2>
        <p>
          These are required for the site to work. They are not used for
          advertising.
        </p>
        <ul>
          <li>
            <strong>dnd_session</strong>: keeps your anonymous session for saved
            lists and site features.
          </li>
          <li>
            <strong>dnd_auth</strong>: keeps you signed in when you create an
            account.
          </li>
          <li>
            <strong>Local storage</strong>: saves in-browser preferences such as
            theme, encounter drafts, and tool UI state.
          </li>
        </ul>
      </section>

      <section className="privacy-section">
        <h2>Analytics (optional)</h2>
        <p>
          With your consent, we load self-hosted Plausible analytics to measure
          pageviews, outbound links, and file downloads. Plausible does not use
          advertising cookies and does not track you across other websites.
        </p>
        <p>
          Analytics scripts are blocked until you accept the Analytics category
          in our cookie banner.
        </p>
      </section>

      <section className="privacy-section">
        <h2>Marketing (optional, unused)</h2>
        <p>
          We include a Marketing category in cookie preferences for future ad or
          remarketing tags. {SITE_NAME} does not load marketing scripts today.
        </p>
      </section>

      <section className="privacy-section">
        <h2>Your choices</h2>
        <p>
          You can accept all cookies, reject non-essential cookies, or choose
          categories individually. You can change or withdraw consent at any
          time.
        </p>
        <p>
          <CookieSettingsButton />
        </p>
        <p>
          Withdrawing analytics consent stops Plausible from loading on your next
          visit. A script already loaded in your current session may finish that
          page view.
        </p>
      </section>

      <section className="privacy-section">
        <h2>Contact</h2>
        <p>
          Questions about privacy on this site can be sent through{" "}
          <Link href="/">dnd-helper.com</Link>.
        </p>
      </section>
    </article>
  );
}
