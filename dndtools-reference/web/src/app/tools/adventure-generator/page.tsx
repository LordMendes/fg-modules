import Link from "next/link";
import { Suspense } from "react";
import { AdventureGenerator } from "@/components/tools/adventure-generator";
import { ToolExplainer } from "@/components/tool-explainer";
import { JsonLd, toolPageJsonLd } from "@/components/json-ld";
import { absoluteUrl, buildPageMetadata } from "@/lib/seo";
import { getToolFaqs } from "@/lib/tool-faqs";

const faqs = getToolFaqs("adventure-generator");

const TOOL_PATH = "/tools/adventure-generator";
const TOOL_NAME = "Adventure Generator";
const TOOL_DESCRIPTION =
  "Roll adventure elements one section at a time, from theme and hook through villain, set piece, and twist.";

export const metadata = buildPageMetadata({
  title: TOOL_NAME,
  description: TOOL_DESCRIPTION,
  path: TOOL_PATH,
});

export default function AdventureGeneratorPage() {
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
        <span aria-current="page">Adventure Generator</span>
      </nav>

      <div className="page-header">
        <h1>Adventure Generator</h1>
        <p>
          Build a one-page adventure sketch from theme, goals, hooks, villains,
          and complications. Use a seed to reproduce the same list, or click a
          section title to reroll just that row.
        </p>
      </div>

      <Suspense fallback={null}>
        <AdventureGenerator />
      </Suspense>
      <ToolExplainer faqs={faqs} />
    </>
  );
}
