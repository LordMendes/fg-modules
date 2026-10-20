import Link from "next/link";
import { Suspense } from "react";
import { TreasureMapTool } from "@/components/tools/treasure-map";
import { ToolExplainer } from "@/components/tool-explainer";
import { JsonLd, toolPageJsonLd } from "@/components/json-ld";
import { absoluteUrl, buildPageMetadata } from "@/lib/seo";
import { getToolFaqs } from "@/lib/tool-faqs";

const faqs = getToolFaqs("treasure-map");

const TOOL_PATH = "/tools/treasure-map";
const TOOL_NAME = "Treasure Map";
const TOOL_DESCRIPTION =
  "Draw a treasure map with a path of labeled markers and a clue for each one.";

export const metadata = buildPageMetadata({
  title: TOOL_NAME,
  description: TOOL_DESCRIPTION,
  path: TOOL_PATH,
});

export default function TreasureMapPage() {
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
        <span aria-current="page">Treasure Map</span>
      </nav>

      <div className="page-header">
        <h1>Treasure Map</h1>
        <p>
          Sketch a hand-drawn style map with a dashed route, numbered landmarks,
          and a hoard marker. Each stop gets a travel clue you can read aloud at
          the table. Use a seed to reproduce the same map and clues.
        </p>
      </div>

      <Suspense fallback={null}>
        <TreasureMapTool />
      </Suspense>
      <ToolExplainer faqs={faqs} />
    </>
  );
}
