import Link from "next/link";
import { Suspense } from "react";
import { NameGeneratorTool } from "@/components/tools/name-generator";
import { ToolExplainer } from "@/components/tool-explainer";
import { ToolLicenseFooter } from "@/components/tool-license-footer";
import { JsonLd, toolPageJsonLd } from "@/components/json-ld";
import { absoluteUrl, buildPageMetadata } from "@/lib/seo";
import { getToolFaqs } from "@/lib/tool-faqs";

const faqs = getToolFaqs("name-generator");

const TOOL_PATH = "/tools/name-generator";
const TOOL_NAME = "Name Generator";
const TOOL_DESCRIPTION =
  "Generate fantasy names from built-in lists, or from a list you paste in.";

export const metadata = buildPageMetadata({
  title: TOOL_NAME,
  description: TOOL_DESCRIPTION,
  path: TOOL_PATH,
});

export default function NameGeneratorPage() {
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
        <span aria-current="page">Name Generator</span>
      </nav>

      <div className="page-header">
        <h1>Name Generator</h1>
        <p>
          Roll fantasy names from site syllable tables for common ancestries,
          monsters, outsiders, and places, or train a short Markov chain on names
          you paste. Use a seed to reproduce the same batch.
        </p>
      </div>

      <Suspense fallback={null}>
        <NameGeneratorTool />
      </Suspense>
      <ToolExplainer faqs={faqs} />
      <ToolLicenseFooter toolKey="name-generator" />
    </>
  );
}
