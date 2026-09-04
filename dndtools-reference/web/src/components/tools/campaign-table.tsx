"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import {
  attachPcToCampaign,
  createPcInCampaign,
  deleteCampaign,
  getCampaignPcPlan,
  getCampaignTable,
  inviteByUsername,
  kickMember,
  leaveCampaign,
  unlinkPcFromCampaign,
  type CampaignPcPlanResult,
} from "@/actions/campaigns";
import { getUserPcPlans, renamePcPlan, savePcPlan, type PcPlanSummary } from "@/actions/pc-plans";
import { fetchPcCompendium } from "@/actions/data";
import { useAuthUser } from "@/components/auth-provider";
import { DiceCanvas } from "@/components/dice/dice-canvas";
import { DiceLogTray } from "@/components/dice/dice-log-tray";
import { DiceProvider, useDice } from "@/components/dice/dice-provider";
import { DiceTray } from "@/components/dice/dice-tray";
import { useSessionNonce } from "@/components/session-provider";
import { PcSheet } from "@/components/tools/pc-sheet";
import type { CampaignTableState } from "@/lib/campaign/types";
import { rollViewToResult } from "@/lib/campaign/types";
import type { PcCompendiumBundle } from "@/lib/entities";
import { createBlankInventoryRow } from "@/lib/pc-planner/inventoryItem";
import { finalizePcPlanState } from "@/lib/pc-planner/syncState";
import { computeSpellClass } from "@/lib/pc-planner/spellSlots";
import {
  applyDerivedFromRace,
  applyRaceCombatBasicsOnRaceChange,
} from "@/lib/pc-planner/syncDerived";
import {
  classSkillKeySet,
  compendiumSyncKey,
  mergeSkillsIntoRows,
} from "@/lib/pc-planner/syncSkills";
import type { AbilityKey, PcPlanState, PcSheetTab } from "@/lib/pc-planner/types";

type SaveStatus = "idle" | "saving" | "saved" | "error";

function CampaignCharacterNameSync({ name }: { name: string }) {
  const { setCharacterName } = useDice();
  useEffect(() => {
    setCharacterName(name);
  }, [name, setCharacterName]);
  return null;
}

export function CampaignTable({ campaignId }: { campaignId: string }) {
  const user = useAuthUser();
  const [table, setTable] = useState<CampaignTableState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const refresh = useCallback(() => {
    startTransition(async () => {
      const next = await getCampaignTable(campaignId);
      if (!next) {
        setError("Campaign not found or you are not a member.");
        setTable(null);
        return;
      }
      if (next.myStatus === "pending") {
        setError("Accept your invite from the campaign list first.");
        setTable(next);
        return;
      }
      setTable(next);
      setError(null);
    });
  }, [campaignId]);

  useEffect(() => {
    if (!user) return;
    refresh();
  }, [user, refresh]);

  // Live roster updates via SSE
  useEffect(() => {
    if (!user || !table || table.myStatus !== "active") return;
    const es = new EventSource(`/tools/campaign/${campaignId}/live`);
    es.onmessage = (msg) => {
      try {
        const event = JSON.parse(msg.data) as {
          type: string;
          members?: CampaignTableState["members"];
          pcs?: CampaignTableState["pcs"];
        };
        if (event.type === "roster" && event.members && event.pcs) {
          setTable((prev) =>
            prev
              ? { ...prev, members: event.members!, pcs: event.pcs! }
              : prev,
          );
        }
      } catch {
        // ignore
      }
    };
    return () => es.close();
  }, [user, campaignId, table?.myStatus]);

  if (!user) {
    return (
      <div className="pc-planner-auth-gate">
        <p>Sign in to open this campaign.</p>
        <Link href={`/login?next=/tools/campaign/${campaignId}`} className="tool-btn">
          Sign in
        </Link>
      </div>
    );
  }

  if (!table && !error) {
    return <p className="pc-planner-loading">Loading campaign…</p>;
  }

  if (!table) {
    return (
      <div className="campaign-home">
        <p className="tool-error">{error}</p>
        <Link href="/tools/campaign" className="tool-btn tool-btn--ghost">
          Back to campaigns
        </Link>
      </div>
    );
  }

  const initialHistory = table.rolls
    .map((r) => rollViewToResult(r))
    .filter((r): r is NonNullable<typeof r> => r != null);

  return (
    <DiceProvider
      campaign={{
        campaignId,
        actor: {
          userId: user.id,
          username: user.username,
          characterName: null,
        },
        isDm: table.myRole === "dm",
        initialHistory,
      }}
    >
      <CampaignTableBody
        table={table}
        setTable={setTable}
        error={error}
        setError={setError}
        pending={pending}
        startTransition={startTransition}
        refresh={refresh}
      />
    </DiceProvider>
  );
}

function CampaignTableBody({
  table,
  setTable,
  error,
  setError,
  pending,
  startTransition,
  refresh,
}: {
  table: CampaignTableState;
  setTable: (t: CampaignTableState | null) => void;
  error: string | null;
  setError: (e: string | null) => void;
  pending: boolean;
  startTransition: (fn: () => void) => void;
  refresh: () => void;
}) {
  const user = useAuthUser()!;
  const router = useRouter();
  const nonce = useSessionNonce();
  const isDm = table.myRole === "dm";

  const [selectedPcPlanId, setSelectedPcPlanId] = useState<string | null>(
    () => table.pcs.find((p) => p.userId === user.id)?.pcPlanId ?? table.pcs[0]?.pcPlanId ?? null,
  );
  const [plan, setPlan] = useState<CampaignPcPlanResult | null>(null);
  const [state, setState] = useState<PcPlanState | null>(null);
  const [shortcut, setShortcut] = useState("");
  const [sheetTab, setSheetTab] = useState<PcSheetTab>("main");
  const [activeSpellClassIndex, setActiveSpellClassIndex] = useState(0);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [hydrated, setHydrated] = useState(false);
  const [compendium, setCompendium] = useState<PcCompendiumBundle | null>(null);
  const [compendiumLoading, setCompendiumLoading] = useState(false);
  const [myPlans, setMyPlans] = useState<PcPlanSummary[]>([]);
  const [inviteUsername, setInviteUsername] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [copied, setCopied] = useState(false);
  const saveTimer = useRef<number | null>(null);
  const lastCompendiumSync = useRef("");
  const lastRaceSlug = useRef<string | null | undefined>(undefined);

  const visiblePcs = useMemo(() => {
    if (isDm) return table.pcs;
    return table.pcs.filter((p) => p.userId === user.id);
  }, [isDm, table.pcs, user.id]);

  useEffect(() => {
    if (selectedPcPlanId && !visiblePcs.some((p) => p.pcPlanId === selectedPcPlanId)) {
      setSelectedPcPlanId(visiblePcs[0]?.pcPlanId ?? null);
    }
  }, [visiblePcs, selectedPcPlanId]);

  const loadPlan = useCallback(
    (pcPlanId: string | null) => {
      if (!pcPlanId) {
        setPlan(null);
        setState(null);
        setHydrated(true);
        return;
      }
      setHydrated(false);
      startTransition(async () => {
        const loaded = await getCampaignPcPlan(table.id, pcPlanId);
        if (!loaded) {
          setError("Character not available");
          setPlan(null);
          setState(null);
          setHydrated(true);
          return;
        }
        lastCompendiumSync.current = "";
        lastRaceSlug.current = undefined;
        setPlan(loaded);
        setShortcut(loaded.shortcut ?? "");
        setState(loaded.state);
        setHydrated(true);
      });
    },
    [table.id, setError, startTransition],
  );

  useEffect(() => {
    loadPlan(selectedPcPlanId);
  }, [selectedPcPlanId, loadPlan]);

  const patch = useCallback(
    (fn: (draft: PcPlanState) => void) => {
      if (!plan?.canEdit) return;
      setState((prev) => {
        if (!prev) return prev;
        const draft = structuredClone(prev);
        fn(draft);
        return finalizePcPlanState(
          draft,
          compendium?.raceFeatures ?? null,
          compendium?.classSpellTables ?? {},
          compendium?.classHitDice ?? {},
        );
      });
    },
    [
      plan?.canEdit,
      compendium?.raceFeatures,
      compendium?.classSpellTables,
      compendium?.classHitDice,
    ],
  );

  // Auto-save for owners
  useEffect(() => {
    if (!hydrated || !plan?.canEdit || !state || !plan) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      setSaveStatus("saving");
      startTransition(async () => {
        const result = await savePcPlan(plan.id, state);
        setSaveStatus(result.success ? "saved" : "error");
      });
    }, 600);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [state, hydrated, plan, startTransition]);

  const compendiumKeyValue = state
    ? compendiumSyncKey(state.identity.classLevels, state.identity.raceSlug)
    : "";

  useEffect(() => {
    if (!hydrated || !state || !nonce) return;
    if (!plan?.canEdit && compendium) return;

    const syncKey = `${compendiumKeyValue}:${nonce}:${plan?.canEdit ? "edit" : "view"}`;
    if (syncKey === lastCompendiumSync.current) return;
    lastCompendiumSync.current = syncKey;
    setCompendiumLoading(true);
    startTransition(async () => {
      const result = await fetchPcCompendium({
        classLevels: state.identity.classLevels,
        raceSlug: state.identity.raceSlug,
        nonce,
      });
      if (!result.success || !result.bundle) {
        setCompendiumLoading(false);
        return;
      }
      setCompendium(result.bundle);
      if (!plan?.canEdit) {
        setCompendiumLoading(false);
        return;
      }
      setState((prev) => {
        if (!prev) return prev;
        const next = structuredClone(prev);
        if (result.bundle!.allSkills.length > 0 || result.bundle!.skills.length > 0) {
          next.skills = mergeSkillsIntoRows(
            result.bundle!.allSkills.length > 0
              ? result.bundle!.allSkills
              : result.bundle!.skills.map((ref) => ({
                  name: ref.name,
                  slug: ref.slug,
                  ability: ref.ability,
                  trainedOnly: false,
                  armorCheckPenalty: false,
                })),
            prev.skills,
            classSkillKeySet(result.bundle!.skills),
          );
        } else if (prev.identity.classLevels.length === 0) {
          next.skills = [];
        }
        const raceSlug = prev.identity.raceSlug ?? null;
        const raceChanged =
          lastRaceSlug.current !== undefined && lastRaceSlug.current !== raceSlug;
        if (raceChanged && result.bundle!.raceFeatures) {
          applyRaceCombatBasicsOnRaceChange(next, result.bundle!.raceFeatures);
        }
        lastRaceSlug.current = raceSlug;
        applyDerivedFromRace(next, result.bundle!.raceFeatures);
        return finalizePcPlanState(
          next,
          result.bundle!.raceFeatures,
          result.bundle!.classSpellTables,
          result.bundle!.classHitDice,
        );
      });
      setCompendiumLoading(false);
    });
  }, [hydrated, state, plan?.canEdit, nonce, compendiumKeyValue, startTransition, compendium]);

  function updateAbility(key: AbilityKey, value: number) {
    const next = Number.isFinite(value) ? Math.max(1, Math.min(99, Math.round(value))) : 10;
    patch((s) => {
      if (!s.abilityBase) s.abilityBase = { ...s.abilities };
      s.abilityBase[key] = next;
    });
  }

  const joinUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/tools/campaign?join=${table.joinCode}`
      : `/tools/campaign?join=${table.joinCode}`;

  let sheetBody: ReactNode = null;
  if (!selectedPcPlanId) {
    sheetBody = (
      <p className="pc-sheet-empty">
        {isDm
          ? "No characters attached yet. Players can create or import PCs from the roster."
          : "Attach or create a character to roll from the sheet."}
      </p>
    );
  } else if (!hydrated || !state || !plan) {
    sheetBody = <p className="pc-planner-loading">Loading character…</p>;
  } else {
    sheetBody = (
      <>
        <CampaignCharacterNameSync name={state.identity.name} />
        <div className="campaign-sheet-status">
          <span>
            {plan.canEdit ? "Editing" : "Viewing (read-only)"} ·{" "}
            {saveStatus === "saving"
              ? "Saving…"
              : saveStatus === "saved"
                ? "Saved"
                : saveStatus === "error"
                  ? "Save error"
                  : ""}
          </span>
        </div>
        <PcSheet
          state={state}
          patch={patch}
          sheetTab={sheetTab}
          onTabChange={setSheetTab}
          shortcut={shortcut}
          onShortcutChange={setShortcut}
          onNameBlur={() => {
            if (!plan.canEdit || !state) return;
            void renamePcPlan(plan.id, state.identity.name, shortcut);
          }}
          onShortcutBlur={() => {
            if (!plan.canEdit || !state) return;
            void renamePcPlan(plan.id, state.identity.name, shortcut);
          }}
          activeSpellClassIndex={activeSpellClassIndex}
          onSpellClassIndexChange={setActiveSpellClassIndex}
          compendium={compendium}
          compendiumLoading={compendiumLoading}
          onAddFeat={(slug, name) =>
            patch((s) => {
              if (s.feats.some((f) => f.slug === slug)) return;
              s.feats.push({ slug, name });
            })
          }
          onRemoveFeat={(slug) =>
            patch((s) => {
              s.feats = s.feats.filter((f) => f.slug !== slug);
            })
          }
          onAddSpell={(slug, name, level) =>
            patch((s) => {
              const target = s.spellClasses[activeSpellClassIndex];
              if (!target || target.spells.some((sp) => sp.slug === slug)) return;
              const computed = computeSpellClass(
                target.classSlug,
                target.label,
                target.casterLevel,
                s.abilities,
                compendium?.classSpellTables?.[target.classSlug],
                {
                  hasDomains: (s.identity.domains?.length ?? 0) > 0,
                  specialistSchool: s.identity.specialistSchool,
                },
              );
              if (computed.mode === "spontaneous") {
                const atLevel = target.spells.filter((sp) => sp.level === level).length;
                const knownLimit = computed.known[level] ?? 0;
                if (knownLimit > 0 && atLevel >= knownLimit) return;
              }
              target.spells.push({
                slug,
                name,
                level,
                prepared: computed.mode === "preparation" ? 1 : undefined,
              });
            })
          }
          onRemoveSpell={(slug) =>
            patch((s) => {
              const target = s.spellClasses[activeSpellClassIndex];
              if (!target) return;
              target.spells = target.spells.filter((sp) => sp.slug !== slug);
            })
          }
          onUpdateSpellPrepared={(slug, prepared) =>
            patch((s) => {
              const target = s.spellClasses[activeSpellClassIndex];
              if (!target) return;
              const spell = target.spells.find((sp) => sp.slug === slug);
              if (!spell) return;
              spell.prepared = Math.max(0, prepared);
            })
          }
          onAddInventoryRow={() =>
            patch((s) => {
              s.inventory.push(createBlankInventoryRow());
            })
          }
          updateAbility={updateAbility}
          readOnly={!plan.canEdit}
        />
      </>
    );
  }

  return (
    <>
      <div className="campaign-table">
        {error ? <p className="tool-error">{error}</p> : null}

        <header className="campaign-table-header">
          <div>
            <h2 className="campaign-table-title">{table.name}</h2>
            <p className="campaign-table-sub">
              You are {isDm ? "the DM" : "a player"} · Hold Ctrl (Cmd on Mac) while rolling to
              hide the result from other players
            </p>
          </div>
          <div className="campaign-table-header-actions">
            <Link href="/tools/campaign" className="tool-btn tool-btn--ghost">
              All campaigns
            </Link>
            {isDm ? (
              <button
                type="button"
                className="tool-btn tool-btn--danger"
                disabled={pending}
                onClick={() => {
                  if (!confirm("Delete this campaign for everyone?")) return;
                  startTransition(async () => {
                    const r = await deleteCampaign(table.id);
                    if (r.success) router.push("/tools/campaign");
                    else setError(r.error ?? "Could not delete");
                  });
                }}
              >
                Delete
              </button>
            ) : (
              <button
                type="button"
                className="tool-btn tool-btn--ghost"
                disabled={pending}
                onClick={() => {
                  if (!confirm("Leave this campaign?")) return;
                  startTransition(async () => {
                    const r = await leaveCampaign(table.id);
                    if (r.success) router.push("/tools/campaign");
                    else setError(r.error ?? "Could not leave");
                  });
                }}
              >
                Leave
              </button>
            )}
          </div>
        </header>

        <div className="campaign-table-layout">
          <aside className="campaign-roster">
            {isDm ? (
              <section className="campaign-roster-section">
                <h3>Invite</h3>
                <p className="campaign-roster-hint">
                  Code: <strong>{table.joinCode}</strong>
                </p>
                <button
                  type="button"
                  className="tool-btn tool-btn--ghost"
                  onClick={() => {
                    void navigator.clipboard.writeText(joinUrl).then(() => {
                      setCopied(true);
                      window.setTimeout(() => setCopied(false), 1500);
                    });
                  }}
                >
                  {copied ? "Copied!" : "Copy join link"}
                </button>
                <div className="campaign-home-row">
                  <input
                    type="text"
                    className="pc-sheet-input"
                    placeholder="Username"
                    value={inviteUsername}
                    onChange={(e) => setInviteUsername(e.target.value)}
                    disabled={pending}
                  />
                  <button
                    type="button"
                    className="tool-btn"
                    disabled={pending || !inviteUsername.trim()}
                    onClick={() =>
                      startTransition(async () => {
                        const r = await inviteByUsername(table.id, inviteUsername);
                        if (!r.success) setError(r.error ?? "Invite failed");
                        else {
                          setInviteUsername("");
                          refresh();
                        }
                      })
                    }
                  >
                    Invite
                  </button>
                </div>
              </section>
            ) : null}

            <section className="campaign-roster-section">
              <h3>Members</h3>
              <ul className="campaign-roster-list">
                {table.members.map((m) => (
                  <li key={m.id}>
                    <span>
                      {m.username}
                      {m.role === "dm" ? " (DM)" : ""}
                      {m.status === "pending" ? " · pending" : ""}
                    </span>
                    {isDm && m.role !== "dm" && m.status === "active" ? (
                      <button
                        type="button"
                        className="tool-btn tool-btn--ghost"
                        disabled={pending}
                        onClick={() =>
                          startTransition(async () => {
                            const r = await kickMember(table.id, m.userId);
                            if (!r.success) setError(r.error ?? "Kick failed");
                            else refresh();
                          })
                        }
                      >
                        Kick
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>

            <section className="campaign-roster-section">
              <h3>Characters</h3>
              <ul className="campaign-roster-list">
                {visiblePcs.map((pc) => (
                  <li key={pc.id}>
                    <button
                      type="button"
                      className={`campaign-pc-select${
                        selectedPcPlanId === pc.pcPlanId ? " campaign-pc-select--active" : ""
                      }`}
                      onClick={() => setSelectedPcPlanId(pc.pcPlanId)}
                    >
                      <strong>{pc.name}</strong>
                      <span>
                        {pc.classSummary} · {pc.username}
                      </span>
                    </button>
                    {(isDm || pc.userId === user.id) && (
                      <button
                        type="button"
                        className="tool-btn tool-btn--ghost"
                        disabled={pending}
                        onClick={() =>
                          startTransition(async () => {
                            const r = await unlinkPcFromCampaign(table.id, pc.id);
                            if (!r.success) setError(r.error ?? "Unlink failed");
                            else refresh();
                          })
                        }
                      >
                        Unlink
                      </button>
                    )}
                  </li>
                ))}
              </ul>

              <div className="campaign-pc-actions">
                <button
                  type="button"
                  className="tool-btn"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const r = await createPcInCampaign(table.id);
                      if (!r.success || !r.planId) {
                        setError(r.error ?? "Could not create PC");
                        return;
                      }
                      refresh();
                      setSelectedPcPlanId(r.planId);
                    })
                  }
                >
                  Create PC
                </button>
                <button
                  type="button"
                  className="tool-btn tool-btn--ghost"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const plans = await getUserPcPlans();
                      setMyPlans(plans);
                      setShowImport(true);
                    })
                  }
                >
                  Import PC
                </button>
              </div>

              {showImport ? (
                <div className="campaign-import">
                  <p>Attach an existing character from PC Planner:</p>
                  <ul className="campaign-roster-list">
                    {myPlans.map((p) => (
                      <li key={p.id}>
                        <span>
                          {p.name} · {p.classSummary}
                        </span>
                        <button
                          type="button"
                          className="tool-btn"
                          disabled={pending}
                          onClick={() =>
                            startTransition(async () => {
                              const r = await attachPcToCampaign(table.id, p.id);
                              if (!r.success) {
                                setError(r.error ?? "Could not attach");
                                return;
                              }
                              setShowImport(false);
                              refresh();
                              setSelectedPcPlanId(p.id);
                            })
                          }
                        >
                          Attach
                        </button>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    className="tool-btn tool-btn--ghost"
                    onClick={() => setShowImport(false)}
                  >
                    Cancel
                  </button>
                </div>
              ) : null}
            </section>
          </aside>

          <div className="campaign-sheet-pane">{sheetBody}</div>
        </div>
      </div>

      <DiceCanvas />
      <DiceTray />
      <DiceLogTray />
    </>
  );
}
