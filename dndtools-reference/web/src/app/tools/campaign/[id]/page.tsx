import Link from "next/link";
import { CampaignTable } from "@/components/tools/campaign-table";
import { buildPageMetadata } from "@/lib/seo";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  return buildPageMetadata({
    title: "Campaign table",
    description: "Shared campaign table with characters and dice.",
    path: `/tools/campaign/${id}`,
  });
}

export default async function CampaignTablePage({ params }: PageProps) {
  const { id } = await params;

  return (
    <>
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span aria-hidden="true"> / </span>
        <Link href="/tools">Tools</Link>
        <span aria-hidden="true"> / </span>
        <Link href="/tools/campaign">Campaign</Link>
        <span aria-hidden="true"> / </span>
        <span>Table</span>
      </nav>
      <CampaignTable campaignId={id} />
    </>
  );
}
