import Link from "next/link";
import { Suspense } from "react";
import { DamageStatisticCalculator } from "@/components/tools/damage-statistic";
import { ToolExplainer } from "@/components/tool-explainer";
import { JsonLd, toolPageJsonLd } from "@/components/json-ld";
import { absoluteUrl, buildPageMetadata } from "@/lib/seo";
import { getToolFaqs } from "@/lib/tool-faqs";

const faqs = getToolFaqs("damage-statistic");

const TOOL_PATH = "/tools/damage-statistic";
const TOOL_NAME = "Damage Statistic";
const TOOL_DESCRIPTION =
  "Compare expected D&D 3.5 damage for two weapons by target AC. Pick catalog weapons, edit them like the PC Planner, enter BAB and ability scores or load a saved PC, and add DR.";

export const metadata = buildPageMetadata({
  title: TOOL_NAME,
  description: TOOL_DESCRIPTION,
  path: TOOL_PATH,
});

export default function DamageStatisticPage() {
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
        <span aria-current="page">{TOOL_NAME}</span>
      </nav>

      <div className="page-header">
        <h1>{TOOL_NAME}</h1>
        <p>
          Estimate average damage for two weapons against different AC values
          using <em>Player&apos;s Handbook</em> attack and critical hit rules.
          Edit each weapon like the PC Planner, or load a saved character when
          signed in.
        </p>
      </div>

      <Suspense fallback={null}>
        <DamageStatisticCalculator />
      </Suspense>
      <ToolExplainer faqs={faqs} />
    </>
  );
}
