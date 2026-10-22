"use client";

import Link from "next/link";
import { Copy, RefreshCw } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { advanceGeneratorSeed } from "@/lib/random-spellbook/seeded-rng";
import { getShopItems } from "@/actions/magic-shop";
import {
  generateMagicShopFlavor,
  rerollMagicShopSection,
  SHOP_TYPE_LABELS,
  TOWN_SIZE_LABELS,
  type MagicShopFlavor,
  type MagicShopSection,
  type ShopItemRow,
  type ShopType,
  type TownSize,
  TOWN_SIZES,
  SHOP_TYPES,
} from "@/lib/magic-shop";

function Label({
  htmlFor,
  children,
}: {
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="tool-label">
      {children}
    </label>
  );
}

type SectionBumps = Record<MagicShopSection, number>;

function emptySectionBumps(): SectionBumps {
  return { name: 0, location: 0, description: 0, keeper: 0, items: 0 };
}

function parseTownSize(value: string | null): TownSize {
  if (value && (TOWN_SIZES as readonly string[]).includes(value)) {
    return value as TownSize;
  }
  return "small-town";
}

function parseShopType(value: string | null): ShopType {
  if (value && (SHOP_TYPES as readonly string[]).includes(value)) {
    return value as ShopType;
  }
  return "trader";
}

function formatPlainText(
  flavor: MagicShopFlavor,
  items: ShopItemRow[],
): string {
  const lines = [
    flavor.shopName,
    flavor.location,
    flavor.description,
    flavor.keeper,
    "Items:",
    ...items.map((row) =>
      row.price ? `${row.name} (${row.price})` : row.name,
    ),
  ];
  return lines.join("\n");
}

export function MagicShopGenerator() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const initialSeed = Number.parseInt(searchParams.get("seed") ?? "1", 10);
  const [seed, setSeed] = useState(Number.isNaN(initialSeed) ? 1 : initialSeed);
  const [townSize, setTownSize] = useState<TownSize>(
    parseTownSize(searchParams.get("town")),
  );
  const [shopType, setShopType] = useState<ShopType>(
    parseShopType(searchParams.get("type")),
  );
  const [flavor, setFlavor] = useState<MagicShopFlavor | null>(null);
  const [items, setItems] = useState<ShopItemRow[]>([]);
  const [sectionBumps, setSectionBumps] = useState<SectionBumps>(emptySectionBumps);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [itemsError, setItemsError] = useState<string | null>(null);
  const mounted = useRef(false);

  const baseInput = useMemo(
    () => ({ townSize, shopType, seed }),
    [townSize, shopType, seed],
  );

  const syncUrl = useCallback(
    (nextSeed: number, nextTown: TownSize, nextType: ShopType) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("seed", String(nextSeed));
      params.set("town", nextTown);
      params.set("type", nextType);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const loadItems = useCallback(
    async (nextSeed: number, nextTown: TownSize, nextType: ShopType, bump: number) => {
      setItemsError(null);
      try {
        const result = await getShopItems({
          townSize: nextTown,
          shopType: nextType,
          seed: nextSeed,
          itemsBump: bump,
        });
        setItems(result.items);
        setFlavor((current) =>
          current ? { ...current, itemCount: result.count } : current,
        );
      } catch {
        setItems([]);
        setItemsError("Could not load items from the compendium.");
      }
    },
    [],
  );

  const runFullGenerate = useCallback(
    (nextSeed: number, nextTown: TownSize, nextType: ShopType) => {
      startTransition(async () => {
        const bumps = emptySectionBumps();
        setSectionBumps(bumps);
        const nextFlavor = generateMagicShopFlavor({
          seed: nextSeed,
          townSize: nextTown,
          shopType: nextType,
        });
        setFlavor(nextFlavor);
        await loadItems(nextSeed, nextTown, nextType, bumps.items);
        syncUrl(nextSeed, nextTown, nextType);
      });
    },
    [loadItems, syncUrl],
  );

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    runFullGenerate(seed, townSize, shopType);
  }, [runFullGenerate, seed, shopType, townSize]);

  function handleGenerate() {
    const nextSeed = advanceGeneratorSeed(seed);
    setSeed(nextSeed);
    runFullGenerate(nextSeed, townSize, shopType);
  }

  function handleClear() {
    setSeed(1);
    setTownSize("small-town");
    setShopType("trader");
    setFlavor(null);
    setItems([]);
    setSectionBumps(emptySectionBumps());
    setCopyStatus(null);
    setItemsError(null);
    syncUrl(1, "small-town", "trader");
  }

  function handleUseSeed() {
    runFullGenerate(seed, townSize, shopType);
  }

  function rerollSection(section: MagicShopSection) {
    if (!flavor) return;
    const nextBump = sectionBumps[section] + 1;
    const nextBumps = { ...sectionBumps, [section]: nextBump };
    setSectionBumps(nextBumps);

    if (section === "items") {
      startTransition(async () => {
        await loadItems(seed, townSize, shopType, nextBump);
      });
      return;
    }

    startTransition(() => {
      setFlavor((current) =>
        current
          ? rerollMagicShopSection(section, baseInput, current, nextBump)
          : current,
      );
    });
  }

  function rerollShopName() {
    rerollSection("name");
  }

  function onTownOrTypeChange(nextTown: TownSize, nextType: ShopType) {
    setTownSize(nextTown);
    setShopType(nextType);
    runFullGenerate(seed, nextTown, nextType);
  }

  async function copyResult() {
    if (!flavor) return;
    await navigator.clipboard.writeText(formatPlainText(flavor, items));
    setCopyStatus("Copied");
    window.setTimeout(() => setCopyStatus(null), 2000);
  }

  return (
    <div className="magic-shop">
      <div className="magic-shop-form">
        <div className="magic-shop-seed-row">
          <div className="tool-field magic-shop-seed-field">
            <Label htmlFor="magic-shop-seed">Seed</Label>
            <input
              id="magic-shop-seed"
              type="number"
              className="tool-input"
              value={Number.isFinite(seed) ? seed : ""}
              onChange={(event) => setSeed(Number(event.target.value))}
            />
          </div>
          <button
            type="button"
            className="tool-btn tool-btn-secondary"
            onClick={handleUseSeed}
            disabled={isPending}
          >
            Use this seed
          </button>
        </div>

        <div className="magic-shop-fields">
          <div className="tool-field">
            <Label htmlFor="magic-shop-town">Town size</Label>
            <select
              id="magic-shop-town"
              className="tool-input"
              value={townSize}
              onChange={(event) =>
                onTownOrTypeChange(event.target.value as TownSize, shopType)
              }
            >
              {TOWN_SIZES.map((size) => (
                <option key={size} value={size}>
                  {TOWN_SIZE_LABELS[size]}
                </option>
              ))}
            </select>
          </div>
          <div className="tool-field">
            <Label htmlFor="magic-shop-type">Shop type</Label>
            <select
              id="magic-shop-type"
              className="tool-input"
              value={shopType}
              onChange={(event) =>
                onTownOrTypeChange(townSize, event.target.value as ShopType)
              }
            >
              {SHOP_TYPES.map((type) => (
                <option key={type} value={type}>
                  {SHOP_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="magic-shop-actions">
          <button
            type="button"
            className="tool-btn tool-btn-primary"
            onClick={handleGenerate}
            disabled={isPending}
          >
            Generate
          </button>
          <button
            type="button"
            className="tool-btn tool-btn-secondary"
            onClick={handleClear}
            disabled={isPending}
          >
            Clear
          </button>
          <button
            type="button"
            className="tool-btn tool-btn-secondary"
            onClick={copyResult}
            disabled={!flavor || isPending}
          >
            <Copy size={16} aria-hidden="true" />
            Copy
          </button>
          {copyStatus ? (
            <span className="magic-shop-copy-status">{copyStatus}</span>
          ) : null}
        </div>
      </div>

      {flavor ? (
        <div className="magic-shop-results">
          <div className="magic-shop-name-row">
            <button
              type="button"
              className="tool-btn tool-btn--ghost magic-shop-name-btn"
              onClick={rerollShopName}
              disabled={isPending}
            >
              {flavor.shopName}
            </button>
          </div>

          <section className="magic-shop-block">
            <header className="magic-shop-block-header">
              <h2>Location</h2>
              <button
                type="button"
                className="tool-btn tool-btn-secondary"
                onClick={() => rerollSection("location")}
                disabled={isPending}
              >
                <RefreshCw size={16} aria-hidden="true" />
                Reroll
              </button>
            </header>
            <p>{flavor.location}</p>
          </section>

          <section className="magic-shop-block">
            <header className="magic-shop-block-header">
              <h2>Description</h2>
              <button
                type="button"
                className="tool-btn tool-btn-secondary"
                onClick={() => rerollSection("description")}
                disabled={isPending}
              >
                <RefreshCw size={16} aria-hidden="true" />
                Reroll
              </button>
            </header>
            <p>{flavor.description}</p>
          </section>

          <section className="magic-shop-block">
            <header className="magic-shop-block-header">
              <h2>Keeper</h2>
              <button
                type="button"
                className="tool-btn tool-btn-secondary"
                onClick={() => rerollSection("keeper")}
                disabled={isPending}
              >
                <RefreshCw size={16} aria-hidden="true" />
                Reroll
              </button>
            </header>
            <p>{flavor.keeper}</p>
          </section>

          <section className="magic-shop-block">
            <header className="magic-shop-block-header">
              <h2>Items{flavor.itemCount > 0 ? ` (${flavor.itemCount})` : ""}</h2>
              <button
                type="button"
                className="tool-btn tool-btn-secondary"
                onClick={() => rerollSection("items")}
                disabled={isPending}
              >
                <RefreshCw size={16} aria-hidden="true" />
                Reroll
              </button>
            </header>
            {itemsError ? <p className="magic-shop-error">{itemsError}</p> : null}
            {items.length === 0 && !itemsError ? (
              <p className="magic-shop-empty">No items loaded yet.</p>
            ) : (
              <ol className="magic-shop-item-list">
                {items.map((row, index) => (
                  <li key={`${row.slug ?? row.name}-${index}`}>
                    {row.slug ? (
                      <Link href={`/items/${row.slug}`}>{row.name}</Link>
                    ) : (
                      <span>{row.name}</span>
                    )}
                    {row.price ? (
                      <span className="magic-shop-item-price">{row.price}</span>
                    ) : null}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
