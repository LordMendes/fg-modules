import Link from "next/link";
import { Suspense } from "react";
import { FractalWorldTool } from "@/components/tools/fractal-world";
import { ToolExplainer } from "@/components/tool-explainer";
import { ToolLicenseFooter } from "@/components/tool-license-footer";
import { JsonLd, toolPageJsonLd } from "@/components/json-ld";
import { absoluteUrl, buildPageMetadata } from "@/lib/seo";
import { getToolFaqs } from "@/lib/tool-faqs";

const faqs = getToolFaqs("fractal-world");

const TOOL_PATH = "/tools/fractal-world";
const TOOL_NAME = "Fractal World";
const TOOL_DESCRIPTION =
  "Render a seeded world in several map projections and color palettes.";

export const metadata = buildPageMetadata({
  title: TOOL_NAME,
  description: TOOL_DESCRIPTION,
  path: TOOL_PATH,
});

export default function FractalWorldPage() {
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
        <span aria-current="page">Fractal World</span>
      </nav>

      <div className="page-header">
        <h1>Fractal World</h1>
        <p>
          Paint a procedural globe with height and temperature noise, then view
          it in common map projections. Adjust sea and ice levels, pick a
          palette, and download a PNG for handouts or world-building reference.
        </p>
      </div>

      <Suspense fallback={null}>
        <FractalWorldTool />
      </Suspense>
      <ToolExplainer faqs={faqs} />
      <ToolLicenseFooter toolKey="fractal-world" />
    </>
  );
}
