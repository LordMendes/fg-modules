import type { CategoryKey } from "@/lib/categories";
import { getCategoryLabel } from "@/lib/categories";
import type { EntityDetail } from "@/lib/entities";

function joinParts(parts: (string | null | undefined)[]): string {
  return parts
    .filter(Boolean)
    .map((part) => {
      const text = String(part).trim();
      return text.endsWith(".") || text.endsWith("…") ? text : `${text}.`;
    })
    .join(" ");
}

function statLine(parts: (string | null | undefined)[], separator = ", "): string | null {
  const text = parts.filter(Boolean).join(separator);
  return text || null;
}

function sourcePhrase(abbrev: string | null, page: number | null): string | null {
  if (!abbrev) return null;
  return page ? `from ${abbrev}, p. ${page}` : `from ${abbrev}`;
}

/** "Wizard (Level 3), Sorcerer (Level 3)" from related class links, or null. */
function classLevelPhrase(entity: EntityDetail): string | null {
  const classLinks = entity.related.filter((r) => r.href.startsWith("/classes/") && r.meta);
  if (classLinks.length === 0) return null;
  const preview = classLinks
    .slice(0, 3)
    .map((r) => `${r.label} (${r.meta})`)
    .join(", ");
  const suffix = classLinks.length > 3 ? ", and others" : "";
  return `${preview}${suffix}`;
}

function relatedClassLevels(entity: EntityDetail): string | null {
  const phrase = classLevelPhrase(entity);
  return phrase ? `On class lists for ${phrase}.` : null;
}

function truncateDescription(text: string, max = 200): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

export function buildEntityLead(
  category: CategoryKey,
  entity: EntityDetail,
): string | null {
  const label = getCategoryLabel(category);
  const source = sourcePhrase(entity.source.abbrev, entity.source.page);

  switch (category) {
    case "spells": {
      const school = entity.fields.School;
      const range = entity.fields.Range ?? entity.fields.Area ?? entity.fields.Target;
      const save = entity.fields["Saving Throw"];
      const duration = entity.fields.Duration;
      const casting = entity.fields["Casting Time"];
      return joinParts([
        `${entity.name} is a D&D 3.5 spell${school ? ` (${school})` : ""}${source ? ` ${source}` : ""}.`,
        relatedClassLevels(entity),
        statLine(
          [
            range ? `Range or area: ${range}` : null,
            save ? `Saving throw: ${save}` : null,
            duration ? `Duration: ${duration}` : null,
            casting ? `Casting time: ${casting}` : null,
          ],
          "; ",
        ),
      ]);
    }
    case "monsters": {
      const cr = entity.fields["Challenge Rating"];
      const type = entity.fields.Type;
      const size = entity.fields.Size;
      const hd = entity.fields["Hit Dice"];
      return joinParts([
        `${entity.name} is a D&D 3.5 monster${source ? ` ${source}` : ""}.`,
        statLine([
          size && type ? `${size} ${type}` : type ?? size,
          cr ? `CR ${cr}` : null,
          hd ? `HD ${hd}` : null,
        ]),
      ]);
    }
    case "feats": {
      const featType = entity.statLine ?? (entity.fields.Type ? `${entity.fields.Type} feat` : null);
      return joinParts([
        `${entity.name} is a D&D 3.5 feat${featType ? ` (${featType.replace(/ feat$/i, "")})` : ""}${source ? ` ${source}` : ""}.`,
        entity.descriptionText ? truncateDescription(entity.descriptionText) : null,
      ]);
    }
    case "classes": {
      const hitDie = entity.fields["Hit Die"];
      const skillPoints = entity.fields["Skill Points"];
      const spellNote =
        entity.spellLevels && entity.spellLevels.length > 0
          ? `Casts spells across ${entity.spellLevels.length} spell levels.`
          : null;
      return joinParts([
        `${entity.name} is a D&D 3.5 character class${source ? ` ${source}` : ""}.`,
        statLine([
          hitDie ? `Hit die ${hitDie}` : null,
          skillPoints ? `${skillPoints} skill points per level` : null,
        ], "; "),
        spellNote,
      ]);
    }
    case "skills": {
      const ability = entity.fields["Key Ability"];
      const trained = entity.fields["Trained Only"];
      return joinParts([
        `${entity.name} is a D&D 3.5 skill${source ? ` ${source}` : ""}.`,
        statLine([
          ability ? `Key ability: ${ability}` : null,
          trained ? `Trained only: ${trained}` : null,
        ], "; "),
      ]);
    }
    case "races": {
      const size = entity.fields.Size;
      const type = entity.fields.Type;
      const la = entity.fields["Level Adjustment"];
      return joinParts([
        `${entity.name} is a D&D 3.5 player race${source ? ` ${source}` : ""}.`,
        statLine([
          size && type ? `${size} ${type}` : type ?? size,
          la ? `Level adjustment ${la}` : null,
        ]),
      ]);
    }
    case "items": {
      const itemType = entity.fields.Type;
      const price = entity.fields.Price;
      const cl = entity.fields["Caster Level"];
      return joinParts([
        `${entity.name} is a D&D 3.5 magic item${itemType ? ` (${itemType})` : ""}${source ? ` ${source}` : ""}.`,
        statLine([price ? `Price ${price}` : null, cl ? `Caster level ${cl}` : null], "; "),
      ]);
    }
    case "equipment": {
      const cost = entity.fields.Cost ?? entity.fields.Price;
      const weight = entity.fields.Weight;
      return joinParts([
        `${entity.name} is D&D 3.5 equipment${source ? ` ${source}` : ""}.`,
        statLine([cost ? `Cost ${cost}` : null, weight ? `Weight ${weight}` : null], "; "),
      ]);
    }
    case "domains": {
      const domainType = entity.fields.Type;
      const spellCount = entity.related.length;
      return joinParts([
        `${entity.name} is a D&D 3.5 cleric domain${domainType ? ` (${domainType})` : ""}${source ? ` ${source}` : ""}.`,
        spellCount > 0 ? `Includes ${spellCount} domain spells.` : null,
      ]);
    }
    case "deities": {
      const alignment = entity.fields.Alignment;
      const pantheon = entity.fields.Pantheon;
      return joinParts([
        `${entity.name} is a D&D 3.5 deity${source ? ` ${source}` : ""}.`,
        statLine([
          alignment ? `Alignment ${alignment}` : null,
          pantheon ? `Pantheon ${pantheon}` : null,
        ], "; "),
      ]);
    }
    case "psionics": {
      const discipline = entity.fields.Discipline;
      const pp = entity.fields["Power Points"];
      return joinParts([
        `${entity.name} is a D&D 3.5 psionic power${discipline ? ` (${discipline})` : ""}${source ? ` ${source}` : ""}.`,
        pp ? `Power points: ${pp}.` : null,
        relatedClassLevels(entity),
      ]);
    }
    case "templates": {
      const crChange = entity.fields["CR Change"];
      const la = entity.fields["Level Adjustment"];
      return joinParts([
        `${entity.name} is a D&D 3.5 creature template${source ? ` ${source}` : ""}.`,
        statLine([
          crChange ? `CR change ${crChange}` : null,
          la ? `Level adjustment ${la}` : null,
        ], "; "),
        entity.related.length > 0 ? `${entity.related.length} sample creatures listed.` : null,
      ]);
    }
    case "rules": {
      const ruleCategory = entity.fields.Category;
      const sub = entity.fields.Subcategory;
      return joinParts([
        `${entity.name} is a D&D 3.5 rule entry${source ? ` ${source}` : ""}.`,
        statLine([
          ruleCategory ? `Category: ${ruleCategory}` : null,
          sub ? `Subcategory: ${sub}` : null,
        ], "; "),
      ]);
    }
    default:
      return `${entity.name} is a D&D 3.5 ${label.toLowerCase()} reference entry${source ? ` ${source}` : ""}.`;
  }
}

export type EntityFaq = {
  question: string;
  answer: string;
};

export type EntityKeyFact = {
  name: string;
  value: string;
};

/** Upper bound on quick-answer pairs per entry, keeps the on-page block short. */
const MAX_ENTITY_FAQS = 3;

/** Stat fields that describe an entry in structured data, in display order. */
const KEY_FACT_LABELS: Partial<Record<CategoryKey, string[]>> = {
  spells: ["School", "Level", "Range", "Area", "Target", "Saving Throw", "Duration", "Casting Time"],
  monsters: ["Challenge Rating", "Size", "Type", "Hit Dice"],
  feats: ["Type"],
  classes: ["Hit Die", "Skill Points"],
  skills: ["Key Ability", "Trained Only"],
  races: ["Size", "Type", "Level Adjustment"],
  items: ["Type", "Price", "Caster Level"],
  equipment: ["Cost", "Price", "Weight"],
  domains: ["Type"],
  deities: ["Alignment", "Pantheon"],
  psionics: ["Discipline", "Power Points"],
  templates: ["CR Change", "Level Adjustment"],
  rules: ["Category", "Subcategory"],
};

/** Non-empty key stat fields for JSON-LD additionalProperty. */
export function buildEntityKeyFacts(category: CategoryKey, entity: EntityDetail): EntityKeyFact[] {
  const facts: EntityKeyFact[] = [];
  for (const label of KEY_FACT_LABELS[category] ?? []) {
    const value = entity.fields[label];
    if (value) facts.push({ name: label, value });
  }
  return facts;
}

function trainedOnlyAnswer(name: string, value: string): string {
  const normalized = value.trim().toLowerCase();
  if (normalized.startsWith("yes") || normalized === "true") {
    return `No. ${name} can only be used by trained characters.`;
  }
  if (normalized.startsWith("no") || normalized === "false") {
    return `Yes. ${name} can be used untrained.`;
  }
  return `${name} trained only: ${value}.`;
}

function listWithOverflow(names: string[], total: number): string {
  const suffix = total > names.length ? `, and ${total - names.length} more` : "";
  return `${names.join(", ")}${suffix}`;
}

/**
 * Question-and-answer pairs built from stat fields, class links, and the source
 * line. Answers never copy book prose, so they stay short and original.
 */
export function buildEntityFaqs(category: CategoryKey, entity: EntityDetail): EntityFaq[] {
  const name = entity.name;
  const f = entity.fields;
  const faqs: EntityFaq[] = [];
  const add = (question: string, answer: string) => {
    faqs.push({ question, answer });
  };

  switch (category) {
    case "spells": {
      const classes = classLevelPhrase(entity);
      if (classes) {
        add(`Which classes can cast ${name}?`, `${name} appears on the spell lists for ${classes}.`);
      }
      const range = f.Range || f.Area || f.Target;
      if (range) add(`What is the range of ${name}?`, `The range or area of ${name} is ${range}.`);
      const save = f["Saving Throw"];
      if (save) add(`What saving throw does ${name} allow?`, `The saving throw for ${name} is ${save}.`);
      const duration = f.Duration;
      if (duration) add(`How long does ${name} last?`, `The duration of ${name} is ${duration}.`);
      break;
    }
    case "monsters": {
      const cr = f["Challenge Rating"];
      if (cr) add(`What is the challenge rating of ${name}?`, `${name} has a challenge rating of ${cr}.`);
      const sizeType = [f.Size, f.Type].filter(Boolean).join(" ");
      if (sizeType) add(`What type of creature is ${name}?`, `${name} is categorized as ${sizeType}.`);
      const hitDice = f["Hit Dice"];
      if (hitDice) add(`How many hit dice does ${name} have?`, `${name} has ${hitDice} hit dice.`);
      break;
    }
    case "feats": {
      const type = f.Type;
      if (type) add(`What type of feat is ${name}?`, `The feat type for ${name} is ${type}.`);
      break;
    }
    case "classes": {
      const hitDie = f["Hit Die"];
      if (hitDie) add(`What is the hit die for ${name}?`, `The hit die for ${name} is ${hitDie}.`);
      const skillPoints = f["Skill Points"];
      if (skillPoints) {
        add(`How many skill points per level does ${name} get?`, `${name} gets ${skillPoints} skill points per level.`);
      }
      if (entity.spellLevels && entity.spellLevels.length > 0) {
        add(
          `Does ${name} cast spells?`,
          `Yes. ${name} casts spells across ${entity.spellLevels.length} spell levels.`,
        );
      }
      break;
    }
    case "skills": {
      const ability = f["Key Ability"];
      if (ability) add(`Which ability is used for ${name}?`, `${name} uses ${ability} as its key ability.`);
      const trained = f["Trained Only"];
      if (trained) add(`Can ${name} be used untrained?`, trainedOnlyAnswer(name, trained));
      break;
    }
    case "races": {
      const sizeType = [f.Size, f.Type].filter(Boolean).join(" ");
      if (sizeType) add(`What size and type is ${name}?`, `${name} is categorized as ${sizeType}.`);
      const levelAdjustment = f["Level Adjustment"];
      if (levelAdjustment) {
        add(`What is the level adjustment for ${name}?`, `The level adjustment for ${name} is ${levelAdjustment}.`);
      }
      break;
    }
    case "items": {
      const itemType = f.Type;
      if (itemType) add(`What type of magic item is ${name}?`, `The item type for ${name} is ${itemType}.`);
      const price = f.Price;
      if (price) add(`What is the price of ${name}?`, `The market price of ${name} is ${price}.`);
      const casterLevel = f["Caster Level"];
      if (casterLevel) add(`What caster level is ${name}?`, `The caster level for ${name} is ${casterLevel}.`);
      break;
    }
    case "equipment": {
      const cost = f.Cost || f.Price;
      if (cost) add(`How much does ${name} cost?`, `${name} costs ${cost}.`);
      const weight = f.Weight;
      if (weight) add(`How much does ${name} weigh?`, `${name} weighs ${weight}.`);
      break;
    }
    case "domains": {
      const type = f.Type;
      if (type) add(`What type of domain is ${name}?`, `The domain type for ${name} is ${type}.`);
      const listed = entity.related.slice(0, 5).map((r) => r.label);
      if (listed.length > 0) {
        add(
          `Which spells are listed for the ${name} domain?`,
          `The ${name} domain lists ${listWithOverflow(listed, entity.related.length)}.`,
        );
      }
      break;
    }
    case "deities": {
      const alignment = f.Alignment;
      if (alignment) add(`What is the alignment of ${name}?`, `The alignment of ${name} is ${alignment}.`);
      const pantheon = f.Pantheon;
      if (pantheon) add(`Which pantheon is ${name} in?`, `${name} belongs to the ${pantheon} pantheon.`);
      break;
    }
    case "psionics": {
      const discipline = f.Discipline;
      if (discipline) add(`What discipline is ${name}?`, `The discipline for ${name} is ${discipline}.`);
      const powerPoints = f["Power Points"];
      if (powerPoints) add(`How many power points does ${name} cost?`, `${name} costs ${powerPoints} power points.`);
      const classes = classLevelPhrase(entity);
      if (classes) add(`Which classes can use ${name}?`, `${name} is available to ${classes}.`);
      break;
    }
    case "templates": {
      const crChange = f["CR Change"];
      if (crChange) add(`How does the ${name} template change CR?`, `The ${name} template changes CR by ${crChange}.`);
      const levelAdjustment = f["Level Adjustment"];
      if (levelAdjustment) {
        add(`What is the level adjustment of ${name}?`, `The level adjustment for ${name} is ${levelAdjustment}.`);
      }
      break;
    }
    case "rules": {
      const ruleCategory = f.Category;
      const sub = f.Subcategory;
      if (ruleCategory) {
        add(
          `Which category does ${name} belong to?`,
          sub
            ? `${name} is in the ${ruleCategory} category, under ${sub}.`
            : `${name} is in the ${ruleCategory} category.`,
        );
      }
      break;
    }
    default:
      break;
  }

  if (entity.source.name) {
    const abbrev = entity.source.abbrev ? ` (${entity.source.abbrev})` : "";
    const page = entity.source.page ? `, page ${entity.source.page}` : "";
    add(`Which source covers ${name}?`, `${name} is covered in ${entity.source.name}${abbrev}${page}.`);
  }

  return faqs.slice(0, MAX_ENTITY_FAQS);
}
