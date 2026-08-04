import Link from "next/link";
import { NpcCreator } from "@/components/tools/npc-creator";
import { JsonLd, toolPageJsonLd } from "@/components/json-ld";
import { absoluteUrl, buildPageMetadata } from "@/lib/seo";
import { getTool } from "@/lib/tools";

const TOOL_PATH = "/tools/npc-creator";
const TOOL_NAME = "NPC Creator";
const TOOL_DESCRIPTION =
  "Build D&D 3.5 NPCs with archetypes and monster templates, preview a Fantasy Grounds–style sheet, and download importable FG XML.";

export const metadata = buildPageMetadata({
  title: TOOL_NAME,
  description: TOOL_DESCRIPTION,
  path: TOOL_PATH,
});

export default function NpcCreatorPage() {
  const tool = getTool("npc-creator");

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
        <span aria-current="page">NPC Creator</span>
      </nav>

      <div className="page-header">
        <h1>
          {tool?.label ?? "NPC Creator"}
          {tool && "badge" in tool && tool.badge ? (
            <span className="tool-badge">{tool.badge}</span>
          ) : null}
        </h1>
        <p>
          Create D&amp;D 3.5 NPC stat blocks for Fantasy Grounds: stack
          level-free archetypes with class-level and monster templates (resolve
          conflicts when fields overlap), import skill JSON, attach
          portrait/token previews, and download importable XML.
        </p>
      </div>

      <NpcCreator />
    </>
  );
}
