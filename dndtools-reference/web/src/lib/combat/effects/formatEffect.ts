import type { EffectComponent } from "../types";
import { CONDITION_DISPLAY } from "./grammar";

/**
 * Format parsed components back into a canonical effect string.
 * Example: `Bless; ATK: 1 morale; SAVE: 1 morale vs fear`
 */
export function formatEffect(components: EffectComponent[]): string {
  return components.map(formatComponent).filter(Boolean).join("; ");
}

function formatComponent(component: EffectComponent): string {
  switch (component.tag) {
    case "LABEL":
      return component.text;
    case "COND":
      return CONDITION_DISPLAY[component.condition];
    case "ABIL":
      return `${component.ability.toUpperCase()}: ${formatSigned(component.value)}${formatBonusType(component.bonusType)}`;
    case "ATK":
    case "AC":
    case "SAVE":
    case "FORT":
    case "REF":
    case "WILL":
    case "INIT":
    case "CL":
    case "SKILL":
    case "SPEED":
      return `${component.tag}: ${formatSigned(component.value)}${formatBonusType(component.bonusType)}${formatDescriptors(component.descriptors)}`;
    case "DMG":
      return `DMG: ${formatDamageValue(component)}${formatDamageTypes(component.types)}${formatDescriptors(component.descriptors)}`;
    case "DMGO":
      return `DMGO: ${component.dice}${formatDamageTypes(component.types)}`;
    case "DR":
      return `DR: ${component.amount}${formatBypassTypes(component.bypass)}`;
    case "RESIST":
      return `RESIST: ${component.amount}${formatDamageTypes(component.types)}`;
    case "VULN":
      return `VULN: ${component.types.join(" ")}`;
    case "IMMUNE":
      return `IMMUNE: ${component.types.join(" ")}`;
    case "REGEN":
      return `REGEN: ${component.amount}${formatBypassTypes(component.bypass ?? [])}`;
    case "FHEAL":
      return `FHEAL: ${component.amount}`;
    case "CONC":
    case "TCONC":
    case "COVER":
    case "SCOVER":
      return component.tag;
    default:
      return "";
  }
}

function formatSigned(value: number): string {
  if (value > 0) return String(value);
  return String(value);
}

function formatBonusType(bonusType?: string): string {
  return bonusType ? ` ${bonusType}` : "";
}

function formatDescriptors(descriptors: string[]): string {
  if (descriptors.length === 0) return "";
  return ` ${descriptors.join(" ")}`;
}

function formatDamageValue(component: { dice: string; value: number }): string {
  if (component.dice) return component.dice;
  return String(component.value);
}

function formatDamageTypes(types: string[]): string {
  if (types.length === 0) return "";
  return ` ${types.join(" ")}`;
}

function formatBypassTypes(types: string[]): string {
  if (types.length === 0) return "";
  return ` ${types.join(" ")}`;
}
