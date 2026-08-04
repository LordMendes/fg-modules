import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { parseClassProficiencies, parseRacialProficiencies } from "./parseClassFeatures";

const dataRoot = join(dirname(fileURLToPath(import.meta.url)), "../../../../data/dndtools");

function loadJson<T>(filename: string): T[] {
  return JSON.parse(readFileSync(join(dataRoot, filename), "utf8")) as T[];
}

describe("parseClassProficiencies", () => {
  it("parses dndtools header-on-next-line format", () => {
    const text =
      "All of the following are class features of the fighter.\nWeapon and Armor Proficiency\n: A fighter is proficient with all simple and martial weapons and with all armor (heavy, medium, and light) and shields (including tower shields).\nBonus Feats\n: At 1st level, a fighter gets a bonus combat-oriented feat.";
    const results = parseClassProficiencies(text);
    assert.equal(results.length, 1);
    assert.match(results[0], /proficient with all simple and martial weapons/i);
  });

  it("parses header-colon-then-body format", () => {
    const text =
      "Weapon and Armor Proficiency:\nWizards are proficient with the club, dagger, heavy crossbow, light crossbow, and quarterstaff, but not with any type of armor or shield.\nSpells:";
    const results = parseClassProficiencies(text);
    assert.equal(results.length, 1);
    assert.match(results[0], /proficient with the club/i);
  });

  it("loads fighter and paladin proficiencies from compendium data", () => {
    const classes = loadJson<{ slug: string; description_text?: string }>("classes.json");
    const fighter = classes.find((row) => row.slug === "fighter-93");
    const paladin = classes.find((row) => row.slug === "paladin-95");

    assert.ok(parseClassProficiencies(fighter?.description_text).length > 0);
    assert.ok(parseClassProficiencies(paladin?.description_text).length > 0);
  });
});

describe("parseRacialProficiencies", () => {
  it("parses elf weapon proficiency", () => {
    const text =
      "Weapon Proficiency: Elves receive the Martial Weapon Proficiency feats for the longsword, rapier, longbow (including composite longbow), and shortbow (including composite shortbow) as bonus feats.";
    const results = parseRacialProficiencies(text);
    assert.equal(results.length, 1);
    assert.match(results[0], /longsword, rapier/i);
  });

  it("parses dwarf weapon familiarity", () => {
    const text =
      "Weapon Familiarity: Dwarves may treat dwarven waraxes and dwarven urgroshes (see Chapter 7:Equipment) as martial weapons, rather than exotic weapons.";
    const results = parseRacialProficiencies(text);
    assert.equal(results.length, 1);
    assert.match(results[0], /dwarven waraxes/i);
  });

  it("parses proficient-with trait lines", () => {
    const text =
      "Proficient with trident, longspear, and net. This replaces the standard elven proficiency with longsword, rapier, and bow.";
    const results = parseRacialProficiencies(text);
    assert.equal(results.length, 1);
    assert.match(results[0], /Proficient with trident/i);
  });
});
