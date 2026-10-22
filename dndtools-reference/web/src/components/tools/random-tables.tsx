"use client";

import Link from "next/link";
import { Copy } from "lucide-react";
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
import { rollRandomTables } from "@/actions/random-tables";
import {
  MAGIC_ITEM_RANKS,
  MAGIC_ITEM_TYPES,
  NPC_CLASS_ORDERS,
  NPC_GENDERS,
  NPC_RACES,
  RANDOM_TABLE_KINDS,
  SPELLBOOK_RANKS,
  type MagicItemRank,
  type MagicItemType,
  type NpcClassOrder,
  type NpcGender,
  type NpcRace,
  type RandomTableEntry,
  type RandomTableKind,
  type RandomTablesResult,
  type SpellbookRank,
} from "@/lib/random-tables";

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

function parseKind(value: string | null): RandomTableKind {
  if (value && RANDOM_TABLE_KINDS.some((row) => row.value === value)) {
    return value as RandomTableKind;
  }
  return "traps";
}

function formatPlainText(entries: RandomTableEntry[]): string {
  return entries
    .map((entry, index) => {
      const prefix = `${index + 1}. `;
      switch (entry.kind) {
        case "trap":
          return (
            prefix +
            [
              entry.name,
              `CR ${entry.cr}`,
              `Search DC ${entry.searchDc}`,
              `Disable Device DC ${entry.disableDeviceDc}`,
              entry.trigger,
              entry.attackOrSave,
              `Damage ${entry.damageExpression} (example ${entry.exampleDamage})`,
              entry.bypass,
              entry.spellEffect,
            ]
              .filter(Boolean)
              .join("; ")
          );
        case "npc":
          return prefix + entry.text;
        case "pickpocket":
          return prefix + entry.summary;
        case "magic-item":
          if (entry.error) return prefix + entry.error;
          return prefix + `${entry.item?.label ?? "Item"} (${entry.item?.priceDisplay ?? "—"})`;
        case "spellbook":
          return (
            prefix +
            [
              entry.title,
              ...entry.spells.map((s) => `${s.name} (level ${s.level})`),
            ].join("; ")
          );
        default:
          return prefix;
      }
    })
    .join("\n");
}

function TrapCard({ entry }: { entry: Extract<RandomTableEntry, { kind: "trap" }> }) {
  return (
    <article className="random-tables-card">
      <h2 className="random-tables-card-title">{entry.name}</h2>
      <dl className="random-tables-dl">
        <div>
          <dt>CR</dt>
          <dd>{entry.cr}</dd>
        </div>
        <div>
          <dt>Search DC</dt>
          <dd>{entry.searchDc}</dd>
        </div>
        <div>
          <dt>Disable Device DC</dt>
          <dd>{entry.disableDeviceDc}</dd>
        </div>
        <div>
          <dt>Trigger</dt>
          <dd>{entry.trigger}</dd>
        </div>
        <div>
          <dt>Attack or save</dt>
          <dd>{entry.attackOrSave}</dd>
        </div>
        <div>
          <dt>Damage</dt>
          <dd>
            {entry.damageExpression} (example {entry.exampleDamage})
          </dd>
        </div>
        <div>
          <dt>Bypass</dt>
          <dd>{entry.bypass}</dd>
        </div>
        {entry.spellEffect ? (
          <div>
            <dt>Magic</dt>
            <dd>
              {entry.spellHref ? (
                <Link href={entry.spellHref}>{entry.spellEffect}</Link>
              ) : (
                entry.spellEffect
              )}
            </dd>
          </div>
        ) : null}
      </dl>
    </article>
  );
}

function NpcCard({ entry }: { entry: Extract<RandomTableEntry, { kind: "npc" }> }) {
  return (
    <article className="random-tables-card">
      <p className="random-tables-npc-text">
        {entry.name}, a {entry.race} {entry.gender}{" "}
        {entry.classHref ? (
          <Link href={entry.classHref}>{entry.className}</Link>
        ) : (
          entry.className
        )}{" "}
        {entry.level}, {entry.mannerism}.
      </p>
    </article>
  );
}

function ResultCard({ entry }: { entry: RandomTableEntry }) {
  switch (entry.kind) {
    case "trap":
      return <TrapCard entry={entry} />;
    case "npc":
      return <NpcCard entry={entry} />;
    case "pickpocket":
      return (
        <article className="random-tables-card">
          <p>{entry.summary}</p>
        </article>
      );
    case "magic-item":
      return (
        <article className="random-tables-card">
          {entry.error ? (
            <p className="random-tables-error">{entry.error}</p>
          ) : (
            <p>
              {entry.item?.href ? (
                <Link href={entry.item.href}>{entry.item.label}</Link>
              ) : (
                entry.item?.label
              )}{" "}
              <span className="random-tables-muted">({entry.item?.priceDisplay})</span>
            </p>
          )}
        </article>
      );
    case "spellbook":
      return (
        <article className="random-tables-card">
          <h2 className="random-tables-card-title">{entry.title}</h2>
          {entry.spells.length === 0 ? (
            <p className="random-tables-muted">No wizard spells matched in the compendium.</p>
          ) : (
            <ul className="random-tables-spell-list">
              {entry.spells.map((spell) => (
                <li key={`${spell.name}-${spell.level}`}>
                  {spell.href ? (
                    <Link href={spell.href}>{spell.name}</Link>
                  ) : (
                    spell.name
                  )}{" "}
                  <span className="random-tables-muted">(level {spell.level})</span>
                </li>
              ))}
            </ul>
          )}
        </article>
      );
    default:
      return null;
  }
}

export function RandomTablesTool() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const mounted = useRef(false);

  const initialSeed = Number.parseInt(searchParams.get("seed") ?? "1", 10);
  const [seed, setSeed] = useState(Number.isNaN(initialSeed) ? 1 : initialSeed);
  const [kind, setKind] = useState<RandomTableKind>(parseKind(searchParams.get("kind")));
  const [count, setCount] = useState(
    Math.min(20, Math.max(1, Number.parseInt(searchParams.get("count") ?? "5", 10) || 5)),
  );
  const [trapCr, setTrapCr] = useState(
    Math.min(20, Math.max(1, Number.parseInt(searchParams.get("trapCr") ?? "5", 10) || 5)),
  );
  const [npcGender, setNpcGender] = useState<NpcGender>(
    (searchParams.get("npcGender") as NpcGender) || "any",
  );
  const [npcRace, setNpcRace] = useState<NpcRace>(
    (searchParams.get("npcRace") as NpcRace) || "any",
  );
  const [npcClassOrder, setNpcClassOrder] = useState<NpcClassOrder>(
    (searchParams.get("npcClassOrder") as NpcClassOrder) || "any",
  );
  const [magicRank, setMagicRank] = useState<MagicItemRank>(
    (searchParams.get("magicRank") as MagicItemRank) || "minor",
  );
  const [magicType, setMagicType] = useState<MagicItemType>(
    (searchParams.get("magicType") as MagicItemType) || "any",
  );
  const [spellbookRank, setSpellbookRank] = useState<SpellbookRank>(
    (searchParams.get("spellbookRank") as SpellbookRank) || "mundane",
  );
  const [result, setResult] = useState<RandomTablesResult | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const input = useMemo(
    () => ({
      kind,
      count,
      seed,
      trapCr,
      npcGender,
      npcRace,
      npcClassOrder,
      magicRank,
      magicType,
      spellbookRank,
    }),
    [
      kind,
      count,
      seed,
      trapCr,
      npcGender,
      npcRace,
      npcClassOrder,
      magicRank,
      magicType,
      spellbookRank,
    ],
  );

  const syncUrl = useCallback((nextSeed = seed) => {
    const params = new URLSearchParams();
    params.set("seed", String(nextSeed));
    params.set("kind", kind);
    params.set("count", String(count));
    if (kind === "traps") params.set("trapCr", String(trapCr));
    if (kind === "npcs") {
      params.set("npcGender", npcGender);
      params.set("npcRace", npcRace);
      params.set("npcClassOrder", npcClassOrder);
    }
    if (kind === "magic-items") {
      params.set("magicRank", magicRank);
      params.set("magicType", magicType);
    }
    if (kind === "spellbooks") params.set("spellbookRank", spellbookRank);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [
    count,
    kind,
    magicRank,
    magicType,
    npcClassOrder,
    npcGender,
    npcRace,
    pathname,
    router,
    seed,
    spellbookRank,
    trapCr,
  ]);

  const runGenerate = useCallback(
    (nextSeed: number) => {
      startTransition(() => {
        syncUrl(nextSeed);
        void rollRandomTables({ ...input, seed: nextSeed }).then((next) => {
          setResult(next);
        });
      });
    },
    [input, syncUrl],
  );

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    runGenerate(seed);
  }, [runGenerate, seed]);

  const onGenerate = () => {
    const nextSeed = advanceGeneratorSeed(seed);
    setSeed(nextSeed);
    runGenerate(nextSeed);
  };

  const onUseSeed = () => {
    runGenerate(seed);
  };

  const onClear = () => {
    setResult(null);
    setCopyStatus(null);
  };

  const onCopy = async () => {
    if (!result?.entries.length) return;
    try {
      await navigator.clipboard.writeText(formatPlainText(result.entries));
      setCopyStatus("Copied");
      window.setTimeout(() => setCopyStatus(null), 2000);
    } catch {
      setCopyStatus("Copy failed");
    }
  };

  return (
    <div className="random-tables">
      <form
        className="random-tables-form"
        onSubmit={(event) => {
          event.preventDefault();
          onGenerate();
        }}
      >
        <div className="random-tables-fields">
          <div className="tool-field">
            <Label htmlFor="rt-kind">Table type</Label>
            <select
              id="rt-kind"
              className="tool-input"
              value={kind}
              onChange={(event) => setKind(event.target.value as RandomTableKind)}
            >
              {RANDOM_TABLE_KINDS.map((row) => (
                <option key={row.value} value={row.value}>
                  {row.label}
                </option>
              ))}
            </select>
          </div>

          <div className="tool-field">
            <Label htmlFor="rt-count">Count</Label>
            <input
              id="rt-count"
              className="tool-input"
              type="number"
              min={1}
              max={20}
              value={count}
              onChange={(event) =>
                setCount(Math.min(20, Math.max(1, Number(event.target.value) || 1)))
              }
            />
          </div>

          {kind === "traps" ? (
            <div className="tool-field">
              <Label htmlFor="rt-trap-cr">Trap CR</Label>
              <input
                id="rt-trap-cr"
                className="tool-input"
                type="number"
                min={1}
                max={20}
                value={trapCr}
                onChange={(event) =>
                  setTrapCr(Math.min(20, Math.max(1, Number(event.target.value) || 1)))
                }
              />
            </div>
          ) : null}

          {kind === "npcs" ? (
            <>
              <div className="tool-field">
                <Label htmlFor="rt-gender">Gender</Label>
                <select
                  id="rt-gender"
                  className="tool-input"
                  value={npcGender}
                  onChange={(event) => setNpcGender(event.target.value as NpcGender)}
                >
                  {NPC_GENDERS.map((row) => (
                    <option key={row.value} value={row.value}>
                      {row.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="tool-field">
                <Label htmlFor="rt-race">Race</Label>
                <select
                  id="rt-race"
                  className="tool-input"
                  value={npcRace}
                  onChange={(event) => setNpcRace(event.target.value as NpcRace)}
                >
                  {NPC_RACES.map((row) => (
                    <option key={row.value} value={row.value}>
                      {row.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="tool-field">
                <Label htmlFor="rt-class-order">Class order</Label>
                <select
                  id="rt-class-order"
                  className="tool-input"
                  value={npcClassOrder}
                  onChange={(event) =>
                    setNpcClassOrder(event.target.value as NpcClassOrder)
                  }
                >
                  {NPC_CLASS_ORDERS.map((row) => (
                    <option key={row.value} value={row.value}>
                      {row.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : null}

          {kind === "magic-items" ? (
            <>
              <div className="tool-field">
                <Label htmlFor="rt-magic-rank">Rank</Label>
                <select
                  id="rt-magic-rank"
                  className="tool-input"
                  value={magicRank}
                  onChange={(event) => setMagicRank(event.target.value as MagicItemRank)}
                >
                  {MAGIC_ITEM_RANKS.map((row) => (
                    <option key={row.value} value={row.value}>
                      {row.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="tool-field">
                <Label htmlFor="rt-magic-type">Type</Label>
                <select
                  id="rt-magic-type"
                  className="tool-input"
                  value={magicType}
                  onChange={(event) => setMagicType(event.target.value as MagicItemType)}
                >
                  {MAGIC_ITEM_TYPES.map((row) => (
                    <option key={row.value} value={row.value}>
                      {row.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : null}

          {kind === "spellbooks" ? (
            <div className="tool-field">
              <Label htmlFor="rt-spellbook-rank">Rank</Label>
              <select
                id="rt-spellbook-rank"
                className="tool-input"
                value={spellbookRank}
                onChange={(event) =>
                  setSpellbookRank(event.target.value as SpellbookRank)
                }
              >
                {SPELLBOOK_RANKS.map((row) => (
                  <option key={row.value} value={row.value}>
                    {row.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>

        <div className="random-tables-seed-row">
          <div className="tool-field random-tables-seed-field">
            <Label htmlFor="rt-seed">Seed</Label>
            <input
              id="rt-seed"
              className="tool-input"
              type="number"
              value={seed}
              onChange={(event) => setSeed(Number.parseInt(event.target.value, 10) || 1)}
            />
          </div>
          <button
            type="button"
            className="tool-btn tool-btn-secondary"
            onClick={onUseSeed}
            disabled={isPending}
          >
            Use this seed
          </button>
        </div>

        <div className="random-tables-actions">
          <button
            type="submit"
            className="tool-btn tool-btn-primary"
            disabled={isPending}
          >
            Generate
          </button>
          <button type="button" className="tool-btn tool-btn--ghost" onClick={onClear}>
            Clear
          </button>
          <button
            type="button"
            className="tool-btn tool-btn-secondary"
            disabled={!result?.entries.length}
            onClick={() => void onCopy()}
          >
            <Copy size={16} aria-hidden="true" /> Copy
          </button>
          {copyStatus ? (
            <span className="random-tables-copy-status">{copyStatus}</span>
          ) : null}
        </div>
      </form>

      {result?.magicItemsUnavailable ? (
        <p className="random-tables-error">
          Magic item rolls need the treasure tables.
        </p>
      ) : null}

      {result?.entries.length ? (
        <ol className="random-tables-results">
          {result.entries.map((entry, index) => (
            <li key={`${entry.kind}-${index}`}>
              <ResultCard entry={entry} />
            </li>
          ))}
        </ol>
      ) : (
        <p className="random-tables-empty">Generate to see results.</p>
      )}
    </div>
  );
}
