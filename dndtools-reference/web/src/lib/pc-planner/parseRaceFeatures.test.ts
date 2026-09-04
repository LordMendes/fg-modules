import assert from "node:assert/strict";
import { describe, it } from "node:test";
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
});
