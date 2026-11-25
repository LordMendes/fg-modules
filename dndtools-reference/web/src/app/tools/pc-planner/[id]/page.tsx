import { PcPlanner } from "@/components/tools/pc-planner";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function PcPlannerCharacterPage({ params }: Props) {
  const { id } = await params;
  return <PcPlanner planId={id} />;
}
