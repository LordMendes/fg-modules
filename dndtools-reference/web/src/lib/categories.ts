export const CATEGORIES = [
  { key: "spells", label: "Spells", icon: "✦" },
  { key: "feats", label: "Feats", icon: "⚔" },
  { key: "monsters", label: "Monsters", icon: "🐉" },
  { key: "classes", label: "Classes", icon: "📜" },
  { key: "skills", label: "Skills", icon: "🎯" },
  { key: "races", label: "Races", icon: "👤" },
  { key: "items", label: "Magic Items", icon: "💎" },
  { key: "equipment", label: "Equipment", icon: "🛡" },
  { key: "domains", label: "Domains", icon: "☀" },
  { key: "deities", label: "Deities", icon: "⚜" },
  { key: "psionics", label: "Psionics", icon: "🧠" },
  { key: "templates", label: "Templates", icon: "🔮" },
  { key: "rules", label: "Rules", icon: "📖" },
] as const;

export type CategoryKey = (typeof CATEGORIES)[number]["key"];

export const CATEGORY_KEYS = CATEGORIES.map((c) => c.key);

export function isCategoryKey(value: string): value is CategoryKey {
  return CATEGORY_KEYS.includes(value as CategoryKey);
}

export function getCategoryLabel(key: string): string {
  return CATEGORIES.find((c) => c.key === key)?.label ?? key;
}

export const CATEGORY_ROUTE_MAP: Record<CategoryKey, string> = {
  spells: "spells",
  feats: "feats",
  monsters: "monsters",
  classes: "classes",
  skills: "skills",
  races: "races",
  items: "items",
  equipment: "equipment",
  domains: "domains",
  deities: "deities",
  psionics: "psionics",
  templates: "templates",
  rules: "rules",
};
