"use client";

import { Plus } from "lucide-react";
import { useEncounter } from "@/components/encounter/encounter-provider";
import type { MonsterRef } from "@/lib/encounter/types";

export function AddToEncounterButton({
  monster,
  compact = false,
}: {
  monster: MonsterRef;
  compact?: boolean;
}) {
  const { addMonster, entries } = useEncounter();
  const inEncounter = entries.some((e) => e.slug === monster.slug);
  const count = entries.find((e) => e.slug === monster.slug)?.count ?? 0;

  return (
    <button
      type="button"
      className={`encounter-add-btn${compact ? " encounter-add-btn--compact" : ""}${inEncounter ? " encounter-add-btn--active" : ""}`}
      onClick={() => addMonster(monster)}
      aria-label={`Add ${monster.name} to encounter`}
      title={inEncounter ? `${count} in encounter — click to add another` : "Add to encounter"}
    >
      <Plus size={compact ? 14 : 16} aria-hidden="true" />
      {!compact && <span>Add</span>}
      {inEncounter && compact && (
        <span className="encounter-add-count" aria-hidden="true">
          {count}
        </span>
      )}
    </button>
  );
}
