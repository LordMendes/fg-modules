import Link from "next/link";
import { Suspense } from "react";
import { WeatherGenerator } from "@/components/tools/weather-generator";
import { ToolExplainer } from "@/components/tool-explainer";
import { JsonLd, toolPageJsonLd } from "@/components/json-ld";
import { absoluteUrl, buildPageMetadata } from "@/lib/seo";
import { getToolFaqs } from "@/lib/tool-faqs";

const faqs = getToolFaqs("weather-generator");

const TOOL_PATH = "/tools/weather-generator";
const TOOL_NAME = "Weather Generator";
const TOOL_DESCRIPTION =
  "Generate a month of weather for a climate and season, including wind, precipitation, and rare supernatural skies.";

export const metadata = buildPageMetadata({
  title: TOOL_NAME,
  description: TOOL_DESCRIPTION,
  path: TOOL_PATH,
});

export default function WeatherGeneratorPage() {
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
        <span aria-current="page">Weather Generator</span>
      </nav>

      <div className="page-header">
        <h1>Weather Generator</h1>
        <p>
          Roll daily weather for wilderness travel and downtime using{" "}
          <em>Dungeon Master&apos;s Guide</em> climate and season guidance.
          Set climate, season, and optional supernatural skies, then share a
          seed to reproduce the same month.
        </p>
      </div>

      <Suspense fallback={null}>
        <WeatherGenerator />
      </Suspense>
      <ToolExplainer faqs={faqs} />
    </>
  );
}
