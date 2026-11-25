export const PC_PLANNER_LIST_PATH = "/tools/pc-planner";

export function pcPlanPath(planId: string): string {
  return `${PC_PLANNER_LIST_PATH}/${encodeURIComponent(planId)}`;
}
