import {
  collectModifiers,
  type ItemizedModifier,
  type ModifierPart,
} from "../rules/modifiers";
import type { EffectComponent } from "../types";

export type ActiveEffect = {
  id?: string;
  label: string;
  components: EffectComponent[];
  active?: boolean;
  applyMode?: "all" | "once" | "roll" | "single";
};

export type EffectCollectContext = {
  effects: ActiveEffect[];
};

export type EffectCollectFilter = {
  attackType?: "melee" | "ranged" | "grapple" | "touch" | "mtouch" | "rtouch";
  acType?: "normal" | "touch" | "flat";
  saveType?: "fort" | "ref" | "will";
  saveDescriptor?: string;
  crit?: boolean;
  opportunity?: boolean;
};

type CollectableTag =
  | "ATK"
  | "AC"
  | "SAVE"
  | "FORT"
  | "REF"
  | "WILL"
  | "INIT"
  | "CL"
  | "SKILL"
  | "SPEED";

function isModifierComponent(
  component: EffectComponent,
): component is Extract<
  EffectComponent,
  { tag: CollectableTag; value: number; descriptors: string[] }
> {
  return (
    component.tag === "ATK" ||
    component.tag === "AC" ||
    component.tag === "SAVE" ||
    component.tag === "FORT" ||
    component.tag === "REF" ||
    component.tag === "WILL" ||
    component.tag === "INIT" ||
    component.tag === "CL" ||
    component.tag === "SKILL" ||
    component.tag === "SPEED"
  );
}

function tagMatchesSaveType(tag: CollectableTag, saveType?: "fort" | "ref" | "will"): boolean {
  if (!saveType) return true;
  if (tag === "SAVE") return true;
  if (tag === "FORT") return saveType === "fort";
  if (tag === "REF") return saveType === "ref";
  if (tag === "WILL") return saveType === "will";
  return true;
}

function normalizeAttackType(
  attackType?: EffectCollectFilter["attackType"],
): string | null {
  if (!attackType) return null;
  if (attackType === "mtouch" || attackType === "rtouch") return "touch";
  return attackType;
}

function matchesDescriptors(
  descriptors: string[],
  filter: EffectCollectFilter,
): boolean {
  if (descriptors.length === 0) return true;

  const attackType = normalizeAttackType(filter.attackType);
  const attackDescs = descriptors.filter((d) =>
    ["melee", "ranged", "grapple", "touch"].includes(d),
  );
  if (attackType && attackDescs.length > 0 && !attackDescs.includes(attackType)) {
    return false;
  }

  if (filter.acType === "flat" && descriptors.includes("flatfooted") === false) {
    // flat-footed AC only picks up components tagged flatfooted when acType is flat
    // untagged AC components still apply to all AC types
  }
  if (filter.acType === "touch" && descriptors.includes("touch") === false) {
    // touch-only tagged components apply only to touch; untagged apply everywhere
  }

  const hasCrit = descriptors.includes("crit");
  // Normal attacks skip crit-only components; confirm rolls include them on top of base bonuses.
  if (hasCrit && filter.crit !== true) return false;

  if (filter.opportunity === true && !descriptors.includes("opportunity")) {
    return false;
  }
  if (filter.opportunity === false && descriptors.includes("opportunity")) {
    return false;
  }

  if (filter.saveDescriptor) {
    const vsDesc = descriptors.find((d) => d.startsWith("vs "));
    if (vsDesc) {
      const desc = vsDesc.slice(3).toLowerCase();
      const needle = filter.saveDescriptor.toLowerCase();
      if (!desc.includes(needle) && !needle.includes(desc)) {
        return false;
      }
    }
  }

  return true;
}

function formatPartLabel(effectLabel: string, bonusType?: string): string {
  if (bonusType) {
    return `${effectLabel} (${bonusType})`;
  }
  return effectLabel;
}

/**
 * Collect modifier components for a tag from active effects, apply descriptor filters,
 * then stack with 3.5e bonus rules via modifiers.ts.
 */
export function collect(
  ctx: EffectCollectContext,
  tag: CollectableTag,
  filter: EffectCollectFilter = {},
): ItemizedModifier[] {
  const parts: ModifierPart[] = [];

  for (const effect of ctx.effects) {
    if (effect.active === false) continue;

    for (const component of effect.components) {
      if (!isModifierComponent(component)) continue;
      if (component.tag !== tag) continue;
      if (!tagMatchesSaveType(tag, filter.saveType)) continue;
      if (!matchesDescriptors(component.descriptors, filter)) continue;

      parts.push({
        label: formatPartLabel(effect.label, component.bonusType),
        value: component.value,
        bonusType: component.bonusType,
      });
    }
  }

  return collectModifiers(parts);
}

/** Sum stacked modifiers for a tag. */
export function sumTag(
  ctx: EffectCollectContext,
  tag: CollectableTag,
  filter: EffectCollectFilter = {},
): number {
  return collect(ctx, tag, filter).reduce((sum, m) => sum + m.value, 0);
}
