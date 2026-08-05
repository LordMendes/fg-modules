import { OG_CONTENT_TYPE, OG_SIZE, toolOgImageResponse } from "@/lib/og-image";

export const alt = "Turn Undead Calculator — DnD Helper";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return toolOgImageResponse("turn-undead-calculator");
}
