import { CampaignSheetPopout } from "@/components/tools/campaign-sheet-popout";
import { buildPageMetadata } from "@/lib/seo";

type PageProps = {
  params: Promise<{ id: string; pcPlanId: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { id, pcPlanId } = await params;
  return buildPageMetadata({
    title: "Character sheet",
    description: "Campaign character sheet pop-out with shared dice.",
    path: `/tools/campaign/${id}/sheet/${pcPlanId}`,
  });
}

export default async function CampaignSheetPopoutPage({ params }: PageProps) {
  const { id, pcPlanId } = await params;
  return <CampaignSheetPopout campaignId={id} pcPlanId={pcPlanId} />;
}
