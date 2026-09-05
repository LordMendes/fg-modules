/** Supported polyhedral die sides (matches @3d-dice/dice-box). */
export type DieSides = 4 | 6 | 8 | 10 | 12 | 20 | 100;

export type DicePoolItem = {
  qty: number;
  sides: DieSides;
  /** Optional tint for dice-box color themes (per group). */
  themeColor?: string;
};

export type RollKind =
  | "attack"
  | "damage"
  | "save"
  | "skill"
  | "initiative"
  | "cast"
  | "spell"
  | "hitDie"
  | "tray"
  | "ability"
  | "other";

export type RollActor = {
  userId: string;
  username: string;
  characterName?: string | null;
};

export type RollRequest = {
  id: string;
  label: string;
  dice: DicePoolItem[];
  modifier: number;
  /** Per-die bonuses for a full iterative attack (one d20 each). */
  iterativeModifiers?: number[];
  kind?: RollKind;
  hidden?: boolean;
  actor?: RollActor;
  /** When set, dice-box may try to land on these faces. The log still uses engine output unless sharedResult is applied by the provider. */
  faces?: number[];
  /**
   * Campaign-only: show silhouette (unreadable faces) for this viewer.
   * Still animates dice; skips log entry.
   */
  silhouetteOnly?: boolean;
};

export type RollResult = {
  id: string;
  label: string;
  faces: number[];
  faceSum: number;
  modifier: number;
  total: number;
  natural20: boolean;
  natural1: boolean;
  at: number;
  /** Per-attack totals when rolling iterative BAB attacks together. */
  attackTotals?: number[];
  kind?: RollKind;
  hidden?: boolean;
  actor?: RollActor;
  /** True when this client should not show totals in the log. */
  silhouetteOnly?: boolean;
};

export type DiceSkin = {
  id: string;
  label: string;
  /** dice-box theme system name under public/dice-box/themes/ */
  engineTheme: string;
  /** Default hex tint for color themes */
  themeColor: string;
};

export const DIE_SIDES: DieSides[] = [4, 6, 8, 10, 12, 20, 100];

export const ROLL_KIND_LABELS: Record<RollKind, string> = {
  attack: "Atk",
  damage: "Dmg",
  save: "Save",
  skill: "Skill",
  initiative: "Init",
  cast: "Cast",
  spell: "Spell",
  hitDie: "HD",
  tray: "Tray",
  ability: "Ability",
  other: "Roll",
};
