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
  return <CampaignTable campaignId={id} />;
}
