"use client";

import { WandSparkles } from "lucide-react";
import { rollRandomCharacterName } from "@/lib/names";

export function RandomNameButton({
  raceHint,
  genderHint,
  withLastName = true,
  onPick,
  className,
}: {
  raceHint?: string;
  genderHint?: string;
  withLastName?: boolean;
  onPick: (name: string) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={["tool-btn tool-btn--ghost name-roll-btn", className]
        .filter(Boolean)
        .join(" ")}
      aria-label="Generate a random name"
      title="Generate a random name"
      onPointerDown={(event) => event.preventDefault()}
      onClick={() =>
        onPick(
          rollRandomCharacterName({
            raceHint,
            genderHint,
            withLastName,
          }),
        )
      }
    >
      <WandSparkles size={16} aria-hidden="true" />
    </button>
  );
}
