import Link from "next/link";
import { NpcCreator } from "@/components/tools/npc-creator";
import { JsonLd, absoluteBreadcrumbJsonLd } from "@/components/json-ld";
import { absoluteUrl, buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "NPC Creator",
  description:
    "Build D&D 3.5 NPCs with archetypes and monster templates, preview a Fantasy Grounds–style sheet, and download importable FG XML.",
  path: "/tools/npc-creator",
});

export default function NpcCreatorPage() {
  return (
    <>
      <JsonLd
        data={absoluteBreadcrumbJsonLd(
          [
            { name: "Home", path: "/" },
            { name: "Tools", path: "/tools" },
            { name: "NPC Creator", path: "/tools/npc-creator" },
          ],
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
        <h1>NPC Creator</h1>
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
