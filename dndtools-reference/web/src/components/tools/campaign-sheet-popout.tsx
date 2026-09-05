"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  getCampaignPcPlan,
  getCampaignTable,
  type CampaignPcPlanResult,
} from "@/actions/campaigns";
import { renamePcPlan, savePcPlan } from "@/actions/pc-plans";
import { fetchPcCompendium } from "@/actions/data";
import { useAuthUser } from "@/components/auth-provider";
import { DiceCanvas } from "@/components/dice/dice-canvas";
import { DiceLogTray } from "@/components/dice/dice-log-tray";
import { DiceProvider, useDice } from "@/components/dice/dice-provider";
import { DiceTray } from "@/components/dice/dice-tray";
import { useSessionNonce } from "@/components/session-provider";
import { PcSheet } from "@/components/tools/pc-sheet";
import {
  campaignSheetPopoutChannelName,
  type CampaignSheetPopoutMessage,
} from "@/lib/campaign/immersive";
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

function CharacterNameSync({ name }: { name: string }) {
  const { setCharacterName } = useDice();
  useEffect(() => {
    setCharacterName(name);
  }, [name, setCharacterName]);
  return null;
}

export function CampaignSheetPopout({
  campaignId,
  pcPlanId,
}: {
  campaignId: string;
  pcPlanId: string;
}) {
  const user = useAuthUser();
  const [table, setTable] = useState<CampaignTableState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!user) return;
    startTransition(async () => {
      const next = await getCampaignTable(campaignId);
      if (!next || next.myStatus !== "active") {
        setError("Campaign not found or you are not an active member.");
        setTable(null);
        return;
      }
      setTable(next);
      setError(null);
    });
  }, [user, campaignId]);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(campaignSheetPopoutChannelName(campaignId));
    const opened: CampaignSheetPopoutMessage = { type: "opened", pcPlanId };
    channel.postMessage(opened);

    function onUnload() {
      const closed: CampaignSheetPopoutMessage = { type: "closed", pcPlanId };
      try {
        channel.postMessage(closed);
      } catch {
        // ignore
      }
    }

    window.addEventListener("pagehide", onUnload);
    return () => {
      onUnload();
      window.removeEventListener("pagehide", onUnload);
      channel.close();
    };
  }, [campaignId, pcPlanId]);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(campaignSheetPopoutChannelName(campaignId));
    channel.onmessage = (event: MessageEvent<CampaignSheetPopoutMessage>) => {
      if (event.data?.type === "focus" && event.data.pcPlanId === pcPlanId) {
        window.focus();
      }
    };
    return () => channel.close();
  }, [campaignId, pcPlanId]);

  if (!user) {
    return (
      <div className="pc-planner-auth-gate">
        <p>Sign in to open this character sheet.</p>
        <Link
          href={`/login?next=/tools/campaign/${campaignId}/sheet/${pcPlanId}`}
          className="tool-btn"
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (!table && !error) {
    return <p className="pc-planner-loading">Loading…</p>;
  }

  if (!table) {
    return (
      <div className="campaign-home">
        <p className="tool-error">{error}</p>
        <Link href={`/tools/campaign/${campaignId}`} className="tool-btn tool-btn--ghost">
          Back to table
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
      <CampaignSheetPopoutBody
        campaignId={campaignId}
        pcPlanId={pcPlanId}
        pending={pending}
        startTransition={startTransition}
      />
    </DiceProvider>
  );
}

function CampaignSheetPopoutBody({
  campaignId,
  pcPlanId,
  pending,
  startTransition,
}: {
  campaignId: string;
  pcPlanId: string;
  pending: boolean;
  startTransition: (fn: () => void) => void;
}) {
  const nonce = useSessionNonce();
  const [plan, setPlan] = useState<CampaignPcPlanResult | null>(null);
  const [state, setState] = useState<PcPlanState | null>(null);
  const [shortcut, setShortcut] = useState("");
  const [sheetTab, setSheetTab] = useState<PcSheetTab>("main");
  const [activeSpellClassIndex, setActiveSpellClassIndex] = useState(0);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [compendium, setCompendium] = useState<PcCompendiumBundle | null>(null);
  const [compendiumLoading, setCompendiumLoading] = useState(false);
  const saveTimer = useRef<number | null>(null);
  const lastCompendiumSync = useRef("");
  const lastRaceSlug = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    setHydrated(false);
    startTransition(async () => {
      const loaded = await getCampaignPcPlan(campaignId, pcPlanId);
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
      setError(null);
      setHydrated(true);
    });
  }, [campaignId, pcPlanId, startTransition]);

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

  function focusTable() {
    if (window.opener && !window.opener.closed) {
      try {
        window.opener.focus();
        return;
      } catch {
        // fall through
      }
    }
    window.location.href = `/tools/campaign/${campaignId}`;
  }

  const statusLabel = plan
    ? [
        plan.canEdit ? "Editing" : "Viewing (read-only)",
        saveStatus === "saving"
          ? "Saving…"
          : saveStatus === "saved"
            ? "Saved"
            : saveStatus === "error"
              ? "Save error"
              : "",
      ]
        .filter(Boolean)
        .join(" · ")
    : "";

  const characterName = state?.identity.name || plan?.name || "Character";

  return (
    <>
      <div className="campaign-sheet-popout">
        <header className="campaign-sheet-popout-header">
          <div>
            <h1>{characterName}</h1>
            {statusLabel ? <p className="campaign-sheet-popout-status">{statusLabel}</p> : null}
          </div>
          <button type="button" className="tool-btn tool-btn--ghost" onClick={focusTable}>
            Back to table
          </button>
        </header>

        <div className="campaign-sheet-popout-body">
          {error ? <p className="tool-error">{error}</p> : null}
          {!hydrated || !state || !plan ? (
            <p className="pc-planner-loading">{pending ? "Loading character…" : "Loading character…"}</p>
          ) : (
            <>
              <CharacterNameSync name={state.identity.name} />
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
                planId={plan.id}
                readOnly={!plan.canEdit}
              />
            </>
          )}
        </div>
      </div>

      <DiceCanvas />
      <DiceTray />
      <DiceLogTray />
    </>
  );
}
