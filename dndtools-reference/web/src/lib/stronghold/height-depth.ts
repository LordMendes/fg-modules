/** Table 2-2: Height and Depth Adjustments to Cost (per stronghold space) */

export function getHeightAdjustmentPerSpace(storiesAboveGround: number): number {
  if (storiesAboveGround <= 2) return 0;
  if (storiesAboveGround === 3) return 400;
  if (storiesAboveGround === 4) return 1000;
  if (storiesAboveGround === 5) return 2000;
  if (storiesAboveGround === 6) return 3000;
  const extraStories = storiesAboveGround - 6;
  return 3000 + extraStories * 1500;
}

export function getDepthAdjustmentPerSpace(subterraneanLayers: number): number {
  if (subterraneanLayers <= 1) return 0;
  if (subterraneanLayers === 2) return 400;
  if (subterraneanLayers === 3) return 1000;
  if (subterraneanLayers === 4) return 2000;
  if (subterraneanLayers === 5) return 3000;
  const extraLayers = subterraneanLayers - 5;
  return 3000 + extraLayers * 1500;
}

export function getHeightDepthCost(
  totalSpaces: number,
  storiesAboveGround: number,
  subterraneanLayers: number,
): number {
  const perSpace =
    getHeightAdjustmentPerSpace(storiesAboveGround) +
    getDepthAdjustmentPerSpace(subterraneanLayers);
  return Math.round(totalSpaces * perSpace);
}
