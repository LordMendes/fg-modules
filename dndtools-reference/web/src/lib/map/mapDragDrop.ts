/**
 * Utilities for drag-and-drop token placement on maps.
 */

/**
 * Parse PC token drop payload.
 * Returns pcPlanId and userId if valid, null otherwise.
 */
export function parsePcTokenDrop(
  dataTransfer: string,
  plainText: string,
): { pcPlanId: string; userId: string } | null {
  try {
    // Try structured MIME type first
    if (dataTransfer) {
      const parsed = JSON.parse(dataTransfer) as {
        pcPlanId?: string;
        userId?: string;
      };
      if (parsed.pcPlanId && parsed.userId) {
        return { pcPlanId: parsed.pcPlanId, userId: parsed.userId };
      }
    }

    // Fall back to text/plain format
    if (plainText.startsWith("campaign-pc:")) {
      const pcPlanId = plainText.slice("campaign-pc:".length);
      if (pcPlanId) {
        // Without userId in fallback, we don't have ownership info
        return null;
      }
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Check if a user can drop a PC token.
 * DM can drop any PC. Players can only drop their own PCs.
 */
export function canDropPcToken(
  isDm: boolean,
  viewerUserId: string,
  tokenOwnerUserId: string | null,
): boolean {
  if (isDm) return true;
  if (tokenOwnerUserId === null) return false;
  return tokenOwnerUserId === viewerUserId;
}

/**
 * Calculate default party placement position (map center in grid coordinates).
 */
export function defaultPartyStartPosition(
  imageWidth: number,
  imageHeight: number,
  gridSizePx: number,
): { x: number; y: number } {
  return {
    x: Math.floor(imageWidth / gridSizePx / 2),
    y: Math.floor(imageHeight / gridSizePx / 2),
  };
}

/**
 * Summarize party placement results into success/error message.
 */
export function summarizePartyPlacement(
  placed: number,
  total: number,
  failures: Array<{ name: string; error: string }>,
): { success: boolean; error?: string } {
  if (total === 0) {
    return { success: false, error: "No characters in this campaign" };
  }

  if (placed === 0) {
    const failureDetails = failures.map((f) => `${f.name}: ${f.error}`).join("; ");
    return {
      success: false,
      error: failureDetails
        ? `Failed to place any tokens. ${failureDetails}`
        : "Failed to place any tokens",
    };
  }

  if (failures.length > 0) {
    const failureDetails = failures.map((f) => `${f.name}: ${f.error}`).join("; ");
    return {
      success: true,
      error: `Placed ${placed} of ${total}. Failures: ${failureDetails}`,
    };
  }

  return { success: true };
}
