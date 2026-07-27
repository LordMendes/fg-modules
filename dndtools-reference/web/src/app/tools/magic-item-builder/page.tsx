import Link from "next/link";
import { MagicItemCalculator } from "@/components/tools/magic-item-calculator";
import { JsonLd, absoluteBreadcrumbJsonLd } from "@/components/json-ld";
import { absoluteUrl, buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Magic Item Builder",
  description:
    "Calculate D&D 3.5 magic weapon and armor prices using DMG rules, with Complete-series special abilities. Includes base item cost and total equivalent bonus.",
  path: "/tools/magic-item-builder",
});

export default function MagicItemBuilderPage() {
  return (
    <>
      <JsonLd
        data={absoluteBreadcrumbJsonLd(
          [
            { name: "Home", path: "/" },
            { name: "Tools", path: "/tools" },
            { name: "Magic Item Builder", path: "/tools/magic-item-builder" },
          ],
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
