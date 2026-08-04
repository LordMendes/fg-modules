import Link from "next/link";
import { Suspense } from "react";
import { LeadershipCalculator } from "@/components/tools/leadership-calculator";
import { JsonLd, toolPageJsonLd } from "@/components/json-ld";
import { absoluteUrl, buildPageMetadata } from "@/lib/seo";

const TOOL_PATH = "/tools/leadership-calculator";
const TOOL_NAME = "Leadership Calculator";
const TOOL_DESCRIPTION =
  "Calculate D&D 3.5 Leadership scores, cohort level, and followers using PHB and Epic Leadership rules.";

export const metadata = buildPageMetadata({
  title: TOOL_NAME,
  description: TOOL_DESCRIPTION,
  path: TOOL_PATH,
});

export default function LeadershipCalculatorPage() {
  return (
    <>
      <JsonLd
        data={toolPageJsonLd(
          [
            { name: "Home", path: "/" },
            { name: "Tools", path: "/tools" },
            { name: TOOL_NAME, path: TOOL_PATH },
          ],
          {
            name: TOOL_NAME,
            description: TOOL_DESCRIPTION,
            url: absoluteUrl(TOOL_PATH),
          },
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
          Leadership rules. Supports Improved Cohort, Extra Followers, Legendary
          Commander, Might Makes Right, Natural Leader, Improved Leadership,
          Dragon Cohort, and Epic Leadership.
        </p>
      </div>

      <Suspense fallback={null}>
        <LeadershipCalculator />
      </Suspense>
    </>
  );
}
