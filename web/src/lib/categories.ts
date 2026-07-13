export const CATEGORIES = [
  { key: "spells", label: "Spells", count: 5035, icon: "✦" },
  { key: "feats", label: "Feats", count: 3665, icon: "⚔" },
  { key: "monsters", label: "Monsters", count: 807, icon: "🐉" },
  { key: "classes", label: "Classes", count: 1054, icon: "📜" },
  { key: "skills", label: "Skills", count: 80, icon: "🎯" },
  { key: "races", label: "Races", count: 150, icon: "👤" },
  { key: "items", label: "Magic Items", count: 816, icon: "💎" },
  { key: "equipment", label: "Equipment", count: 65, icon: "🛡" },
  { key: "domains", label: "Domains", count: 368, icon: "☀" },
  { key: "deities", label: "Deities", count: 670, icon: "⚜" },
  { key: "psionics", label: "Psionics", count: 703, icon: "🧠" },
  { key: "templates", label: "Templates", count: 155, icon: "🔮" },
  { key: "rules", label: "Rules", count: 273, icon: "📖" },
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
