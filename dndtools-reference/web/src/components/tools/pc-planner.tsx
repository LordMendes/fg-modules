"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import {
  copySharedPcPlan,
  createPcPlan,
  deletePcPlan,
  getPcPlan,
  getSharedPcPlan,
  getUserPcPlans,
  renamePcPlan,
  savePcPlan,
  type PcPlanSummary,
} from "@/actions/pc-plans";
import { fetchPcCompendium } from "@/actions/data";
import { DiceCanvas } from "@/components/dice/dice-canvas";
import { DiceLogTray } from "@/components/dice/dice-log-tray";
import { DiceProvider } from "@/components/dice/dice-provider";
import { DiceTray } from "@/components/dice/dice-tray";
import { useAuthUser } from "@/components/auth-provider";
import { useSessionNonce } from "@/components/session-provider";
import { PcPlanList } from "@/components/tools/pc-plan-list";
import { PcPlanShareDialog } from "@/components/tools/pc-plan-share-dialog";
import { PcSheet } from "@/components/tools/pc-sheet";
import { PcShortcutSearch } from "@/components/tools/pc-shortcut-search";
import { createDefaultPcPlanState } from "@/lib/pc-planner/defaultState";
import { createBlankInventoryRow } from "@/lib/pc-planner/inventoryItem";
import {
  compendiumFinalizeContext,
  finalizePcPlanWithContext,
} from "@/lib/pc-planner/finalizeContext";
import { createFeatEntry } from "@/lib/pc-planner/parseFeatEffects";
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
import type { PcCompendiumBundle } from "@/lib/entities";
import type { AbilityKey, PcPlanState, PcSheetTab } from "@/lib/pc-planner/types";

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function PcPlanner() {
  return (
    <DiceProvider>
      <PcPlannerBody />
    </DiceProvider>
  );
}

function PcPlannerBody() {
  const user = useAuthUser();
  const nonce = useSessionNonce();
  const router = useRouter();
  const searchParams = useSearchParams();
  const planIdParam = searchParams.get("id");
  const shareTokenParam = searchParams.get("share");
  const isSharedView = Boolean(shareTokenParam && !planIdParam);
  const [planId, setPlanId] = useState<string | null>(null);
  const [sharedOwnerUsername, setSharedOwnerUsername] = useState<string | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [copyPending, setCopyPending] = useState(false);
  const [plans, setPlans] = useState<PcPlanSummary[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [state, setState] = useState<PcPlanState>(() => createDefaultPcPlanState());
  const [sheetTab, setSheetTab] = useState<PcSheetTab>("main");
  const [activeSpellClassIndex, setActiveSpellClassIndex] = useState(0);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [pending, startTransition] = useTransition();
  const saveTimer = useRef<number | null>(null);
  const lastCompendiumSync = useRef("");
  const lastRaceSlug = useRef<string | null | undefined>(undefined);
  const [compendium, setCompendium] = useState<PcCompendiumBundle | null>(null);
  const [compendiumLoading, setCompendiumLoading] = useState(false);

  const compendiumKeyValue = compendiumSyncKey(
    state.identity.classLevels,
    state.identity.raceSlug,
  );

  const patch = useCallback(
    (fn: (draft: PcPlanState) => void) => {
      setState((prev) => {
        const next = structuredClone(prev);
        fn(next);
        return finalizePcPlanWithContext(next, compendiumFinalizeContext(compendium));
      });
    },
    [compendium],
  );

  async function refreshPlans() {
    const refreshed = await getUserPcPlans();
    setPlans(refreshed);
  }

  useEffect(() => {
    setActiveSpellClassIndex((index) => {
      const count = state.spellClasses.length;
      if (count === 0) return 0;
      return Math.min(index, count - 1);
    });
  }, [state.spellClasses.length]);

  useEffect(() => {
    if (!hydrated || !user || (!planIdParam && !isSharedView)) return;

    const syncKey = `${compendiumKeyValue}:${nonce}`;
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
      setState((prev) => {
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
        return finalizePcPlanWithContext(
          next,
          compendiumFinalizeContext(result.bundle!),
        );
      });
      setCompendiumLoading(false);
    });
  }, [compendiumKeyValue, hydrated, user, nonce, planIdParam, isSharedView]);

  useEffect(() => {
    if (!user) {
      setHydrated(true);
      return;
    }

    setHydrated(false);

    startTransition(async () => {
      if (shareTokenParam && !planIdParam) {
        const shared = await getSharedPcPlan(shareTokenParam);
        if (!shared) {
          setListError("Share link is invalid or has been revoked.");
          router.replace("/tools/pc-planner");
          const userPlans = await getUserPcPlans();
          setPlans(userPlans);
          setPlanId(null);
          setSharedOwnerUsername(null);
          setHydrated(true);
          return;
        }

        if (shared.isOwner) {
          router.replace(`/tools/pc-planner?id=${shared.id}`);
          return;
        }

        lastCompendiumSync.current = "";
        lastRaceSlug.current = undefined;
        setPlanId(null);
        setSharedOwnerUsername(shared.ownerUsername);
        setState(shared.state);
        setHydrated(true);
        return;
      }

      if (!planIdParam) {
        const userPlans = await getUserPcPlans();
        setPlans(userPlans);
        setPlanId(null);
        setSharedOwnerUsername(null);
        setHydrated(true);
        return;
      }

      const plan = await getPcPlan(planIdParam);
      if (plan) {
        lastCompendiumSync.current = "";
        lastRaceSlug.current = undefined;
        setPlanId(plan.id);
        setSharedOwnerUsername(null);
        setState(plan.state);
        setHydrated(true);
        return;
      }

      setListError("Character not found.");
      router.replace("/tools/pc-planner");
      const userPlans = await getUserPcPlans();
      setPlans(userPlans);
      setPlanId(null);
      setSharedOwnerUsername(null);
      setHydrated(true);
    });
  }, [user, planIdParam, shareTokenParam, router]);

  useEffect(() => {
    if (!hydrated || !planId || !user || !planIdParam || isSharedView) return;

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      setSaveStatus("saving");
      startTransition(async () => {
        const result = await savePcPlan(planId, state);
        setSaveStatus(result.success ? "saved" : "error");
      });
    }, 600);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [state, hydrated, planId, user, planIdParam, isSharedView]);

  function handleAddSharedPlan() {
    if (!shareTokenParam || copyPending) return;
    setCopyPending(true);
    setStatusMessage(null);
    startTransition(async () => {
      const result = await copySharedPcPlan(shareTokenParam);
      setCopyPending(false);
      if (!result.success || !result.plan) {
        setStatusMessage(result.error ?? "Could not add character to your plans");
        return;
      }
      router.push(`/tools/pc-planner?id=${result.plan.id}`);
    });
  }

  function handleShortcutSelect(plan: PcPlanSummary) {
    router.push(`/tools/pc-planner?id=${plan.id}`);
    startTransition(async () => {
      const loaded = await getPcPlan(plan.id);
      if (loaded) {
        lastCompendiumSync.current = "";
        setPlanId(loaded.id);
        setState(loaded.state);
        setStatusMessage(null);
      }
    });
  }

  function handleNewPlan() {
    setListError(null);
    startTransition(async () => {
      const result = await createPcPlan();
      if (!result.success || !result.plan) {
        setListError(result.error ?? "Could not create character");
        return;
      }
      lastCompendiumSync.current = "";
      setPlanId(result.plan.id);
      setState(result.plan.state);
      router.push(`/tools/pc-planner?id=${result.plan.id}`);
    });
  }

  function handleDeleteFromList(id: string) {
    setListError(null);
    return new Promise<boolean>((resolve) => {
      startTransition(async () => {
        const result = await deletePcPlan(id);
        if (!result.success) {
          setListError(result.error ?? "Could not delete character");
          resolve(false);
          return;
        }
        setPlans((prev) => prev.filter((p) => p.id !== id));
        resolve(true);
      });
    });
  }

  function handleBackToList() {
    router.push("/tools/pc-planner");
    setPlanId(null);
    setStatusMessage(null);
    startTransition(async () => {
      await refreshPlans();
    });
  }

  function updateAbility(key: AbilityKey, value: number) {
    const next = Number.isFinite(value) ? Math.max(1, Math.min(99, Math.round(value))) : 10;
    patch((s) => {
      if (!s.abilityBase) s.abilityBase = { ...s.abilities };
      s.abilityBase[key] = next;
    });
  }

  function addFeat(slug: string, name: string, choice?: string, isFlaw?: boolean) {
    patch((s) => {
      if (s.feats.some((f) => f.slug === slug)) return;
      s.feats.push(createFeatEntry(slug, name, choice, isFlaw));
    });
  }

  function setFeatChoice(slug: string, choice: string) {
    patch((s) => {
      const feat = s.feats.find((f) => f.slug === slug);
      if (!feat) return;
      feat.choice = choice;
    });
  }

  function removeFeat(slug: string) {
    patch((s) => {
      s.feats = s.feats.filter((f) => f.slug !== slug);
    });
  }

  function addSpell(slug: string, name: string, level: number) {
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
    });
  }

  function removeSpell(slug: string) {
    patch((s) => {
      const target = s.spellClasses[activeSpellClassIndex];
      if (!target) return;
      target.spells = target.spells.filter((sp) => sp.slug !== slug);
    });
  }

  function updateSpellPrepared(slug: string, prepared: number) {
    patch((s) => {
      const target = s.spellClasses[activeSpellClassIndex];
      if (!target) return;
      const spell = target.spells.find((sp) => sp.slug === slug);
      if (!spell) return;
      spell.prepared = Math.max(0, prepared);
    });
  }

  function addInventoryRow() {
    patch((s) => {
      s.inventory.push(createBlankInventoryRow());
    });
  }

  if (!user) {
    const loginNext =
      shareTokenParam && !planIdParam
        ? `/tools/pc-planner?share=${encodeURIComponent(shareTokenParam)}`
        : planIdParam
          ? `/tools/pc-planner?id=${encodeURIComponent(planIdParam)}`
          : "/tools/pc-planner";

    return (
      <div className="pc-planner-auth-gate">
        <p>
          PC Planner saves character builds to your account. Sign in to use the Fantasy
          Grounds character sheet with automatic spell slot calculation.
        </p>
        <Link href={`/login?next=${encodeURIComponent(loginNext)}`} className="tool-btn">
          Sign in to continue
        </Link>
      </div>
    );
  }

  if (!hydrated) {
    return <p className="pc-planner-loading">Loading…</p>;
  }

  let body: ReactNode;
  if (isSharedView) {
    body = (
      <div className="pc-sheet-page">
        <div className="pc-sheet-toolbar">
          <button type="button" className="tool-btn tool-btn--ghost" onClick={handleBackToList}>
            ← All characters
          </button>
        </div>

        <div className="pc-plan-share-banner" role="status">
          <p>
            <strong>{state.identity.name || "Unnamed"}</strong> shared by{" "}
            <strong>@{sharedOwnerUsername ?? "unknown"}</strong>. View only.
          </p>
          <div className="pc-plan-share-banner-actions">
            <button
              type="button"
              className="tool-btn"
              onClick={handleAddSharedPlan}
              disabled={copyPending || pending}
            >
              {copyPending ? "Adding…" : "Add to my plans"}
            </button>
          </div>
        </div>

        {statusMessage ? (
          <p className="npc-creator-status pc-sheet-status" role="alert">
            {statusMessage}
          </p>
        ) : null}

        <div className="pc-sheet-frame npc-sheet">
          <PcSheet
            state={state}
            patch={patch}
            sheetTab={sheetTab}
            onTabChange={setSheetTab}
            onNameBlur={() => {}}
            readOnly
            activeSpellClassIndex={activeSpellClassIndex}
            onSpellClassIndexChange={setActiveSpellClassIndex}
            compendium={compendium}
            compendiumLoading={compendiumLoading}
            onAddFeat={addFeat}
            onRemoveFeat={removeFeat}
            onAddSpell={addSpell}
            onRemoveSpell={removeSpell}
            onUpdateSpellPrepared={updateSpellPrepared}
            onAddInventoryRow={addInventoryRow}
            updateAbility={updateAbility}
          />
        </div>
      </div>
    );
  } else if (!planIdParam) {
    body = (
      <>
        {statusMessage ? (
          <p className="npc-creator-status pc-sheet-status" role="status">
            {statusMessage}
          </p>
        ) : null}
        <PcPlanList
          plans={plans}
          pending={pending}
          error={listError}
          onCreate={handleNewPlan}
          onDelete={handleDeleteFromList}
        />
      </>
    );
  } else {
    body = (
      <div className="pc-sheet-page">
        <div className="pc-sheet-toolbar">
          <button type="button" className="tool-btn tool-btn--ghost" onClick={handleBackToList}>
            ← All characters
          </button>
          <PcShortcutSearch onSelect={handleShortcutSelect} />
          <div className="pc-sheet-toolbar-actions">
            <button
              type="button"
              className="tool-btn tool-btn--ghost"
              onClick={() => setShareDialogOpen(true)}
              disabled={!planId}
            >
              Share
            </button>
            <span className="pc-save-status" aria-live="polite">
              {saveStatus === "saving"
                ? "Saving…"
                : saveStatus === "saved"
                  ? "Saved"
                  : saveStatus === "error"
                    ? "Save failed"
                    : null}
            </span>
          </div>
        </div>

        {shareDialogOpen && planId ? (
          <PcPlanShareDialog
            planId={planId}
            planName={state.identity.name || "Unnamed"}
            onClose={() => setShareDialogOpen(false)}
          />
        ) : null}

        {statusMessage ? (
          <p className="npc-creator-status pc-sheet-status" role="status">
            {statusMessage}
          </p>
        ) : null}

        <div className="pc-sheet-frame npc-sheet">
          <PcSheet
            state={state}
            patch={patch}
            sheetTab={sheetTab}
            onTabChange={setSheetTab}
            onNameBlur={() => {
              if (!planId) return;
              void renamePcPlan(planId, state.identity.name || "Unnamed");
            }}
            activeSpellClassIndex={activeSpellClassIndex}
            onSpellClassIndexChange={setActiveSpellClassIndex}
            compendium={compendium}
            compendiumLoading={compendiumLoading}
            onAddFeat={addFeat}
            onRemoveFeat={removeFeat}
            onAddSpell={addSpell}
            onRemoveSpell={removeSpell}
            onUpdateSpellPrepared={updateSpellPrepared}
            onAddInventoryRow={addInventoryRow}
            updateAbility={updateAbility}
            planId={planId}
          />
        </div>
      </div>
    );
  }

  return (
    <>
      {body}
      <DiceCanvas />
      <DiceTray />
      <DiceLogTray />
    </>
  );
}
