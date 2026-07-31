"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { TemplateConflictModal } from "@/components/tools/npc-conflict-modal";
import {
  NpcSheetPreview,
  type SheetTab,
} from "@/components/tools/npc-sheet-preview";
import {
  applyPatchWithChoices,
  ARCHETYPE_PRESETS,
  buildNpcFgXml,
  DEFAULT_NPC_FG_STATE,
  DEFAULT_SPELL_ROW,
  deleteUserTemplate,
  detectPatchConflicts,
  LEVEL_PRESETS,
  loadDraft,
  loadUserTemplates,
  monsterDeltaToPatch,
  MONSTER_TEMPLATES,
  normalizeSkillPatch,
  NPC_FG_SKILL_MARKDOWN,
  parseNpcFgJson,
  parseNpcFgXml,
  renameUserTemplate,
  saveDraft,
  saveUserTemplate,
  toSlug,
  type ConflictChoice,
  type FieldConflict,
  type NpcFgExportState,
  type NpcFgSpellRow,
  type UserNpcTemplate,
} from "@/lib/npc-creator";

type TemplateTab = "archetypes" | "levels" | "monsters" | "mine" | "skill";

type PendingApply = {
  name: string;
  patch: unknown;
  note?: string;
  layerLabel: string;
};

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

function TextField({
  id,
  label,
  value,
  onChange,
  wide,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "tool-field tool-field-wide" : "tool-field"}>
      <Label htmlFor={id}>{label}</Label>
      <input
        id={id}
        type="text"
        className="tool-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function NumField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="tool-field">
      <Label htmlFor={id}>{label}</Label>
      <input
        id={id}
        type="number"
        className="tool-input"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

function TextArea({
  id,
  label,
  value,
  onChange,
  rows = 3,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <div className="tool-field tool-field-wide">
      <Label htmlFor={id}>{label}</Label>
      <textarea
        id={id}
        className="tool-input npc-creator-textarea"
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function downloadText(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function NpcCreator() {
  const [state, setState] = useState<NpcFgExportState>(() =>
    structuredClone(DEFAULT_NPC_FG_STATE),
  );
  const [hydrated, setHydrated] = useState(false);
  const [sheetTab, setSheetTab] = useState<SheetTab>("main");
  const [templateTab, setTemplateTab] = useState<TemplateTab>("archetypes");
  const [userTemplates, setUserTemplates] = useState<UserNpcTemplate[]>([]);
  const [appliedLayers, setAppliedLayers] = useState<string[]>([]);
  const [banner, setBanner] = useState<string | null>(null);
  const [jsonPaste, setJsonPaste] = useState("");
  const [xmlPaste, setXmlPaste] = useState("");
  const [saveName, setSaveName] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingApply | null>(null);
  const [conflicts, setConflicts] = useState<FieldConflict[]>([]);
  const [choices, setChoices] = useState<Record<string, ConflictChoice>>({});
  const [portraitSource, setPortraitSource] = useState("");
  const [tokenSource, setTokenSource] = useState("");

  useEffect(() => {
    const draft = loadDraft();
    if (draft?.identity?.name) {
      setState(draft);
      if (draft.media.portraitDataUrl) {
        setPortraitSource(draft.media.portraitDataUrl);
      }
      if (draft.media.tokenDataUrl) {
        setTokenSource(draft.media.tokenDataUrl);
      }
    }
    setUserTemplates(loadUserTemplates());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const t = window.setTimeout(() => {
      saveDraft(state);
    }, 600);
    return () => window.clearTimeout(t);
  }, [state, hydrated]);

  const xmlOut = useMemo(() => buildNpcFgXml(state), [state]);

  const patch = useCallback((fn: (s: NpcFgExportState) => void) => {
    setState((prev) => {
      const next = structuredClone(prev);
      fn(next);
      return next;
    });
  }, []);

  const finishApply = useCallback(
    (next: NpcFgExportState, layerLabel: string, note?: string) => {
      setState(next);
      setAppliedLayers((layers) =>
        layers.includes(layerLabel) ? layers : [...layers, layerLabel],
      );
      setPending(null);
      setConflicts([]);
      setChoices({});
      if (note) setBanner(note);
      setStatus(`Stacked: ${layerLabel}`);
    },
    [],
  );

  /** Stack a patch onto current state; open conflict UI when needed. */
  const requestStackPatch = useCallback(
    (name: string, layerLabel: string, incomingPatch: unknown, note?: string) => {
      const normalized = normalizeSkillPatch(incomingPatch);
      const found = detectPatchConflicts(state, normalized);
      if (found.length === 0) {
        finishApply(
          applyPatchWithChoices(state, normalized, {}),
          layerLabel,
          note,
        );
        return;
      }
      const initial: Record<string, ConflictChoice> = {};
      for (const c of found) initial[c.path] = "take";
      setPending({ name, patch: normalized, note, layerLabel });
      setConflicts(found);
      setChoices(initial);
    },
    [state, finishApply],
  );

  const applyArchetype = (id: string) => {
    const preset = ARCHETYPE_PRESETS.find((a) => a.id === id);
    if (!preset) return;
    requestStackPatch(preset.name, `Archetype: ${preset.name}`, preset.patch);
  };

  const applyLevel = (id: string) => {
    const preset = LEVEL_PRESETS.find((a) => a.id === id);
    if (!preset) return;
    requestStackPatch(preset.name, `Level: ${preset.name}`, preset.patch);
  };

  const applyMonster = (id: string) => {
    const delta = MONSTER_TEMPLATES.find((t) => t.id === id);
    if (!delta) return;
    const monsterPatch = monsterDeltaToPatch(state, delta);
    requestStackPatch(
      delta.name,
      `Monster: ${delta.name}`,
      monsterPatch,
      "Monster template stacked. Review attack lines and saves — totals are not fully auto-recalculated.",
    );
  };

  const applyUserTemplate = (id: string) => {
    const entry = userTemplates.find((t) => t.id === id);
    if (!entry) return;
    // User snapshots are full state — stack as patch of the whole export
    const { media: _m, ...rest } = entry.state;
    requestStackPatch(entry.name, `Saved: ${entry.name}`, rest);
  };

  const applySkillJson = (mode: "stack" | "replace") => {
    try {
      if (mode === "replace") {
        setState(parseNpcFgJson(jsonPaste));
        setAppliedLayers(["Skill JSON (replace)"]);
        setBanner(null);
        setStatus("JSON applied as new base.");
        return;
      }
      const raw = JSON.parse(jsonPaste) as unknown;
      const normalized = normalizeSkillPatch(raw);
      requestStackPatch("Skill JSON", "Skill JSON", normalized);
    } catch {
      setStatus("Invalid JSON.");
    }
  };

  const handleSaveTemplate = () => {
    const result = saveUserTemplate(saveName || state.identity.name, state);
    setUserTemplates(result.entries);
    if (result.ok) {
      setSaveName("");
      setStatus("Template saved to this browser.");
    } else {
      setStatus(result.error ?? "Save failed.");
    }
  };

  const updateSpell = (index: number, fn: (row: NpcFgSpellRow) => void) => {
    patch((s) => {
      const row = s.spellcasting.spells[index];
      if (!row) return;
      fn(row);
    });
  };

  return (
    <div className="tool-layout npc-creator-layout">
      {pending ? (
        <TemplateConflictModal
          templateName={pending.name}
          conflicts={conflicts}
          choices={choices}
          onChoice={(path, choice) =>
            setChoices((c) => ({ ...c, [path]: choice }))
          }
          onChooseAll={(choice) => {
            const next: Record<string, ConflictChoice> = {};
            for (const c of conflicts) next[c.path] = choice;
            setChoices(next);
          }}
          onConfirm={() => {
            if (!pending) return;
            finishApply(
              applyPatchWithChoices(state, pending.patch, choices),
              pending.layerLabel,
              pending.note,
            );
          }}
          onCancel={() => {
            setPending(null);
            setConflicts([]);
            setChoices({});
          }}
        />
      ) : null}

      <div className="tool-steps">
        {banner ? (
          <div className="npc-creator-banner" role="status">
            {banner}
          </div>
        ) : null}
        {status ? (
          <p className="npc-creator-status" role="status">
            {status}
          </p>
        ) : null}

        <section className="tool-step">
          <h2>
            <span className="tool-step-num">1</span> Templates
          </h2>
          <p className="tool-step-desc">
            Templates stack. Archetypes are role kits (no class level); Levels
            set HD/BAB/saves/CR. When fields overlap, you choose which value to
            keep.
          </p>
          {appliedLayers.length > 0 ? (
            <p className="npc-creator-applied">
              Stack: {appliedLayers.join(" → ")}
            </p>
          ) : null}
          <div className="npc-sheet-tabs npc-creator-subtabs" role="tablist">
            {(
              [
                ["archetypes", "Archetypes"],
                ["levels", "Levels"],
                ["monsters", "Monster"],
                ["mine", "My templates"],
                ["skill", "Skill JSON"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={
                  templateTab === id
                    ? "npc-sheet-tab npc-sheet-tab-active"
                    : "npc-sheet-tab"
                }
                onClick={() => setTemplateTab(id)}
              >
                {label}
              </button>
            ))}
          </div>

          {templateTab === "archetypes" && (
            <div className="npc-template-grid">
              {ARCHETYPE_PRESETS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className="npc-template-card"
                  onClick={() => applyArchetype(a.id)}
                >
                  <strong>{a.name}</strong>
                  <span>{a.description}</span>
                </button>
              ))}
            </div>
          )}

          {templateTab === "levels" && (
            <div className="npc-template-grid">
              {LEVEL_PRESETS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className="npc-template-card"
                  onClick={() => applyLevel(a.id)}
                >
                  <strong>{a.name}</strong>
                  <span>{a.description}</span>
                </button>
              ))}
            </div>
          )}

          {templateTab === "monsters" && (
            <>
              <p className="tool-step-desc">
                Layer a 3.5 monster template onto the current NPC. Conflicts
                (type, CR, abilities, etc.) ask which value to keep.
              </p>
              <div className="npc-template-grid">
                {MONSTER_TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className="npc-template-card"
                    onClick={() => applyMonster(t.id)}
                  >
                    <strong>
                      {t.name}{" "}
                      <em className="npc-template-kind">{t.kind}</em>
                    </strong>
                    <span>{t.appliesTo}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {templateTab === "mine" && (
            <>
              <div className="filter-row">
                <TextField
                  id="save-template-name"
                  label="Save current as"
                  value={saveName}
                  onChange={setSaveName}
                />
                <div className="tool-field" style={{ justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    className="tool-btn-primary"
                    onClick={handleSaveTemplate}
                  >
                    Save template
                  </button>
                </div>
              </div>
              {userTemplates.length === 0 ? (
                <p className="tool-step-desc">No saved templates yet.</p>
              ) : (
                <ul className="npc-user-template-list">
                  {userTemplates.map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        className="tool-btn-secondary"
                        onClick={() => applyUserTemplate(t.id)}
                      >
                        Stack
                      </button>
                      <input
                        className="tool-input"
                        value={t.name}
                        onChange={(e) =>
                          setUserTemplates(
                            renameUserTemplate(t.id, e.target.value),
                          )
                        }
                        aria-label="Template name"
                      />
                      <button
                        type="button"
                        className="tool-btn-secondary"
                        onClick={() =>
                          setUserTemplates(deleteUserTemplate(t.id))
                        }
                      >
                        Delete
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          {templateTab === "skill" && (
            <>
              <p className="tool-step-desc">
                Paste JSON from the Cursor skill <code>npc-fg-wiki-json</code>.
                Stack merges into the current NPC (with conflict prompts);
                Replace rebuilds from defaults.
              </p>
              <div className="tool-button-row">
                <button
                  type="button"
                  className="tool-btn-primary"
                  onClick={async () => {
                    await navigator.clipboard.writeText(NPC_FG_SKILL_MARKDOWN);
                    setStatus("Skill markdown copied to clipboard.");
                  }}
                >
                  Copy skill
                </button>
              </div>
              <details className="npc-skill-details">
                <summary>Preview skill text</summary>
                <pre className="npc-skill-pre">{NPC_FG_SKILL_MARKDOWN}</pre>
              </details>
              <TextArea
                id="npc-skill-json"
                label="Paste skill JSON"
                value={jsonPaste}
                onChange={setJsonPaste}
                rows={8}
              />
              <div className="tool-button-row">
                <button
                  type="button"
                  className="tool-btn-primary"
                  onClick={() => applySkillJson("stack")}
                >
                  Stack JSON
                </button>
                <button
                  type="button"
                  className="tool-btn-secondary"
                  onClick={() => applySkillJson("replace")}
                >
                  Replace with JSON
                </button>
              </div>
            </>
          )}
        </section>

        <section className="tool-step">
          <h2>
            <span className="tool-step-num">2</span> Identity & defense
          </h2>
          <div className="filter-row">
            <TextField
              id="npc-name"
              label="Name"
              value={state.identity.name}
              onChange={(v) =>
                patch((s) => {
                  s.identity.name = v;
                })
              }
              wide
            />
            <TextField
              id="npc-align"
              label="Alignment"
              value={state.identity.alignment}
              onChange={(v) =>
                patch((s) => {
                  s.identity.alignment = v;
                })
              }
            />
            <TextField
              id="npc-type"
              label="Type / size"
              value={state.identity.creatureTypeTag}
              onChange={(v) =>
                patch((s) => {
                  s.identity.creatureTypeTag = v;
                })
              }
              wide
            />
            <NumField
              id="npc-cr"
              label="CR"
              value={state.identity.cr}
              onChange={(v) =>
                patch((s) => {
                  s.identity.cr = v;
                })
              }
            />
            <TextField
              id="npc-la"
              label="Level adjustment"
              value={state.identity.levelAdjustment}
              onChange={(v) =>
                patch((s) => {
                  s.identity.levelAdjustment = v;
                })
              }
            />
          </div>
          <div className="filter-row">
            <TextField
              id="npc-ac"
              label="AC"
              value={state.defense.ac}
              onChange={(v) =>
                patch((s) => {
                  s.defense.ac = v;
                })
              }
              wide
            />
            <NumField
              id="npc-hp"
              label="HP"
              value={state.defense.hp}
              onChange={(v) =>
                patch((s) => {
                  s.defense.hp = v;
                })
              }
            />
            <TextField
              id="npc-hd"
              label="HD"
              value={state.defense.hd}
              onChange={(v) =>
                patch((s) => {
                  s.defense.hd = v;
                })
              }
            />
            <NumField
              id="npc-init"
              label="Init"
              value={state.defense.init}
              onChange={(v) =>
                patch((s) => {
                  s.defense.init = v;
                })
              }
            />
            <NumField
              id="npc-fort"
              label="Fort"
              value={state.defense.fort}
              onChange={(v) =>
                patch((s) => {
                  s.defense.fort = v;
                })
              }
            />
            <NumField
              id="npc-ref"
              label="Ref"
              value={state.defense.ref}
              onChange={(v) =>
                patch((s) => {
                  s.defense.ref = v;
                })
              }
            />
            <NumField
              id="npc-will"
              label="Will"
              value={state.defense.will}
              onChange={(v) =>
                patch((s) => {
                  s.defense.will = v;
                })
              }
            />
          </div>
          <div className="filter-row npc-ability-row">
            {(
              [
                ["str", "Str"],
                ["dex", "Dex"],
                ["con", "Con"],
                ["int", "Int"],
                ["wis", "Wis"],
                ["cha", "Cha"],
              ] as const
            ).map(([key, label]) => (
              <NumField
                key={key}
                id={`npc-${key}`}
                label={label}
                value={state.abilities[key]}
                onChange={(v) =>
                  patch((s) => {
                    s.abilities[key] = v;
                  })
                }
              />
            ))}
          </div>
        </section>

        <section className="tool-step">
          <h2>
            <span className="tool-step-num">3</span> Offense & skills
          </h2>
          <div className="filter-row">
            <TextField
              id="npc-speed"
              label="Speed"
              value={state.offense.speed}
              onChange={(v) =>
                patch((s) => {
                  s.offense.speed = v;
                })
              }
            />
            <TextField
              id="npc-bab"
              label="BAB / grp"
              value={state.offense.babgrp}
              onChange={(v) =>
                patch((s) => {
                  s.offense.babgrp = v;
                })
              }
            />
            <TextField
              id="npc-space"
              label="Space/Reach"
              value={state.offense.spaceReach}
              onChange={(v) =>
                patch((s) => {
                  s.offense.spaceReach = v;
                })
              }
            />
          </div>
          <TextArea
            id="npc-atk"
            label="Attack"
            value={state.offense.atk}
            onChange={(v) =>
              patch((s) => {
                s.offense.atk = v;
              })
            }
            rows={2}
          />
          <TextArea
            id="npc-fullatk"
            label="Full attack"
            value={state.offense.fullatk}
            onChange={(v) =>
              patch((s) => {
                s.offense.fullatk = v;
              })
            }
            rows={2}
          />
          <TextArea
            id="npc-sa"
            label="Special attacks"
            value={state.offense.specialattacks}
            onChange={(v) =>
              patch((s) => {
                s.offense.specialattacks = v;
              })
            }
            rows={2}
          />
          <div className="filter-row">
            <TextField
              id="npc-senses"
              label="Senses"
              value={state.senses}
              onChange={(v) =>
                patch((s) => {
                  s.senses = v;
                })
              }
              wide
            />
            <TextField
              id="npc-aura"
              label="Aura"
              value={state.aura}
              onChange={(v) =>
                patch((s) => {
                  s.aura = v;
                })
              }
            />
            <TextField
              id="npc-lang"
              label="Languages"
              value={state.languages}
              onChange={(v) =>
                patch((s) => {
                  s.languages = v;
                })
              }
            />
          </div>
          <TextArea
            id="npc-feats"
            label="Feats (display only — bake bonuses into numbers)"
            value={state.feats}
            onChange={(v) =>
              patch((s) => {
                s.feats = v;
              })
            }
            rows={2}
          />
          <TextArea
            id="npc-skills"
            label="Skills"
            value={state.skills}
            onChange={(v) =>
              patch((s) => {
                s.skills = v;
              })
            }
            rows={2}
          />
          <div className="filter-row">
            <TextField
              id="npc-dr"
              label="DR"
              value={state.dr}
              onChange={(v) =>
                patch((s) => {
                  s.dr = v;
                })
              }
            />
            <TextField
              id="npc-sr"
              label="SR"
              value={state.spellResistance}
              onChange={(v) =>
                patch((s) => {
                  s.spellResistance = v;
                })
              }
            />
            <TextField
              id="npc-immune"
              label="Immunities"
              value={state.immunities}
              onChange={(v) =>
                patch((s) => {
                  s.immunities = v;
                })
              }
            />
            <TextField
              id="npc-resist"
              label="Resistances"
              value={state.resistances}
              onChange={(v) =>
                patch((s) => {
                  s.resistances = v;
                })
              }
            />
            <TextField
              id="npc-vuln"
              label="Vulnerabilities"
              value={state.vulnerabilities}
              onChange={(v) =>
                patch((s) => {
                  s.vulnerabilities = v;
                })
              }
            />
          </div>
          <TextArea
            id="npc-sq-extra"
            label="Other special qualities"
            value={state.specialqualitiesExtra}
            onChange={(v) =>
              patch((s) => {
                s.specialqualitiesExtra = v;
              })
            }
            rows={2}
          />
        </section>

        <section className="tool-step">
          <h2>
            <span className="tool-step-num">4</span> Spells
          </h2>
          <label className="tool-checkbox">
            <input
              type="checkbox"
              checked={state.spellcasting.enabled}
              onChange={(e) =>
                patch((s) => {
                  s.spellcasting.enabled = e.target.checked;
                })
              }
            />
            Enable spellcasting
          </label>
          {state.spellcasting.enabled ? (
            <>
              <div className="filter-row">
                <TextField
                  id="npc-caster-label"
                  label="Caster label"
                  value={state.spellcasting.label}
                  onChange={(v) =>
                    patch((s) => {
                      s.spellcasting.label = v;
                    })
                  }
                />
                <NumField
                  id="npc-cl"
                  label="Caster level"
                  value={state.spellcasting.casterLevel}
                  onChange={(v) =>
                    patch((s) => {
                      s.spellcasting.casterLevel = v;
                    })
                  }
                />
                <div className="tool-field">
                  <Label htmlFor="npc-spell-mode">Mode</Label>
                  <select
                    id="npc-spell-mode"
                    className="tool-select"
                    value={state.spellcasting.mode}
                    onChange={(e) =>
                      patch((s) => {
                        s.spellcasting.mode =
                          e.target.value === "spontaneous"
                            ? "spontaneous"
                            : "preparation";
                      })
                    }
                  >
                    <option value="preparation">Preparation</option>
                    <option value="spontaneous">Spontaneous</option>
                  </select>
                </div>
                <div className="tool-field">
                  <Label htmlFor="npc-dc-ability">DC ability</Label>
                  <select
                    id="npc-dc-ability"
                    className="tool-select"
                    value={state.spellcasting.dcAbility}
                    onChange={(e) =>
                      patch((s) => {
                        const v = e.target.value;
                        s.spellcasting.dcAbility =
                          v === "intelligence" || v === "charisma"
                            ? v
                            : "wisdom";
                      })
                    }
                  >
                    <option value="wisdom">Wisdom</option>
                    <option value="intelligence">Intelligence</option>
                    <option value="charisma">Charisma</option>
                  </select>
                </div>
              </div>
              <div className="filter-row npc-slot-row">
                {state.spellcasting.slots.map((n, i) => (
                  <NumField
                    key={i}
                    id={`npc-slot-${i}`}
                    label={`L${i}`}
                    value={n}
                    onChange={(v) =>
                      patch((s) => {
                        s.spellcasting.slots[i] = Math.max(0, v);
                      })
                    }
                  />
                ))}
              </div>
              <div className="tool-button-row">
                <button
                  type="button"
                  className="tool-btn-secondary"
                  onClick={() =>
                    patch((s) => {
                      s.spellcasting.spells.push(DEFAULT_SPELL_ROW());
                    })
                  }
                >
                  Add spell
                </button>
              </div>
              {state.spellcasting.spells.map((sp, i) => (
                <div key={i} className="npc-spell-card">
                  <div className="filter-row">
                    <NumField
                      id={`sp-lvl-${i}`}
                      label="Level"
                      value={sp.level}
                      onChange={(v) =>
                        updateSpell(i, (row) => {
                          row.level = Math.min(9, Math.max(0, v));
                        })
                      }
                    />
                    <TextField
                      id={`sp-name-${i}`}
                      label="Name"
                      value={sp.name}
                      onChange={(v) =>
                        updateSpell(i, (row) => {
                          row.name = v;
                        })
                      }
                    />
                    <NumField
                      id={`sp-prep-${i}`}
                      label="Prepared"
                      value={sp.prepared}
                      onChange={(v) =>
                        updateSpell(i, (row) => {
                          row.prepared = Math.max(0, v);
                        })
                      }
                    />
                    <div className="tool-field" style={{ justifyContent: "flex-end" }}>
                      <button
                        type="button"
                        className="tool-btn-secondary"
                        onClick={() =>
                          patch((s) => {
                            s.spellcasting.spells.splice(i, 1);
                          })
                        }
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              <TextArea
                id="npc-spellset-override"
                label="Raw spellset XML override (optional)"
                value={state.spellcasting.spellsetXmlOverride}
                onChange={(v) =>
                  patch((s) => {
                    s.spellcasting.spellsetXmlOverride = v;
                  })
                }
                rows={4}
              />
            </>
          ) : null}
        </section>

        <section className="tool-step">
          <h2>
            <span className="tool-step-num">5</span> Notes (Other)
          </h2>
          <div className="filter-row">
            <TextField
              id="npc-adv"
              label="Advancement"
              value={state.identity.advancement}
              onChange={(v) =>
                patch((s) => {
                  s.identity.advancement = v;
                })
              }
            />
            <TextField
              id="npc-org"
              label="Organization"
              value={state.identity.organization}
              onChange={(v) =>
                patch((s) => {
                  s.identity.organization = v;
                })
              }
            />
            <TextField
              id="npc-env"
              label="Environment"
              value={state.identity.environment}
              onChange={(v) =>
                patch((s) => {
                  s.identity.environment = v;
                })
              }
            />
            <TextField
              id="npc-treasure"
              label="Treasure"
              value={state.identity.treasure}
              onChange={(v) =>
                patch((s) => {
                  s.identity.treasure = v;
                })
              }
            />
          </div>
          <TextArea
            id="npc-notes"
            label="Notes (FG HTML)"
            value={state.notesFormattedHtml}
            onChange={(v) =>
              patch((s) => {
                s.notesFormattedHtml = v;
              })
            }
            rows={5}
          />
          <TextField
            id="npc-magic-notes"
            label="Magical effects note"
            value={state.magicalEffectsNotes}
            onChange={(v) =>
              patch((s) => {
                s.magicalEffectsNotes = v;
              })
            }
            wide
          />
        </section>

        <section className="tool-step">
          <h2>
            <span className="tool-step-num">6</span> FG image paths
          </h2>
          <p className="tool-step-desc">
            Set portrait/token visually in the Fantasy Grounds preview (Choose →
            pan/zoom). Paths below are written into the downloadable XML for FG
            modules (<code>images/file@Module</code>).
          </p>
          <div className="filter-row">
            <TextField
              id="npc-picture-path"
              label="FG picture path"
              value={state.media.picturePath}
              onChange={(v) =>
                patch((s) => {
                  s.media.picturePath = v;
                })
              }
              wide
            />
            <TextField
              id="npc-token-path"
              label="FG token path"
              value={state.media.tokenPath}
              onChange={(v) =>
                patch((s) => {
                  s.media.tokenPath = v;
                })
              }
              wide
            />
            <TextField
              id="npc-token3d-path"
              label="FG token3Dflat path"
              value={state.media.token3DPath}
              onChange={(v) =>
                patch((s) => {
                  s.media.token3DPath = v;
                })
              }
              wide
            />
          </div>
        </section>

        <section className="tool-step">
          <h2>
            <span className="tool-step-num">7</span> Export
          </h2>
          <div className="tool-button-row">
            <button
              type="button"
              className="tool-btn-primary"
              onClick={() =>
                downloadText(
                  `${toSlug(state.identity.name)}.xml`,
                  xmlOut,
                  "application/xml",
                )
              }
            >
              Download .xml
            </button>
            <button
              type="button"
              className="tool-btn-secondary"
              onClick={async () => {
                await navigator.clipboard.writeText(xmlOut);
                setStatus("XML copied.");
              }}
            >
              Copy XML
            </button>
            <button
              type="button"
              className="tool-btn-secondary"
              onClick={() =>
                downloadText(
                  `${toSlug(state.identity.name)}.json`,
                  JSON.stringify(state, null, 2),
                  "application/json",
                )
              }
            >
              Download JSON
            </button>
            <button
              type="button"
              className="tool-btn-secondary"
              onClick={() => {
                setState(structuredClone(DEFAULT_NPC_FG_STATE));
                setAppliedLayers([]);
                setBanner(null);
                setStatus("Reset to default.");
              }}
            >
              Reset
            </button>
          </div>
          <p className="tool-step-desc">
            Skill JSON import lives under Templates →{" "}
            <button
              type="button"
              className="npc-inline-link"
              onClick={() => setTemplateTab("skill")}
            >
              Skill JSON
            </button>{" "}
            (Copy skill + Stack / Replace).
          </p>
          <TextArea
            id="npc-xml-paste"
            label="Paste FG XML → Apply"
            value={xmlPaste}
            onChange={setXmlPaste}
            rows={4}
          />
          <div className="tool-button-row">
            <button
              type="button"
              className="tool-btn-secondary"
              onClick={() => {
                try {
                  setState(parseNpcFgXml(xmlPaste));
                  setStatus("XML imported.");
                } catch (e) {
                  setStatus(
                    e instanceof Error ? e.message : "Invalid XML.",
                  );
                }
              }}
            >
              Apply XML
            </button>
          </div>
          <details className="npc-xml-preview">
            <summary>Generated XML preview</summary>
            <pre>{xmlOut}</pre>
          </details>
        </section>
      </div>

      <NpcSheetPreview
        state={state}
        tab={sheetTab}
        onTabChange={setSheetTab}
        portraitSource={portraitSource}
        tokenSource={tokenSource}
        onPortraitSourceChange={setPortraitSource}
        onTokenSourceChange={setTokenSource}
        onPortraitChange={(dataUrl) =>
          patch((s) => {
            s.media.portraitDataUrl = dataUrl;
          })
        }
        onTokenChange={(dataUrl) =>
          patch((s) => {
            s.media.tokenDataUrl = dataUrl;
          })
        }
      />
    </div>
  );
}
