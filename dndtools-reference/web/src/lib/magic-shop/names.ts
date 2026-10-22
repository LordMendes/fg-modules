const KEEPER_NAME_PATTERN = /named ([^,.\s]+)/;

export function parseKeeperGivenName(keeper: string): string | null {
  const match = keeper.match(KEEPER_NAME_PATTERN);
  return match?.[1] ?? null;
}

export function applyKeeperPlaceholder(
  pattern: string,
  givenName: string | null,
): string {
  if (!givenName) {
    return pattern.replace(/\{keeper\}/g, "Merrow");
  }
  return pattern.replace(/\{keeper\}/g, givenName);
}

/** Replace a leading possessive name when the pattern used a sample name. */
export function applyKeeperPossessiveName(
  shopName: string,
  givenName: string,
): string {
  if (shopName.startsWith("The ")) return shopName;
  const possessive = shopName.match(/^(.+?)('s .+)$/);
  if (possessive) return givenName + possessive[2]!;
  const compound = shopName.match(/^(.+?)( and .+'s .+)$/);
  if (compound) return givenName + compound[2]!;
  return shopName;
}

export function finalizeShopName(
  pattern: string,
  keeper: string,
  previousDisplayName?: string,
): { shopName: string; shopNamePattern: string } {
  const givenName = parseKeeperGivenName(keeper);
  let shopName = applyKeeperPlaceholder(pattern, givenName);
  if (givenName && !pattern.includes("{keeper}") && previousDisplayName) {
    shopName = applyKeeperPossessiveName(shopName, givenName);
  } else if (givenName && !pattern.includes("{keeper}")) {
    shopName = applyKeeperPossessiveName(shopName, givenName);
  }
  return { shopName, shopNamePattern: pattern };
}

export function refreshShopNameForKeeper(
  shopNamePattern: string,
  currentShopName: string,
  keeper: string,
): string {
  const givenName = parseKeeperGivenName(keeper);
  if (!givenName) return currentShopName;
  if (shopNamePattern.includes("{keeper}")) {
    return applyKeeperPlaceholder(shopNamePattern, givenName);
  }
  return applyKeeperPossessiveName(currentShopName, givenName);
}
