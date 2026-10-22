import Link from "next/link";
import { Suspense } from "react";
import { TownGenerator } from "@/components/tools/town-generator";
import { ToolExplainer } from "@/components/tool-explainer";
import { JsonLd, toolPageJsonLd } from "@/components/json-ld";
import { absoluteUrl, buildPageMetadata } from "@/lib/seo";
import { getToolFaqs } from "@/lib/tool-faqs";

const faqs = getToolFaqs("town-generator");

const TOOL_PATH = "/tools/town-generator";
const TOOL_NAME = "Town Generator";
const TOOL_DESCRIPTION =
  "Generate a town map with districts, roads, walls, and a labeled gazetteer.";

export const metadata = buildPageMetadata({
  title: TOOL_NAME,
  description: TOOL_DESCRIPTION,
  path: TOOL_PATH,
});

export default function TownGeneratorPage() {
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
        <span aria-current="page">Town Generator</span>
      </nav>

      <div className="page-header">
        <h1>Town Generator</h1>
        <p>
          Sketch a settlement for your map table: districts, a central market for
          larger towns, optional walls and shoreline, and a gazetteer you can
          read aloud. A seed keeps the same layout when you return.
        </p>
      </div>

      <Suspense fallback={null}>
        <TownGenerator />
      </Suspense>
      <ToolExplainer faqs={faqs} />
    </>
  );
}
