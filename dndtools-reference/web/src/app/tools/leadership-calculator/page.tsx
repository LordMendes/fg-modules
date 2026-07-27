import Link from "next/link";
import { LeadershipCalculator } from "@/components/tools/leadership-calculator";
import { JsonLd, absoluteBreadcrumbJsonLd } from "@/components/json-ld";
import { absoluteUrl, buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Leadership Calculator",
  description:
    "Calculate D&D 3.5 Leadership scores, cohort level, and followers using PHB and Epic Leadership rules.",
  path: "/tools/leadership-calculator",
});

export default function LeadershipCalculatorPage() {
  return (
    <>
      <JsonLd
        data={absoluteBreadcrumbJsonLd(
          [
            { name: "Home", path: "/" },
            { name: "Tools", path: "/tools" },
            {
              name: "Leadership Calculator",
              path: "/tools/leadership-calculator",
            },
          ],
          absoluteUrl,
        )}
      />
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span aria-hidden="true"> / </span>
        <Link href="/tools">Tools</Link>
        <span aria-hidden="true"> / </span>
        <span aria-current="page">Leadership Calculator</span>
      </nav>

      <div className="page-header">
        <h1>Leadership Calculator</h1>
        <p>
          Compute cohort and follower leadership scores using the{" "}
          <em>Player&apos;s Handbook</em> / <em>Dungeon Master&apos;s Guide</em>{" "}
          Leadership rules. Supports Improved Cohort, Dragon Cohort, Natural
          Leader (Dragon #346), Extra Followers, and Epic Leadership.
        </p>
      </div>

      <LeadershipCalculator />
    </>
  );
}
