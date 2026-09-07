"use client";

import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  getCampaignPcPlan,
  type CampaignPcPlanResult,
} from "@/actions/campaigns";
import { renamePcPlan, savePcPlan } from "@/actions/pc-plans";
import { fetchPcCompendium } from "@/actions/data";
import { useDice } from "@/components/dice/dice-provider";
import { useSessionNonce } from "@/components/session-provider";
import { CampaignPcWindow } from "@/components/tools/campaign-pc-window";
import { PcSheet } from "@/components/tools/pc-sheet";
import { pcImagePublicUrl } from "@/lib/storage/pc-image-url";
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

type PcUpdatedEvent = {
  pcPlanId: string;
  actorUserId: string;
  updatedAt: string;
} | null;

export type CampaignSheetInstanceProps = {
  campaignId: string;
  pcPlanId: string;
  fallbackName: string;
  fallbackTokenImageUrl: string | null;
  viewerUserId: string;
  cascadeIndex: number;
  zIndex: number;
  focused: boolean;
  poppedOut: boolean;
  restoreRequest: number;
  pcUpdatedEvent: PcUpdatedEvent;
  onFocus: (pcPlanId: string) => void;
  onClose: (pcPlanId: string) => void;
  onPopOut: (pcPlanId: string) => void;
  onFocusPopOut: (pcPlanId: string) => void;
  onError: (message: string) => void;
};

export const CampaignSheetInstance = memo(function CampaignSheetInstance({
  campaignId,
  pcPlanId,
  fallbackName,
  fallbackTokenImageUrl,
  viewerUserId,
  cascadeIndex,
  zIndex,
  focused,
  poppedOut,
  restoreRequest,
  pcUpdatedEvent,
  onFocus,
  onClose,
  onPopOut,
  onFocusPopOut,
  onError,
}: CampaignSheetInstanceProps) {
  const nonce = useSessionNonce();
  const { setCharacterName } = useDice();
  const [pending, startTransition] = useTransition();
  void pending;

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const [plan, setPlan] = useState<CampaignPcPlanResult | null>(null);
  const [state, setState] = useState<PcPlanState | null>(null);
  const [shortcut, setShortcut] = useState("");
  const [sheetTab, setSheetTab] = useState<PcSheetTab>("main");
  const [activeSpellClassIndex, setActiveSpellClassIndex] = useState(0);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [hydrated, setHydrated] = useState(false);
  const [compendium, setCompendium] = useState<PcCompendiumBundle | null>(null);
  const [compendiumLoading, setCompendiumLoading] = useState(false);
  const [minimized, setMinimized] = useState(false);

  const saveTimer = useRef<number | null>(null);
  const dirtyRef = useRef(false);
  const lastCompendiumSync = useRef("");
  const lastRaceSlug = useRef<string | null | undefined>(undefined);
  const lastPcUpdatedAt = useRef<string | null>(null);
  const lastRestoreRequest = useRef(restoreRequest);

  const loadPlan = useCallback(() => {
    dirtyRef.current = false;
    setHydrated(false);
    setSaveStatus("idle");
    startTransition(async () => {
      const loaded = await getCampaignPcPlan(campaignId, pcPlanId);
      if (!loaded) {
        onErrorRef.current("Character not available");
        setPlan(null);
        setState(null);
        setHydrated(true);
        return;
      }
      lastCompendiumSync.current = "";
      lastRaceSlug.current = undefined;
      dirtyRef.current = false;
      setPlan(loaded);
      setShortcut(loaded.shortcut ?? "");
      setState(loaded.state);
      setHydrated(true);
    });
  }, [campaignId, pcPlanId, startTransition]);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  useEffect(() => {
    if (restoreRequest === lastRestoreRequest.current) return;
    lastRestoreRequest.current = restoreRequest;
    setMinimized(false);
    loadPlan();
  }, [restoreRequest, loadPlan]);

  useEffect(() => {
    if (!pcUpdatedEvent) return;
    if (pcUpdatedEvent.pcPlanId !== pcPlanId) return;
    if (lastPcUpdatedAt.current === pcUpdatedEvent.updatedAt) return;
    lastPcUpdatedAt.current = pcUpdatedEvent.updatedAt;
    if (pcUpdatedEvent.actorUserId === viewerUserId) return;
    loadPlan();
  }, [pcUpdatedEvent, pcPlanId, viewerUserId, loadPlan]);

  useEffect(() => {
    if (poppedOut) setMinimized(true);
  }, [poppedOut]);

  useEffect(() => {
    if (!focused || !state) return;
    setCharacterName(state.identity.name || fallbackName);
  }, [focused, state, fallbackName, setCharacterName]);

  const patch = useCallback(
    (fn: (draft: PcPlanState) => void) => {
      if (!plan?.canEdit) return;
      dirtyRef.current = true;
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
    if (poppedOut) return;
    if (!hydrated || !plan?.canEdit || !state || !plan) return;
    if (!dirtyRef.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      if (!dirtyRef.current) return;
      setSaveStatus("saving");
      startTransition(async () => {
        const result = await savePcPlan(plan.id, state);
        if (result.success) dirtyRef.current = false;
        setSaveStatus(result.success ? "saved" : "error");
      });
    }, 600);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [state, hydrated, plan, startTransition, poppedOut]);

  const compendiumKeyValue = state
    ? compendiumSyncKey(state.identity.classLevels, state.identity.raceSlug)
    : "";

  useEffect(() => {
    if (poppedOut) return;
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
  }, [
    hydrated,
    state,
    plan?.canEdit,
    nonce,
    compendiumKeyValue,
    startTransition,
    compendium,
    poppedOut,
  ]);

  function updateAbility(key: AbilityKey, value: number) {
    const next = Number.isFinite(value) ? Math.max(1, Math.min(99, Math.round(value))) : 10;
    patch((s) => {
      if (!s.abilityBase) s.abilityBase = { ...s.abilities };
      s.abilityBase[key] = next;
    });
  }

  const statusLabel = poppedOut
    ? "Open in other window"
    : plan
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

  const handleFocus = useCallback(() => {
    onFocus(pcPlanId);
  }, [onFocus, pcPlanId]);
  const handleClose = useCallback(() => {
    onClose(pcPlanId);
  }, [onClose, pcPlanId]);
  const handlePopOut = useCallback(() => {
    onPopOut(pcPlanId);
  }, [onPopOut, pcPlanId]);
  const handleFocusPopOut = useCallback(() => {
    onFocusPopOut(pcPlanId);
  }, [onFocusPopOut, pcPlanId]);
  const handleMinimizedChange = useCallback(
    (next: boolean) => {
      onFocus(pcPlanId);
      setMinimized(next);
    },
    [onFocus, pcPlanId],
  );

  const characterName = state?.identity.name || fallbackName || "Character";
  const tokenImageUrl =
    pcImagePublicUrl(state?.identity.tokenImageKey) || fallbackTokenImageUrl;

  let sheetInner = null;
  if (poppedOut) {
    sheetInner = null;
  } else if (!hydrated || !state || !plan) {
    sheetInner = <p className="pc-planner-loading">Loading character…</p>;
  } else {
    sheetInner = (
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
    );
  }

  return (
    <CampaignPcWindow
      pcPlanId={pcPlanId}
      characterName={characterName}
      tokenImageUrl={tokenImageUrl}
      statusLabel={statusLabel}
      minimized={minimized || poppedOut}
      onMinimizedChange={handleMinimizedChange}
      cascadeIndex={cascadeIndex}
      zIndex={zIndex}
      poppedOut={poppedOut}
      onPopOut={handlePopOut}
      onFocusPopOut={handleFocusPopOut}
      onClose={handleClose}
      onFocus={handleFocus}
    >
      {sheetInner}
    </CampaignPcWindow>
  );
});
