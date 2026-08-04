import Link from "next/link";
import { StrongholdCalculator } from "@/components/tools/stronghold-calculator";
import { JsonLd, toolPageJsonLd } from "@/components/json-ld";
import { absoluteUrl, buildPageMetadata } from "@/lib/seo";

const TOOL_PATH = "/tools/stronghold-builder";
const TOOL_NAME = "Stronghold Builder";
const TOOL_DESCRIPTION =
  "Calculate D&D 3.5 stronghold cost, build time, and staff upkeep using the Stronghold Builder's Guidebook rules.";

export const metadata = buildPageMetadata({
  title: TOOL_NAME,
  description: TOOL_DESCRIPTION,
  path: TOOL_PATH,
});

export default function StrongholdBuilderPage() {
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
        )}
      />
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span aria-hidden="true"> / </span>
        <Link href="/tools">Tools</Link>
        <span aria-hidden="true"> / </span>
        <span aria-current="page">Stronghold Builder</span>
      </nav>

      <div className="page-header">
        <h1>Stronghold Builder</h1>
        <p>
          Design a stronghold using the{" "}
          <em>Stronghold Builder&apos;s Guidebook</em> (Chapter 1). Select a
          site, add components, configure walls, and see total cost, build time,
          and monthly staff upkeep.
        </p>
      </div>

      <StrongholdCalculator />
    </>
  );
}
