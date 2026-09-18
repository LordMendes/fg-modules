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

function relatedClassLevels(entity: EntityDetail): string | null {
  const classLinks = entity.related.filter((r) => r.href.startsWith("/classes/") && r.meta);
  if (classLinks.length === 0) return null;
  const preview = classLinks
    .slice(0, 3)
    .map((r) => `${r.label} (${r.meta})`)
    .join(", ");
  const suffix = classLinks.length > 3 ? ", and others" : "";
  return `On class lists for ${preview}${suffix}.`;
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
