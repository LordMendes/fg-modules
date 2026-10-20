import Link from "next/link";
import { Suspense } from "react";
import { InnGenerator } from "@/components/tools/inn-generator";
import { ToolExplainer } from "@/components/tool-explainer";
import { JsonLd, toolPageJsonLd } from "@/components/json-ld";
import { absoluteUrl, buildPageMetadata } from "@/lib/seo";
import { getToolFaqs } from "@/lib/tool-faqs";

const faqs = getToolFaqs("inn-generator");

const TOOL_PATH = "/tools/inn-generator";
const TOOL_NAME = "Inn Generator";
const TOOL_DESCRIPTION =
  "Generate an inn or tavern with a keeper, a menu, patrons, and rumors.";

export const metadata = buildPageMetadata({
  title: TOOL_NAME,
  description: TOOL_DESCRIPTION,
  path: TOOL_PATH,
});

export default function InnGeneratorPage() {
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
        <span aria-current="page">Inn Generator</span>
      </nav>

      <div className="page-header">
        <h1>Inn Generator</h1>
        <p>
          Roll up a tavern for tonight&apos;s session: quality sets the menu
          prices, crowd sets who is at the tables, and a seed keeps the same inn
          when you return.
        </p>
      </div>

      <Suspense fallback={null}>
        <InnGenerator />
      </Suspense>
      <ToolExplainer faqs={faqs} />
    </>
  );
}
