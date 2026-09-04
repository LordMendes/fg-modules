import { getClassCastingInfo } from "./classCasting";
import type { PcPlanState } from "./types";

export function createDefaultPcPlanState(name = "Unnamed"): PcPlanState {
  const wizardInfo = getClassCastingInfo("wizard", "Wizard")!;
  return {
    identity: {
      name,
      race: "",
      raceSlug: null,
      alignment: "Neutral",
      classLevels: [{ classSlug: "wizard", className: "Wizard", level: 1 }],
      firstClassSlug: "wizard",
      deity: "",
      deitySlug: null,
      domains: [],
      specialistSchool: null,
    },
    abilities: {
      str: 10,
      dex: 10,
      con: 10,
      int: 10,
      wis: 10,
      cha: 10,
    },
    abilityBase: {
      str: 10,
      dex: 10,
      con: 10,
      int: 10,
      wis: 10,
      cha: 10,
    },
    feats: [],
    spellClasses: [
      {
        label: "Wizard",
        classSlug: "wizard",
        casterLevel: 1,
        dcAbility: wizardInfo.dcAbility,
        mode: "preparation",
        spells: [],
      },
    ],
    skills: [],
    combat: {
      sizeMod: 0,
      meleeMisc: 0,
      rangedMisc: 0,
      grappleMisc: 0,
      fortMisc: 0,
      refMisc: 0,
      willMisc: 0,
      initMisc: 0,
      armor: 0,
      shield: 0,
      natural: 0,
      deflection: 0,
      dodge: 0,
      acMisc: 0,
      speedBase: 30,
      speedArmor: 0,
      speedMisc: 0,
      srBase: 0,
      srMisc: 0,
      attacks: "",
    },
    hitPoints: { rolls: [] },
    inventory: [],
    notes: "",
  };
}
