import type { DiceSkin } from "./types";

/** Built-in skins. Add rows here (and optional theme files) for new looks. */
export const DICE_SKINS: DiceSkin[] = [
  {
    id: "parchment-gold",
    label: "Parchment Gold",
    engineTheme: "default",
    themeColor: "#B8860B",
  },
  {
    id: "dungeon-violet",
    label: "Dungeon Violet",
    engineTheme: "default",
    themeColor: "#6B4C9A",
  },
  {
    id: "bloodstone",
    label: "Bloodstone",
    engineTheme: "default",
    themeColor: "#7B2D26",
  },
];

export const DEFAULT_SKIN_ID = DICE_SKINS[0].id;

export function getDiceSkin(id: string | null | undefined): DiceSkin {
  return DICE_SKINS.find((s) => s.id === id) ?? DICE_SKINS[0];
}
