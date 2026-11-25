import { redirect } from "next/navigation";
import { PcPlanner } from "@/components/tools/pc-planner";
import { pcPlanPath } from "@/lib/pc-planner/paths";

type Props = {
  searchParams: Promise<{ id?: string; share?: string }>;
};

export default async function PcPlannerPage({ searchParams }: Props) {
  const params = await searchParams;
  // Old links used ?id=. The list page itself never opens a character.
  if (params.id && !params.share) {
    redirect(pcPlanPath(params.id));
  }

  return <PcPlanner />;
}
