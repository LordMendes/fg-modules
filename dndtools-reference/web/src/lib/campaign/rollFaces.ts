import type { DicePoolItem, DieSides } from "@/lib/dice/types";

function randomFace(sides: DieSides): number {
  return 1 + Math.floor(Math.random() * sides);
}

/**
 * Server-authoritative face generation for campaign rolls.
 * Expands each pool item into individual face values in pool order.
 */
export function rollFaces(dice: DicePoolItem[]): number[] {
  const faces: number[] = [];
  for (const item of dice) {
    for (let i = 0; i < item.qty; i++) {
      faces.push(randomFace(item.sides));
    }
  }
  return faces;
}

export function computeRollTotals(input: {
  faces: number[];
  modifier: number;
  iterativeModifiers?: number[];
  dice: DicePoolItem[];
}): {
  faceSum: number;
  total: number;
  natural20: boolean;
  natural1: boolean;
  attackTotals?: number[];
} {
  const faceSum = input.faces.reduce((sum, n) => sum + n, 0);
  const iterative = input.iterativeModifiers;
  if (iterative && iterative.length > 0 && input.faces.length > 0) {
    const attackTotals = input.faces.map(
      (face, i) => face + (iterative[i] ?? iterative[iterative.length - 1] ?? 0),
    );
    return {
      faceSum,
      total: attackTotals[0] ?? faceSum,
      natural20: input.faces.includes(20),
      natural1: input.faces.includes(1),
      attackTotals,
    };
  }

  const total = faceSum + input.modifier;
  const isSingleD20 =
    input.dice.length === 1 &&
    input.dice[0]!.sides === 20 &&
    input.dice[0]!.qty === 1 &&
    input.faces.length === 1;

  return {
    faceSum,
    total,
    natural20: isSingleD20 && input.faces[0] === 20,
    natural1: isSingleD20 && input.faces[0] === 1,
  };
}
