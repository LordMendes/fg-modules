"use client";

import {
  DIFFICULTY_OPTIONS,
  clampPartyLevel,
  clampPartySize,
  type EncounterDifficulty,
  type PartyConfig,
} from "@/lib/encounter/partyConfig";
import { formatEl } from "@/lib/encounter/formatEl";

type EncounterPartyConfigProps = {
  config: PartyConfig;
  targetEl: number | null;
  onChange: (config: PartyConfig) => void;
  compact?: boolean;
};

export function EncounterPartyConfig({
  config,
  targetEl,
  onChange,
  compact = false,
}: EncounterPartyConfigProps) {
  function update(partial: Partial<PartyConfig>) {
    onChange({ ...config, ...partial });
  }

  return (
    <section
      className={`encounter-party-config${compact ? " encounter-party-config--compact" : ""}`}
      aria-label="Party settings"
    >
      <div className="encounter-party-config-fields">
        <div className="tool-field">
          <label htmlFor="encounter-party-size" className="tool-label">
            Party members
          </label>
          <input
            id="encounter-party-size"
            type="number"
            className="tool-input"
            min={1}
            max={12}
            value={config.partySize}
            onChange={(e) =>
              update({ partySize: clampPartySize(Number(e.target.value)) })
            }
          />
        </div>

        <div className="tool-field">
          <label htmlFor="encounter-party-level" className="tool-label">
            Party level
          </label>
          <input
            id="encounter-party-level"
            type="number"
            className="tool-input"
            min={1}
            max={20}
            value={config.partyLevel}
            onChange={(e) =>
              update({ partyLevel: clampPartyLevel(Number(e.target.value)) })
            }
          />
        </div>

        <div className="tool-field">
          <label htmlFor="encounter-difficulty" className="tool-label">
            Difficulty
          </label>
          <select
            id="encounter-difficulty"
            className="tool-input"
            value={config.difficulty}
            onChange={(e) =>
              update({ difficulty: e.target.value as EncounterDifficulty })
            }
          >
            {DIFFICULTY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {targetEl !== null && (
        <p className="encounter-party-target">
          Target EL: <strong>{formatEl(targetEl)}</strong>
        </p>
      )}
    </section>
  );
}

export function formatElDelta(delta: number | null): string | null {
  if (delta === null) return null;
  if (delta === 0) return "on target";
  const sign = delta > 0 ? "+" : "";
  return `${sign}${formatEl(delta)}`;
}

export function elDeltaClassName(delta: number | null): string {
  if (delta === null) return "";
  if (delta === 0) return "encounter-el-on-target";
  if (delta > 0) return "encounter-el-over";
  return "encounter-el-under";
}
