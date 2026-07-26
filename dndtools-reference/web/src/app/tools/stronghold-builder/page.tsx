import Link from "next/link";
import { StrongholdCalculator } from "@/components/tools/stronghold-calculator";
import { JsonLd, absoluteBreadcrumbJsonLd } from "@/components/json-ld";
import { absoluteUrl, buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Stronghold Builder",
  description:
    "Calculate D&D 3.5 stronghold cost, build time, and staff upkeep using the Stronghold Builder's Guidebook rules.",
  path: "/tools/stronghold-builder",
});

export default function StrongholdBuilderPage() {
  return (
    <>
      <JsonLd
        data={absoluteBreadcrumbJsonLd(
          [
            { name: "Home", path: "/" },
            { name: "Tools", path: "/tools" },
            { name: "Stronghold Builder", path: "/tools/stronghold-builder" },
          ],
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
