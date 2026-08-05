import Link from "next/link";
import { Suspense } from "react";
import { TurnUndeadCalculator } from "@/components/tools/turn-undead-calculator";
import { JsonLd, toolPageJsonLd } from "@/components/json-ld";
import { absoluteUrl, buildPageMetadata } from "@/lib/seo";

const TOOL_PATH = "/tools/turn-undead-calculator";
const TOOL_NAME = "Turn Undead Calculator";
const TOOL_DESCRIPTION =
  "Resolve D&D 3.5 turn undead attempts: turning check, max HD per creature, damage pool allocation, and turned vs destroyed outcomes.";

export const metadata = buildPageMetadata({
  title: TOOL_NAME,
  description: TOOL_DESCRIPTION,
  path: TOOL_PATH,
});

export default function TurnUndeadCalculatorPage() {
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
        <span aria-current="page">Turn Undead Calculator</span>
      </nav>

      <div className="page-header">
        <h1>Turn Undead Calculator</h1>
        <p>
          Resolve cleric and paladin turn undead attempts using{" "}
          <em>Player&apos;s Handbook</em> Table 8-9 and damage pool rules.
          Enter your dice manually at the table — this tool does not roll for
          you.
        </p>
      </div>

      <Suspense fallback={null}>
        <TurnUndeadCalculator />
      </Suspense>
    </>
  );
}
