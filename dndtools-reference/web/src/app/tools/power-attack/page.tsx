import Link from "next/link";
import { Suspense } from "react";
import { PowerAttackCalculator } from "@/components/tools/power-attack-calculator";
import { ToolExplainer } from "@/components/tool-explainer";
import { JsonLd, toolPageJsonLd } from "@/components/json-ld";
import { absoluteUrl, buildPageMetadata } from "@/lib/seo";
import { getToolFaqs } from "@/lib/tool-faqs";

const faqs = getToolFaqs("power-attack");

const TOOL_PATH = "/tools/power-attack";
const TOOL_NAME = "Power Attack Calculator";
const TOOL_DESCRIPTION =
  "Find the Power Attack penalty that deals the most expected damage against a target AC.";

export const metadata = buildPageMetadata({
  title: TOOL_NAME,
  description: TOOL_DESCRIPTION,
  path: TOOL_PATH,
});

export default function PowerAttackCalculatorPage() {
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
        <span aria-current="page">Power Attack Calculator</span>
      </nav>

      <div className="page-header">
        <h1>Power Attack Calculator</h1>
        <p>
          Compare expected damage for each legal Power Attack penalty using{" "}
          <em>Player&apos;s Handbook</em> hit and critical rules. Adjust target
          AC, weapon averages, and attack bonuses to see which tradeoff wins.
        </p>
      </div>

      <Suspense fallback={null}>
        <PowerAttackCalculator />
      </Suspense>
      <ToolExplainer faqs={faqs} />
    </>
  );
}
