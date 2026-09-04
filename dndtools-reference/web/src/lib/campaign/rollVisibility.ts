import type { CampaignRollView } from "@/lib/campaign/types";
import type { RollKind } from "@/lib/dice/types";
import type { DicePoolItem } from "@/lib/dice/types";

export type StoredCampaignRoll = {
  id: string;
  userId: string;
  username: string;
  characterName: string | null;
  kind: string;
  label: string;
  hidden: boolean;
  dice: unknown;
  modifier: number;
  iterativeModifiers: unknown;
  faces: unknown;
  faceSum: number;
  total: number;
  natural20: boolean;
  natural1: boolean;
  attackTotals: unknown;
  createdAt: Date | string | number;
};

function asNumberArray(value: unknown): number[] | undefined {
  if (!Array.isArray(value)) return undefined;
  if (!value.every((n) => typeof n === "number")) return undefined;
  return value as number[];
}

function asDicePool(value: unknown): DicePoolItem[] {
  if (!Array.isArray(value)) return [];
  const out: DicePoolItem[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const qty = (item as { qty?: unknown }).qty;
    const sides = (item as { sides?: unknown }).sides;
    const themeColor = (item as { themeColor?: unknown }).themeColor;
    if (typeof qty !== "number" || typeof sides !== "number") continue;
    if (![4, 6, 8, 10, 12, 20, 100].includes(sides)) continue;
    out.push({
      qty,
      sides: sides as DicePoolItem["sides"],
      ...(typeof themeColor === "string" ? { themeColor } : {}),
    });
  }
  return out;
}

function asRollKind(value: string): RollKind {
  const allowed: RollKind[] = [
    "attack",
    "damage",
    "save",
    "skill",
    "initiative",
    "cast",
    "spell",
    "hitDie",
    "tray",
    "other",
  ];
  return (allowed.includes(value as RollKind) ? value : "other") as RollKind;
}

export function canRevealCampaignRoll(
  roll: { hidden: boolean; userId: string },
  viewer: { userId: string; isDm: boolean },
): boolean {
  if (!roll.hidden) return true;
  return viewer.isDm || viewer.userId === roll.userId;
}

export function toCampaignRollView(
  roll: StoredCampaignRoll,
  viewer: { userId: string; isDm: boolean },
): CampaignRollView {
  const revealResult = canRevealCampaignRoll(roll, viewer);
  const faces = asNumberArray(roll.faces) ?? [];
  const attackTotals = asNumberArray(roll.attackTotals);
  const iterativeModifiers = asNumberArray(roll.iterativeModifiers);
  const at =
    roll.createdAt instanceof Date
      ? roll.createdAt.getTime()
      : typeof roll.createdAt === "number"
        ? roll.createdAt
        : new Date(roll.createdAt).getTime();

  return {
    id: roll.id,
    actor: {
      userId: roll.userId,
      username: roll.username,
      characterName: roll.characterName,
    },
    kind: asRollKind(roll.kind),
    label: roll.label,
    hidden: roll.hidden,
    dice: asDicePool(roll.dice),
    modifier: roll.modifier,
    ...(iterativeModifiers ? { iterativeModifiers } : {}),
    faces: revealResult ? faces : null,
    faceSum: revealResult ? roll.faceSum : null,
    total: revealResult ? roll.total : null,
    natural20: revealResult ? roll.natural20 : false,
    natural1: revealResult ? roll.natural1 : false,
    ...(attackTotals ? { attackTotals: revealResult ? attackTotals : null } : {}),
    at,
    revealResult,
  };
}

export function stripHiddenRollForViewer(
  roll: CampaignRollView,
  viewer: { userId: string; isDm: boolean },
): CampaignRollView | null {
  if (!roll.hidden) return roll;
  if (canRevealCampaignRoll({ hidden: roll.hidden, userId: roll.actor.userId }, viewer)) {
    return roll;
  }
  // Non-DM / non-roller still gets a silhouette animation payload (dice only, no faces).
  return {
    ...roll,
    faces: null,
    faceSum: null,
    total: null,
    natural20: false,
    natural1: false,
    attackTotals: null,
    revealResult: false,
  };
}
