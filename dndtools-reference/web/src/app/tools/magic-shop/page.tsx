import Link from "next/link";
import { Suspense } from "react";
import { MagicShopGenerator } from "@/components/tools/magic-shop";
import { ToolExplainer } from "@/components/tool-explainer";
import { JsonLd, toolPageJsonLd } from "@/components/json-ld";
import { absoluteUrl, buildPageMetadata } from "@/lib/seo";
import { getToolFaqs } from "@/lib/tool-faqs";

const faqs = getToolFaqs("magic-shop");

const TOOL_PATH = "/tools/magic-shop";
const TOOL_NAME = "Magic Shop";
const TOOL_DESCRIPTION =
  "Stock a magic shop from town size, with a keeper and items priced from the compendium.";

export const metadata = buildPageMetadata({
  title: TOOL_NAME,
  description: TOOL_DESCRIPTION,
  path: TOOL_PATH,
});

export default function MagicShopPage() {
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
        <span aria-current="page">Magic Shop</span>
      </nav>

      <div className="page-header">
        <h1>Magic Shop</h1>
        <p>
          Stock a town shop using <em>Dungeon Master&apos;s Guide</em> settlement
          gp limits, then fill shelves from the magic item compendium. Use a seed
          to reproduce the same shop.
        </p>
      </div>

      <Suspense fallback={null}>
        <MagicShopGenerator />
      </Suspense>
      <ToolExplainer faqs={faqs} />
    </>
  );
}
