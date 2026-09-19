"use client";

import {
  combatRemoveEffect,
  combatToggleEffectActive,
  combatUpdateEffect,
} from "@/actions/combat";
import type { CombatEffectInput } from "@/components/combat/combat-context";
import {
  canAddEffect,
  effectPresetOptions,
  formatEffectChipLabel,
  isOwnPc,
  loadRecentEffects,
  pushRecentEffect,
} from "@/components/combat/combat-utils";
import {
  setCombatDragData,
  type CombatDragPayload,
} from "@/components/combat/combat-roll-drop";
import { parseEffect } from "@/lib/combat/effects/parseEffect";
import { formatEffect } from "@/lib/combat/effects/formatEffect";
import type { CombatEffectView, CombatantView } from "@/lib/combat/types";
import { GripVertical } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useCombatContext } from "./combat-context";

function EffectChipEditor({
  effect,
  campaignId,
  isDm,
  canEdit,
  onClose,
}: {
  effect: CombatEffectView;
  campaignId: string;
  isDm: boolean;
  canEdit: boolean;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [duration, setDuration] = useState(
    effect.duration != null ? String(effect.duration) : "",
  );
  const [durationUnit, setDurationUnit] = useState(effect.durationUnit);
  const [expiry, setExpiry] = useState(effect.expiry);
  const [visibility, setVisibility] = useState(effect.visibility);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!canEdit) return null;

  return (
    <div className="combat-effect-editor" role="dialog" aria-label="Edit effect">
      <div className="combat-effect-editor-row">
        <label className="combat-effect-editor-label">Duration</label>
        <input
          className="tool-input tool-input-sm"
          type="number"
          min={0}
          placeholder="Until removed"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
        />
        <select
          className="tool-select"
          value={durationUnit}
          onChange={(e) =>
            setDurationUnit(e.target.value as CombatEffectView["durationUnit"])
          }
        >
          <option value="round">rounds</option>
          <option value="minute">minutes</option>
          <option value="hour">hours</option>
          <option value="day">days</option>
        </select>
      </div>
      <div className="combat-effect-editor-row">
        <label className="combat-effect-editor-label">Expiry</label>
        <select
          className="tool-select"
          value={expiry}
          onChange={(e) =>
            setExpiry(e.target.value as CombatEffectView["expiry"])
          }
        >
          <option value="startOfTurn">Start of turn</option>
          <option value="endOfTurn">End of turn</option>
        </select>
      </div>
      {isDm ? (
        <div className="combat-effect-editor-row">
          <label className="combat-effect-editor-label">Visibility</label>
          <select
            className="tool-select"
            value={visibility}
            onChange={(e) =>
              setVisibility(e.target.value as CombatEffectView["visibility"])
            }
          >
            <option value="visible">Visible</option>
            <option value="hidden">Hidden</option>
            <option value="gm">GM only</option>
          </select>
        </div>
      ) : null}
      <div className="combat-effect-editor-actions">
        <button
          type="button"
          className={`tool-btn tool-btn--ghost${effect.active ? " tool-btn--active" : ""}`}
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              await combatToggleEffectActive(campaignId, effect.id);
            });
          }}
        >
          {effect.active ? "Active" : "Inactive"}
        </button>
        <button
          type="button"
          className="tool-btn tool-btn--ghost"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              const dur = duration.trim()
                ? Number.parseInt(duration, 10)
                : null;
              await combatUpdateEffect(campaignId, effect.id, {
                duration: dur != null && Number.isFinite(dur) ? dur : null,
                durationUnit,
                expiry,
                ...(isDm ? { visibility } : {}),
              });
              onClose();
            });
          }}
        >
          Save
        </button>
        <button
          type="button"
          className="tool-btn tool-btn--ghost tool-btn--danger"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              await combatRemoveEffect(campaignId, effect.id);
              onClose();
            });
          }}
        >
          Remove
        </button>
      </div>
    </div>
  );
}

function EffectChip({
  effect,
  c,
  isDm,
  viewerPcPlanId,
  campaignId,
  showInStrip,
}: {
  effect: CombatEffectView;
  c: CombatantView;
  isDm: boolean;
  viewerPcPlanId: string | null;
  campaignId: string;
  showInStrip?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const canEdit =
    isDm || (isOwnPc(c, viewerPcPlanId) && !effect.system && effect.visibility !== "gm");

  const tooltip = [
    formatEffect(effect.components),
    effect.sourceName ? `Source: ${effect.sourceName}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const payload: CombatDragPayload = {
    kind: "effect",
    effectText: formatEffect(effect.components) || effect.label,
    input: {
      effectText: formatEffect(effect.components) || effect.label,
      duration: effect.duration,
      durationUnit: effect.durationUnit,
      expiry: effect.expiry,
      visibility: effect.visibility,
    },
  };

  return (
    <span className={`combat-effect-chip-wrap${showInStrip ? " combat-effect-chip-wrap--strip" : ""}`}>
      <button
        type="button"
        className={`combat-effect-chip${!effect.active ? " combat-effect-chip--inactive" : ""}${effect.visibility !== "visible" ? " combat-effect-chip--hidden-vis" : ""}`}
        title={tooltip}
        draggable={canEdit}
        onDragStart={(e) => {
          if (!canEdit) return;
          setCombatDragData(e, payload);
        }}
        onClick={() => {
          if (canEdit) setEditing((v) => !v);
        }}
      >
        {canEdit ? (
          <GripVertical size={12} className="combat-effect-drag-handle" aria-hidden />
        ) : null}
        {formatEffectChipLabel(effect)}
      </button>
      {editing ? (
        <EffectChipEditor
          effect={effect}
          campaignId={campaignId}
          isDm={isDm}
          canEdit={canEdit}
          onClose={() => setEditing(false)}
        />
      ) : null}
    </span>
  );
}

export function CombatRowEffectsStrip({
  c,
  isDm,
  viewerPcPlanId,
  campaignId,
  maxVisible = 4,
}: {
  c: CombatantView;
  isDm: boolean;
  viewerPcPlanId: string | null;
  campaignId: string;
  maxVisible?: number;
}) {
  if (c.effects.length === 0) return null;
  const visible = c.effects.slice(0, maxVisible);
  const overflow = c.effects.length - visible.length;

  return (
    <div className="combat-status-strip">
      {visible.map((effect) => (
        <EffectChip
          key={effect.id}
          effect={effect}
          c={c}
          isDm={isDm}
          viewerPcPlanId={viewerPcPlanId}
          campaignId={campaignId}
          showInStrip
        />
      ))}
      {overflow > 0 ? (
        <span className="combat-status-overflow">+{overflow}</span>
      ) : null}
    </div>
  );
}

export function CombatRowEffectsSection({
  c,
  isDm,
  viewerPcPlanId,
  campaignId,
}: {
  c: CombatantView;
  isDm: boolean;
  viewerPcPlanId: string | null;
  campaignId: string;
}) {
  const ctx = useCombatContext();
  const [pending, startTransition] = useTransition();
  const [text, setText] = useState("");
  const [duration, setDuration] = useState("10");
  const [durationUnit, setDurationUnit] = useState<
    "round" | "minute" | "hour" | "day"
  >("round");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const canAdd = canAddEffect(c, isDm, viewerPcPlanId);
  const presets = useMemo(() => {
    const recent = loadRecentEffects(campaignId);
    return [...new Set([...recent, ...effectPresetOptions()])];
  }, [campaignId]);

  const filteredPresets = useMemo(() => {
    const q = text.trim().toLowerCase();
    if (!q) return presets.slice(0, 12);
    return presets.filter((p) => p.toLowerCase().includes(q)).slice(0, 12);
  }, [presets, text]);

  const parsed = useMemo(() => parseEffect(text), [text]);

  const applyToTargets = useCallback(
    (targetIds: string[]) => {
      if (!ctx || !text.trim() || targetIds.length === 0) return;
      const input: CombatEffectInput = {
        effectText: text.trim(),
        duration: duration.trim()
          ? Number.parseInt(duration, 10)
          : null,
        durationUnit,
        expiry: "startOfTurn",
        visibility: "visible",
      };
      startTransition(async () => {
        await ctx.applyEffect(targetIds, input);
        pushRecentEffect(campaignId, text.trim());
        setText("");
        setShowSuggestions(false);
      });
    },
    [ctx, text, duration, durationUnit, campaignId],
  );

  if (!canAdd && c.effects.length === 0) return null;

  return (
    <section className="combat-detail-section">
      <h4 className="combat-detail-heading">Effects</h4>
      <ul className="combat-effects-list">
        {c.effects.map((effect) => (
          <li key={effect.id} className="combat-effects-list-item">
            <EffectChip
              effect={effect}
              c={c}
              isDm={isDm}
              viewerPcPlanId={viewerPcPlanId}
              campaignId={campaignId}
            />
          </li>
        ))}
      </ul>

      {canAdd ? (
        <div className="combat-add-effect">
          <div className="combat-add-effect-row">
            <span
              className="combat-effect-drag-handle-btn"
              draggable
              title="Drag to apply effect"
              onDragStart={(e) => {
                if (!text.trim()) return;
                const input: CombatEffectInput = {
                  effectText: text.trim(),
                  duration: duration.trim()
                    ? Number.parseInt(duration, 10)
                    : null,
                  durationUnit,
                };
                setCombatDragData(e, {
                  kind: "effect",
                  effectText: text.trim(),
                  input,
                });
              }}
            >
              <GripVertical size={14} aria-hidden />
            </span>
            <input
              ref={inputRef}
              className="tool-input combat-add-effect-input"
              placeholder="Add effect"
              value={text}
              disabled={pending}
              onChange={(e) => {
                setText(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => {
                window.setTimeout(() => setShowSuggestions(false), 150);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  applyToTargets([c.id]);
                }
                if (e.key === "Enter" && e.shiftKey) {
                  e.preventDefault();
                  applyToTargets(c.targetIds);
                }
                if (e.key === "Escape") {
                  setText("");
                  setShowSuggestions(false);
                }
              }}
            />
            <input
              className="tool-input tool-input-sm combat-add-effect-duration"
              type="number"
              min={0}
              placeholder="Dur"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
            <select
              className="tool-select tool-input-sm"
              value={durationUnit}
              onChange={(e) =>
                setDurationUnit(e.target.value as typeof durationUnit)
              }
            >
              <option value="round">r</option>
              <option value="minute">m</option>
              <option value="hour">h</option>
              <option value="day">d</option>
            </select>
            <button
              type="button"
              className="tool-btn tool-btn--ghost"
              disabled={pending || !text.trim()}
              title="Apply to current targets"
              onClick={() => applyToTargets(c.targetIds)}
            >
              To targets
            </button>
          </div>

          {showSuggestions && filteredPresets.length > 0 ? (
            <ul className="combat-effect-suggestions" role="listbox">
              {filteredPresets.map((preset) => (
                <li key={preset}>
                  <button
                    type="button"
                    className="combat-effect-suggestion"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setText(preset);
                      setShowSuggestions(false);
                      inputRef.current?.focus();
                    }}
                  >
                    {preset.split(";")[0]?.trim() ?? preset}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {text.trim() ? (
            <div className="combat-effect-preview">
              {parsed.components.map((comp, i) => (
                <span key={i} className="combat-effect-preview-tag">
                  {formatEffect([comp])}
                </span>
              ))}
              {parsed.warnings.map((w, i) => (
                <span key={`w-${i}`} className="combat-effect-preview-warn">
                  {w}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
