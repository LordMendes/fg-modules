import { ToolExplainer } from "@/components/tool-explainer";
import { ToolsDirectory } from "@/components/tools-directory";
import { JsonLd, absoluteBreadcrumbJsonLd, faqPageJsonLd } from "@/components/json-ld";
import { absoluteUrl, buildPageMetadata } from "@/lib/seo";
import { TOOLS_PAGE_FAQS } from "@/lib/tool-faqs";

export const metadata = buildPageMetadata({
  title: "Tools",
  description:
    "Interactive D&D 3.5 Edition utilities — stronghold building, leadership, magic items, and more.",
  path: "/tools",
});

export default function ToolsPage() {
  return (
    <>
      <JsonLd
        data={[
          absoluteBreadcrumbJsonLd(
            [
              { name: "Home", path: "/" },
              { name: "Tools", path: "/tools" },
            ],
            absoluteUrl,
          ),
          faqPageJsonLd(TOOLS_PAGE_FAQS),
        ]}
      />
      <div className="page-header">
        <h1>Tools</h1>
        <p>
          Interactive utilities for D&amp;D 3.5 Edition — calculators and
          builders based on official rulebooks and Fantasy Grounds export.
        </p>
      </div>

      <ToolsDirectory />
      <ToolExplainer faqs={TOOLS_PAGE_FAQS} />
    </>
  );
}
