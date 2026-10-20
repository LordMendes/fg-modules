import type { SeededRng } from "@/lib/random-spellbook/seeded-rng";
import type { SpellRef, TrapResult } from "./types";

const MECHANICAL_TRAP_NAMES = [
  "Pit with hinged lid",
  "Crossbow tripwire",
  "Falling block corridor",
  "Poison needle lock",
  "Rolling stone ramp",
  "Spiked portcullis drop",
  "Bear trap floor plate",
  "Swinging log passage",
  "Collapsing ceiling brace",
  "Hidden blade slit",
  "Snare wire noose",
  "Crushing wall slider",
] as const;

const MAGIC_TRAP_NAMES = [
  "Glyph of warding niche",
  "Fire rune threshold",
  "Frost sigil floor",
  "Shocking ward door",
  "Sleep glyph arch",
  "Telekinetic ward chest",
  "Magic missile turret",
  "Force cage trigger",
  "Dispel magic snare",
  "Lightning rune stair",
  "Hold portal seal",
  "Scrying alarm plate",
] as const;

const TRIGGERS = [
  "Stepping on a floor plate",
  "Opening the door",
  "Touching the object",
  "Crossing a tripwire",
  "Failing to speak the passphrase",
  "Removing weight from a pedestal",
] as const;

const BYPASSES = [
  "Disarm the mechanism with Disable Device",
  "Avoid the marked tiles",
  "Speak the command word carved nearby",
  "Destroy the sensor before triggering",
  "Use a ten-foot pole from safe range",
  "Trigger deliberately from cover",
] as const;

const RIDERS = [
  "plus poison (1 Con damage, DC 10 + CR)",
  "plus a 10-foot pit",
  "plus entangled for 1 round (Reflex negates)",
] as const;

export type RollTrapOptions = {
  spell?: SpellRef;
};

function trapDamageExpression(cr: number, rng: SeededRng): string {
  if (cr <= 5) {
    return `${cr}d6`;
  }
  const dice = Math.floor(cr / 2);
  const rider = rng.pick([...RIDERS]) ?? RIDERS[0]!;
  return `${dice}d6 ${rider}`;
};

export function rollTrap(
  cr: number,
  rng: SeededRng,
  options?: RollTrapOptions,
): TrapResult {
  const clampedCr = Math.min(20, Math.max(1, Math.round(cr)));
  const isMagic = clampedCr % 2 === 1;
  const searchDc = 15 + clampedCr + rng.pickInt(0, 4);
  const disableDeviceDc = isMagic ? searchDc + 2 : searchDc;
  const useAttack = rng.next() < 0.5;
  const attackOrSave = useAttack
    ? `Attack +${clampedCr} melee`
    : `Reflex DC ${10 + clampedCr + 2} half`;
  const damageExpression = trapDamageExpression(clampedCr, rng);
  const dicePart = damageExpression.split(" ")[0]!;
  const diceMatch = dicePart.match(/^(\d+)d(\d+)$/);
  let exampleDamage = clampedCr * 3;
  if (diceMatch) {
    const rolls = Number.parseInt(diceMatch[1]!, 10);
    const sides = Number.parseInt(diceMatch[2]!, 10);
    let total = 0;
    for (let i = 0; i < rolls; i++) {
      total += rng.pickInt(1, sides);
    }
    exampleDamage = total;
  }

  const namePool = isMagic ? MAGIC_TRAP_NAMES : MECHANICAL_TRAP_NAMES;
  const name = rng.pick([...namePool]) ?? namePool[0]!;

  let spellEffect: string | undefined;
  let spellHref: string | undefined;
  if (isMagic) {
    const spell = options?.spell;
    if (spell) {
      spellEffect = `Spell effect: ${spell.name}`;
      spellHref = `/spells/${spell.slug}`;
    } else {
      spellEffect = "Spell effect (see DMG magic trap guidelines)";
    }
  }

  return {
    kind: "trap",
    name,
    cr: clampedCr,
    searchDc,
    disableDeviceDc,
    trigger: rng.pick([...TRIGGERS]) ?? TRIGGERS[0]!,
    attackOrSave,
    damageExpression,
    exampleDamage,
    bypass: rng.pick([...BYPASSES]) ?? BYPASSES[0]!,
    isMagic,
    spellEffect,
    spellHref,
  };
}
