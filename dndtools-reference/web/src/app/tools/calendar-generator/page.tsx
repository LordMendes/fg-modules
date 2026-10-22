import Link from "next/link";
import { Suspense } from "react";
import { CalendarGenerator } from "@/components/tools/calendar-generator";
import { ToolExplainer } from "@/components/tool-explainer";
import { JsonLd, toolPageJsonLd } from "@/components/json-ld";
import { absoluteUrl, buildPageMetadata } from "@/lib/seo";
import { getToolFaqs } from "@/lib/tool-faqs";

const faqs = getToolFaqs("calendar-generator");

const TOOL_PATH = "/tools/calendar-generator";
const TOOL_NAME = "Calendar Generator";
const TOOL_DESCRIPTION =
  "Build a fantasy year with months, a week, moons, and holidays, then page through it.";

export const metadata = buildPageMetadata({
  title: TOOL_NAME,
  description: TOOL_DESCRIPTION,
  path: TOOL_PATH,
});

export default function CalendarGeneratorPage() {
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
        <span aria-current="page">Calendar Generator</span>
      </nav>

      <div className="page-header">
        <h1>Calendar Generator</h1>
        <p>
          Shape a campaign calendar with custom month and week lengths, optional
          moons and holidays, and day notes that stay on this device. Export a
          JSON file to reuse the same year in another session.
        </p>
      </div>

      <Suspense fallback={null}>
        <CalendarGenerator />
      </Suspense>
      <ToolExplainer faqs={faqs} />
    </>
  );
}
