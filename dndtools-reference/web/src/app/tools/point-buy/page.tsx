import Link from "next/link";
import { Suspense } from "react";
import { PointBuyCalculator } from "@/components/tools/point-buy-calculator";
import { ToolExplainer } from "@/components/tool-explainer";
import { JsonLd, toolPageJsonLd } from "@/components/json-ld";
import { absoluteUrl, buildPageMetadata } from "@/lib/seo";
import { getToolFaqs } from "@/lib/tool-faqs";

const faqs = getToolFaqs("point-buy");

const TOOL_PATH = "/tools/point-buy";
const TOOL_NAME = "Point Buy Calculator";
const TOOL_DESCRIPTION =
  "Build D&D 3.5 ability scores with a shareable point budget and purchasable min/max range (default 8–22).";

export const metadata = buildPageMetadata({
  title: TOOL_NAME,
  description: TOOL_DESCRIPTION,
  path: TOOL_PATH,
});

export default function PointBuyCalculatorPage() {
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
        <span aria-current="page">Point Buy Calculator</span>
      </nav>

      <div className="page-header point-buy-page-header">
        <h1>Point Buy Calculator</h1>
        <p>
          DMG 8–18 costs (refunds below 8, house curve above 18). Share presets
          via the URL, for example{" "}
          <code>?points=32&amp;min=8&amp;max=18</code>.
        </p>
      </div>

      <Suspense fallback={null}>
        <PointBuyCalculator />
      </Suspense>
      <ToolExplainer faqs={faqs} />
    </>
  );
}
