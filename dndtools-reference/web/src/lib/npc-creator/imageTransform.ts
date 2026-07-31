/** Render a pan/zoom view of an image into a JPEG data URL. */

export type ImageTransform = {
  /** 1 = cover-fit; larger = zoom in */
  zoom: number;
  /** Pan in viewport pixels (positive = image moves right/down) */
  panX: number;
  panY: number;
};

export const DEFAULT_IMAGE_TRANSFORM: ImageTransform = {
  zoom: 1,
  panX: 0,
  panY: 0,
};

export function coverScale(
  imgW: number,
  imgH: number,
  viewW: number,
  viewH: number,
): number {
  return Math.max(viewW / imgW, viewH / imgH);
}

export function imageDrawRect(
  imgW: number,
  imgH: number,
  viewW: number,
  viewH: number,
  t: ImageTransform,
): { x: number; y: number; w: number; h: number; scale: number } {
  const scale = coverScale(imgW, imgH, viewW, viewH) * Math.max(0.2, t.zoom);
  const w = imgW * scale;
  const h = imgH * scale;
  const x = viewW / 2 + t.panX - w / 2;
  const y = viewH / 2 + t.panY - h / 2;
  return { x, y, w, h, scale };
}

export async function renderTransformedImage(
  sourceUrl: string,
  transform: ImageTransform,
  outW: number,
  outH: number,
  quality = 0.88,
): Promise<string> {
  const img = await loadHtmlImage(sourceUrl);
  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not available");

  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(0, 0, outW, outH);

  const { x, y, w, h } = imageDrawRect(
    img.naturalWidth,
    img.naturalHeight,
    outW,
    outH,
    transform,
  );
  ctx.drawImage(img, x, y, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}

export function loadHtmlImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const done = () => {
      if (img.naturalWidth > 0) resolve(img);
      else reject(new Error("Image has no dimensions"));
    };
    img.onload = () => done();
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = url;
    // Cached data-URLs / repeats can already be complete
    if (img.complete && img.naturalWidth > 0) {
      done();
    }
  });
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}
