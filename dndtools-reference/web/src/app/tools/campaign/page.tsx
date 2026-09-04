import Link from "next/link";
import { Suspense } from "react";
import { CampaignHome } from "@/components/tools/campaign-home";
import { JsonLd, toolPageJsonLd } from "@/components/json-ld";
import { absoluteUrl, buildPageMetadata } from "@/lib/seo";
import { getTool } from "@/lib/tools";

const TOOL_PATH = "/tools/campaign";
const TOOL_NAME = "Campaign";
const TOOL_DESCRIPTION =
  "Create a D&D 3.5 campaign table, invite players, attach characters, and share 3D dice rolls.";

export const metadata = buildPageMetadata({
  title: TOOL_NAME,
  description: TOOL_DESCRIPTION,
  path: TOOL_PATH,
});

export default function CampaignPage() {
  const tool = getTool("campaign");

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
        <span>Campaign</span>
      </nav>
      <header className="page-header">
        <h1>
          {tool?.label ?? "Campaign"}
          {tool && "badge" in tool && tool.badge ? (
            <span className="tool-badge">{tool.badge}</span>
          ) : null}
        </h1>
        <p>
          Host a table, invite players with a join code or username, attach PC Planner
          characters, and share dice (including DM-only hidden rolls).
        </p>
      </header>
      <Suspense fallback={<p className="pc-planner-loading">Loading…</p>}>
        <CampaignHome />
      </Suspense>
    </>
  );
}
