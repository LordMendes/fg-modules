import Link from "next/link";
import { Suspense } from "react";
import { PcPlanner } from "@/components/tools/pc-planner";
import { JsonLd, toolPageJsonLd } from "@/components/json-ld";
import { absoluteUrl, buildPageMetadata } from "@/lib/seo";
import { getTool } from "@/lib/tools";

const TOOL_PATH = "/tools/pc-planner";
const TOOL_NAME = "PC Planner";
const TOOL_DESCRIPTION =
  "Plan D&D 3.5 player characters with a Fantasy Grounds character sheet, compendium feat and spell search, and automatic spell slot calculation.";

export const metadata = buildPageMetadata({
  title: TOOL_NAME,
  description: TOOL_DESCRIPTION,
  path: TOOL_PATH,
});

export default function PcPlannerPage() {
  const tool = getTool("pc-planner");

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
        <span>PC Planner</span>
      </nav>
      <header className="page-header">
        <h1>
          {tool?.label ?? "PC Planner"}
          {tool && "badge" in tool && tool.badge ? (
            <span className="tool-badge">{tool.badge}</span>
          ) : null}
        </h1>
        <p>
          Build player characters on a Fantasy Grounds character sheet. Spell slots are
          computed from class level and casting ability. Requires an account to save plans.
        </p>
      </header>
      <Suspense fallback={<p className="pc-planner-loading">Loading…</p>}>
        <PcPlanner />
      </Suspense>
    </>
  );
}
