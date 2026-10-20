import Link from "next/link";
import { Suspense } from "react";
import { WorldGenerator } from "@/components/tools/world-generator";
import { ToolExplainer } from "@/components/tool-explainer";
import { JsonLd, toolPageJsonLd } from "@/components/json-ld";
import { absoluteUrl, buildPageMetadata } from "@/lib/seo";
import { getToolFaqs } from "@/lib/tool-faqs";

const faqs = getToolFaqs("world-generator");

const TOOL_PATH = "/tools/world-generator";
const TOOL_NAME = "World Generator";
const TOOL_DESCRIPTION =
  "Generate a world map with seas, ice, rivers, and cities on a hex or square grid.";

export const metadata = buildPageMetadata({
  title: TOOL_NAME,
  description: TOOL_DESCRIPTION,
  path: TOOL_PATH,
});

export default function WorldGeneratorPage() {
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
        <span aria-current="page">World Generator</span>
      </nav>

      <div className="page-header">
        <h1>World Generator</h1>
        <p>
          Build a fantasy map for campaign overview or handouts. Set sea and
          ice coverage, optional rivers and settlements, then download the SVG
          or share a seed to reproduce the same world.
        </p>
      </div>

      <Suspense fallback={null}>
        <WorldGenerator />
      </Suspense>
      <ToolExplainer faqs={faqs} />
    </>
  );
}
