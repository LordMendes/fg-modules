import Link from "next/link";
import { Suspense } from "react";
import { DemographicsCalculator } from "@/components/tools/demographics";
import { ToolExplainer } from "@/components/tool-explainer";
import { JsonLd, toolPageJsonLd } from "@/components/json-ld";
import { absoluteUrl, buildPageMetadata } from "@/lib/seo";
import { getToolFaqs } from "@/lib/tool-faqs";

const faqs = getToolFaqs("demographics");

const TOOL_PATH = "/tools/demographics";
const TOOL_NAME = "Demographics Calculator";
const TOOL_DESCRIPTION =
  "Population, settlements, businesses, and NPC classes for a kingdom and a town, using DMG community wealth.";

export const metadata = buildPageMetadata({
  title: TOOL_NAME,
  description: TOOL_DESCRIPTION,
  path: TOOL_PATH,
});

export default function DemographicsPage() {
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
          faqs,
        )}
      />
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span aria-hidden="true"> / </span>
        <Link href="/tools">Tools</Link>
        <span aria-hidden="true"> / </span>
        <span aria-current="page">Demographics Calculator</span>
      </nav>

      <div className="page-header">
        <h1>Demographics Calculator</h1>
        <p>
          Model kingdom scale and a linked settlement using{" "}
          <em>Dungeon Master&apos;s Guide</em> community wealth, racial mix,
          power centers, businesses, and NPC class levels. Figures update as you
          edit inputs; use a seed to reroll random tables.
        </p>
      </div>

      <Suspense fallback={null}>
        <DemographicsCalculator />
      </Suspense>
      <ToolExplainer faqs={faqs} />
    </>
  );
}
