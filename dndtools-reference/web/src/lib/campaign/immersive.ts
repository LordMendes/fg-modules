/** True for immersive campaign surfaces (table or sheet pop-out). */
export function isCampaignTablePath(pathname: string): boolean {
  if (/^\/tools\/campaign\/[^/]+$/.test(pathname)) return true;
  if (/^\/tools\/campaign\/[^/]+\/sheet\/[^/]+$/.test(pathname)) return true;
  return false;
}

export function campaignSheetPopoutChannelName(campaignId: string): string {
  return `campaign-sheet-${campaignId}`;
}

export type CampaignSheetPopoutMessage =
  | { type: "opened"; pcPlanId: string }
  | { type: "closed"; pcPlanId: string }
  | { type: "focus"; pcPlanId: string };

export function campaignSheetWindowName(pcPlanId: string): string {
  return `campaign-sheet-${pcPlanId}`;
}
