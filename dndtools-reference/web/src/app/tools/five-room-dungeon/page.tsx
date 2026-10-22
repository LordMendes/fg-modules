import Link from "next/link";
import { Suspense } from "react";
import { FiveRoomDungeon } from "@/components/tools/five-room-dungeon";
import { ToolExplainer } from "@/components/tool-explainer";
import { JsonLd, toolPageJsonLd } from "@/components/json-ld";
import { absoluteUrl, buildPageMetadata } from "@/lib/seo";
import { getToolFaqs } from "@/lib/tool-faqs";

const faqs = getToolFaqs("five-room-dungeon");

const TOOL_PATH = "/tools/five-room-dungeon";
const TOOL_NAME = "Five Room Dungeon";
const TOOL_DESCRIPTION =
  "Build a five-room dungeon with a map: entrance, puzzle, setback, climax, and reward.";

export const metadata = buildPageMetadata({
  title: TOOL_NAME,
  description: TOOL_DESCRIPTION,
  path: TOOL_PATH,
});

export default function FiveRoomDungeonPage() {
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
        <span aria-current="page">Five Room Dungeon</span>
      </nav>

      <div className="page-header">
        <h1>Five Room Dungeon</h1>
        <p>
          Sketch a complete five-room delve with a seeded map, a motif, keyed
          challenges, and a revelation in the last room. Set level and party
          size for treasure and encounter hints, then share a seed to reproduce
          the same map and rooms.
        </p>
      </div>

      <Suspense fallback={null}>
        <FiveRoomDungeon />
      </Suspense>
      <ToolExplainer faqs={faqs} />
    </>
  );
}
