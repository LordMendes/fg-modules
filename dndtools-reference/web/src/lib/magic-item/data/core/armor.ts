import type { GearType } from "../../types";

/** DMG Table 7-3 / 7-4 — masterwork armor and shield base costs. */
export const CORE_ARMOR: GearType[] = [
  { id: "padded-armor", name: "Padded armor", costGp: 155, kind: "armor", source: "DMG" },
  { id: "leather-armor", name: "Leather armor", costGp: 160, kind: "armor", source: "DMG" },
  { id: "studded-leather", name: "Studded leather armor", costGp: 175, kind: "armor", source: "DMG" },
  { id: "chain-shirt", name: "Chain shirt", costGp: 250, kind: "armor", source: "DMG" },
  { id: "hide-armor", name: "Hide armor", costGp: 165, kind: "armor", source: "DMG" },
  { id: "scale-mail", name: "Scale mail", costGp: 200, kind: "armor", source: "DMG" },
  { id: "chainmail", name: "Chainmail", costGp: 300, kind: "armor", source: "DMG" },
  { id: "breastplate", name: "Breastplate", costGp: 350, kind: "armor", source: "DMG" },
  { id: "splint-mail", name: "Splint mail", costGp: 350, kind: "armor", source: "DMG" },
  { id: "banded-mail", name: "Banded mail", costGp: 400, kind: "armor", source: "DMG" },
  { id: "half-plate", name: "Half-plate", costGp: 750, kind: "armor", source: "DMG" },
  { id: "full-plate", name: "Full plate", costGp: 1650, kind: "armor", source: "DMG" },
  { id: "buckler", name: "Buckler", costGp: 165, kind: "shield", source: "DMG" },
  { id: "light-wooden-shield", name: "Light wooden shield", costGp: 153, kind: "shield", source: "DMG" },
  { id: "light-steel-shield", name: "Light steel shield", costGp: 159, kind: "shield", source: "DMG" },
  { id: "heavy-wooden-shield", name: "Heavy wooden shield", costGp: 157, kind: "shield", source: "DMG" },
  { id: "heavy-steel-shield", name: "Heavy steel shield", costGp: 170, kind: "shield", source: "DMG" },
  { id: "tower-shield", name: "Tower shield", costGp: 180, kind: "shield", source: "DMG" },
];
