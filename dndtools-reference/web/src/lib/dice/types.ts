/** Supported polyhedral die sides (matches @3d-dice/dice-box). */
export type DieSides = 4 | 6 | 8 | 10 | 12 | 20 | 100;

export type DicePoolItem = {
  qty: number;
  sides: DieSides;
};

export type RollRequest = {
  id: string;
  label: string;
  dice: DicePoolItem[];
  modifier: number;
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
