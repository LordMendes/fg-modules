import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseAbilityMods, parseRaceFeatures, parseRacialSkillPointBonus } from "./parseRaceFeatures";

describe("parseAbilityMods", () => {
  it("parses em-dash negative modifiers", () => {
    const mods = parseAbilityMods("+2 Dexterity, —2 Constitution");
    assert.equal(mods.dex, 2);
    assert.equal(mods.con, -2);
  });

  it("parses unicode minus signs", () => {
    const mods = parseAbilityMods("−2 Wisdom, –2 Charisma");
    assert.equal(mods.wis, -2);
    assert.equal(mods.cha, -2);
  });
});

describe("parseRacialSkillPointBonus", () => {
  it("parses human-style extra skill points", () => {
    const bonus = parseRacialSkillPointBonus(
      "4 extra skill points at 1st level and 1 extra skill point at each additional level, since humans are versatile and capable.",
    );
    assert.deepEqual(bonus, { firstLevel: 4, perAdditionalLevel: 1 });
  });
});

describe("parseRaceFeatures", () => {
  it("extracts human skill point bonus", () => {
    const features = parseRaceFeatures({
      size: "Medium",
      speed: "30 ft.",
      descriptionText:
        "4 extra skill points at 1st level and 1 extra skill point at each additional level, since humans are versatile and capable.",
    });

    assert.deepEqual(features.skillPointBonus, { firstLevel: 4, perAdditionalLevel: 1 });
  });

  it("extracts elf-style ability and skill bonuses", () => {
    const features = parseRaceFeatures({
      size: "Medium",
      speed: "30 ft.",
      descriptionText:
        "Racial Traits\n+2 Dexterity, —2 Constitution\n+2 racial bonus on Listen, Search, and Spot checks.",
    });

    assert.equal(features.abilityMods.dex, 2);
    assert.equal(features.abilityMods.con, -2);
    assert.ok(features.skillBonuses.listen >= 2 || features.skillBonuses.search >= 2);
    assert.equal(features.speedUnhinderedByEncumbrance, false);
  });

  it("detects dwarf-style speed unhindered by armor or load", () => {
    const features = parseRaceFeatures({
      size: "Medium",
      speed: "20 ft.",
      descriptionText:
        "Dwarf base land speed is 20 feet. However, dwarves can move at this speed even when wearing medium or heavy armor or when carrying a medium or heavy load.",
    });
    assert.equal(features.speed, 20);
    assert.equal(features.speedUnhinderedByEncumbrance, true);
  });

  it("reads Player's Guide lesser races", () => {
    const path = join(
      dirname(fileURLToPath(import.meta.url)),
      "../../../../data/dndtools/supplemental/pg_lesser_planetouched.json",
    );
    const records = JSON.parse(readFileSync(path, "utf8")) as Array<{
      name: string;
      size: string;
      speed: string;
      description_text: string;
    }>;
    const byName = new Map(records.map((rec) => [rec.name, rec]));

    const gray = parseRaceFeatures({
      size: byName.get("Lesser Gray Dwarf")?.size,
      speed: byName.get("Lesser Gray Dwarf")?.speed,
      descriptionText: byName.get("Lesser Gray Dwarf")?.description_text,
    });
    assert.equal(gray.abilityMods.con, 2);
    assert.equal(gray.abilityMods.cha, -4);
    assert.equal(gray.speed, 20);
    assert.equal(gray.speedUnhinderedByEncumbrance, true);
    assert.equal(gray.senses.darkvisionFeet, 60);
    assert.equal(gray.skillBonuses.hide, 2);
    assert.equal(gray.skillBonuses["move silently"], 2);
    assert.equal(gray.dodgeBonus ?? 0, 0);

    const drow = parseRaceFeatures({
      size: byName.get("Lesser Drow")?.size,
      speed: byName.get("Lesser Drow")?.speed,
      descriptionText: byName.get("Lesser Drow")?.description_text,
    });
    assert.equal(drow.abilityMods.dex, 2);
    assert.equal(drow.abilityMods.con, -2);
    assert.equal(drow.saveBonus.will, 2);
    assert.equal(drow.senses.lowLight, false);
    assert.equal(drow.skillBonuses.listen, 2);

    const gnome = parseRaceFeatures({
      size: byName.get("Lesser Deep Gnome")?.size,
      speed: byName.get("Lesser Deep Gnome")?.speed,
      descriptionText: byName.get("Lesser Deep Gnome")?.description_text,
    });
    assert.equal(gnome.abilityMods.str, -2);
    assert.equal(gnome.abilityMods.dex, 2);
    assert.equal(gnome.sizeMod, 1);
    assert.equal(gnome.dodgeBonus, 1);
    assert.equal(gnome.saveBonus.fort, 2);
    assert.equal(gnome.saveBonus.ref, 2);
    assert.equal(gnome.saveBonus.will, 2);
    assert.equal(gnome.senses.lowLight, true);
    assert.equal(gnome.senses.darkvisionFeet, 60);
  });
});
