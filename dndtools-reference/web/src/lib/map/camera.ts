/** Pan/zoom camera: world (image) pixels <-> screen (viewport) pixels. */

export type Camera = {
  x: number;
  y: number;
  scale: number;
};

export function screenToWorld(
  camera: Camera,
  screenX: number,
  screenY: number,
): { x: number; y: number } {
  return {
    x: (screenX - camera.x) / camera.scale,
    y: (screenY - camera.y) / camera.scale,
  };
}

export function worldToScreen(
  camera: Camera,
  worldX: number,
  worldY: number,
): { x: number; y: number } {
  return {
    x: worldX * camera.scale + camera.x,
    y: worldY * camera.scale + camera.y,
  };
}

export function clampScale(
  scale: number,
  min = 0.15,
  max = 4,
): number {
  return Math.min(max, Math.max(min, scale));
}

/** Zoom toward a screen point; returns new camera. */
export function zoomAtScreenPoint(
  camera: Camera,
  screenX: number,
  screenY: number,
  factor: number,
  minScale = 0.15,
  maxScale = 4,
): Camera {
  const newScale = clampScale(camera.scale * factor, minScale, maxScale);
  const wx = (screenX - camera.x) / camera.scale;
  const wy = (screenY - camera.y) / camera.scale;
  return {
    scale: newScale,
    x: screenX - wx * newScale,
    y: screenY - wy * newScale,
  };
}

export function fitCameraToImage(
  viewportW: number,
  viewportH: number,
  imageW: number,
  imageH: number,
  pad = 32,
): Camera {
  const vw = Math.max(1, viewportW - pad * 2);
  const vh = Math.max(1, viewportH - pad * 2);
  const scale = clampScale(Math.min(vw / imageW, vh / imageH));
  return {
    scale,
    x: (viewportW - imageW * scale) / 2,
    y: (viewportH - imageH * scale) / 2,
  };
}

/** Device-pixel size for a viewport overlay canvas. */
export function overlayCanvasSize(
  cssWidth: number,
  cssHeight: number,
  dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1,
): { width: number; height: number; dpr: number } {
  const clamped = Math.min(2.5, Math.max(1, dpr));
  return {
    width: Math.max(1, Math.floor(cssWidth * clamped)),
    height: Math.max(1, Math.floor(cssHeight * clamped)),
    dpr: clamped,
  };
}
