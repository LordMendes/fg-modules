import type { GridConfig } from "@/lib/map/grid";
import { gridToPixels } from "@/lib/map/grid";
import type { MapTokenView } from "@/lib/map/types";

export function tokenTopLeftPx(token: MapTokenView, grid: GridConfig) {
  return gridToPixels(token.x, token.y, grid);
}

export function tokenCenterPx(token: MapTokenView, grid: GridConfig) {
  const tl = tokenTopLeftPx(token, grid);
  const w = token.width * grid.gridSizePx;
  const h = token.height * grid.gridSizePx;
  return { x: tl.x + w / 2, y: tl.y + h / 2 };
}

export function tokenFootprintPx(token: MapTokenView, grid: GridConfig) {
  return {
    width: token.width * grid.gridSizePx,
    height: token.height * grid.gridSizePx,
  };
}
