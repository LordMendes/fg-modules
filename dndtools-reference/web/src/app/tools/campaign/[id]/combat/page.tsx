import { CampaignCombatPopout } from "@/components/combat/campaign-combat-popout";
import { buildPageMetadata } from "@/lib/seo";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  return buildPageMetadata({
    title: "Combat tracker",
    description: "Campaign combat tracker pop-out with shared dice.",
    path: `/tools/campaign/${id}/combat`,
  });
}

export default async function CampaignCombatPopoutPage({ params }: PageProps) {
  const { id } = await params;
  return <CampaignCombatPopout campaignId={id} />;
}
