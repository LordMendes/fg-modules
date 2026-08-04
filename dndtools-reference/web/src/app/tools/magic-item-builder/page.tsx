import Link from "next/link";
import { MagicItemCalculator } from "@/components/tools/magic-item-calculator";
import { JsonLd, toolPageJsonLd } from "@/components/json-ld";
import { absoluteUrl, buildPageMetadata } from "@/lib/seo";

const TOOL_PATH = "/tools/magic-item-builder";
const TOOL_NAME = "Magic Item Builder";
const TOOL_DESCRIPTION =
  "Calculate D&D 3.5 magic weapon and armor prices using DMG rules, with Complete-series special abilities. Includes base item cost and total equivalent bonus.";

export const metadata = buildPageMetadata({
  title: TOOL_NAME,
  description: TOOL_DESCRIPTION,
  path: TOOL_PATH,
});

export default function MagicItemBuilderPage() {
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
        <span aria-current="page">Magic Item Builder</span>
      </nav>

      <div className="page-header">
        <h1>Magic Item Builder</h1>
        <p>
          Price magic weapons, armor, and shields using DMG 3.5 rules (Tables
          7-5–7-11), extended with special abilities from the Complete series
          (Warrior, Arcane, Adventurer, Divine, Scoundrel, Mage, Champion).
          Base item cost and total equivalent bonus are included in every
          calculation.
        </p>
      </div>

      <MagicItemCalculator />
    </>
  );
}
