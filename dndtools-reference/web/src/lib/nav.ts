import { CATEGORIES, type CategoryKey } from "@/lib/categories";

export type NavLink = {
  key: string;
  label: string;
  href: string;
};

export type BrowseNavItem = NavLink & {
  child?: NavLink;
  children?: NavLink[];
};

export type BrowseGroup = {
  label: string;
  description: string;
  items: BrowseNavItem[];
};

export const PRIMARY_NAV = [
  { key: "tools", label: "Tools", href: "/tools" },
  { key: "sources", label: "Sources", href: "/sources" },
  { key: "goods", label: "Goods", href: "/stores/goods" },
] as const;

export const GOODS_LINK = {
  key: "goods",
  label: "Goods & Services",
  href: "/stores/goods",
  icon: "🏪",
  description:
    "Adventuring gear, mounts, vehicles, buildings, hirelings, and environment-specific equipment.",
};

export const HOME_GAME_TOOLS_SECTION = {
  label: "Game Tools",
  description:
    "Interactive calculators and builders for encounters, characters, strongholds, and more.",
};

export const FLAWS_LINK: NavLink = {
  key: "flaws",
  label: "Flaws",
  href: "/feats?type=Flaw",
};

export const EQUIPMENT_WEAPONS_LINK: NavLink = {
  key: "equipment-weapons",
  label: "Weapons",
  href: "/equipment?kind=weapon",
};

export const EQUIPMENT_ARMOR_LINK: NavLink = {
  key: "equipment-armor",
  label: "Armor & Shields",
  href: "/equipment?kind=armor",
};

const CORE_KEYS: CategoryKey[] = [
  "spells",
  "feats",
  "monsters",
  "classes",
  "skills",
  "races",
];
const GEAR_KEYS: CategoryKey[] = ["items", "equipment"];
const WORLD_KEYS: CategoryKey[] = [
  "domains",
  "deities",
  "psionics",
  "templates",
  "rules",
];

function categoryToLink(key: CategoryKey): BrowseNavItem {
  const cat = CATEGORIES.find((c) => c.key === key)!;
  const link: BrowseNavItem = {
    key: cat.key,
    label: cat.label,
    href: `/${cat.key}`,
  };
  if (key === "feats") {
    link.child = FLAWS_LINK;
  }
  if (key === "equipment") {
    link.children = [EQUIPMENT_WEAPONS_LINK, EQUIPMENT_ARMOR_LINK];
  }
  return link;
}

export function browseItemChildLinks(item: BrowseNavItem): NavLink[] {
  if (item.children?.length) return item.children;
  if (item.child) return [item.child];
  return [];
}

export const BROWSE_GROUPS: BrowseGroup[] = [
  {
    label: "Core",
    description: "Spells, feats, monsters, and the building blocks of every character.",
    items: CORE_KEYS.map(categoryToLink),
  },
  {
    label: "Gear",
    description:
      "Magic items, arms, armor, adventuring equipment, and goods & services catalogs.",
    items: GEAR_KEYS.map(categoryToLink),
  },
  {
    label: "World",
    description: "Domains, deities, psionics, templates, and reference rules.",
    items: WORLD_KEYS.map(categoryToLink),
  },
];

export function isPrimaryNavActive(href: string, pathname: string): boolean {
  if (href === "/stores/goods") {
    return pathname === "/stores/goods" || pathname.startsWith("/stores/goods/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isBrowseActive(
  pathname: string,
  searchParams: URLSearchParams,
): boolean {
  if (pathname.startsWith("/feats") && searchParams.get("type") === "Flaw") {
    return true;
  }
  return CATEGORIES.some(
    (cat) =>
      pathname === `/${cat.key}` || pathname.startsWith(`/${cat.key}/`),
  );
}

export function isBrowseItemActive(
  href: string,
  pathname: string,
  searchParams: URLSearchParams,
): boolean {
  if (href === FLAWS_LINK.href) {
    return pathname.startsWith("/feats") && searchParams.get("type") === "Flaw";
  }
  const [path, queryString] = href.split("?");
  if (pathname.startsWith("/feats") && searchParams.get("type") === "Flaw") {
    return false;
  }
  if (pathname !== path && !pathname.startsWith(`${path}/`)) {
    return false;
  }
  if (!queryString) {
    if (path === "/equipment") {
      const kind = searchParams.get("kind");
      return !kind;
    }
    return true;
  }
  const expected = new URLSearchParams(queryString);
  for (const [key, value] of expected.entries()) {
    if (searchParams.get(key) !== value) return false;
  }
  return true;
}
