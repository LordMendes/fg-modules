"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import {
  createPcPlan,
  deletePcPlan,
  getPcPlan,
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
import { PcSheet } from "@/components/tools/pc-sheet";
import { PcShortcutSearch } from "@/components/tools/pc-shortcut-search";
import { createDefaultPcPlanState } from "@/lib/pc-planner/defaultState";
import { createBlankInventoryRow } from "@/lib/pc-planner/inventoryItem";
import { finalizePcPlanState } from "@/lib/pc-planner/syncState";
import { computeSpellClass } from "@/lib/pc-planner/spellSlots";
import {
  applyDerivedFromRace,
  applyRaceCombatBasicsOnRaceChange,
} from "@/lib/pc-planner/syncDerived";
import {
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
  const [planId, setPlanId] = useState<string | null>(null);
  const [plans, setPlans] = useState<PcPlanSummary[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [shortcut, setShortcut] = useState("");
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
        return finalizePcPlanState(
          next,
          compendium?.raceFeatures ?? null,
          compendium?.classSpellTables ?? {},
          compendium?.classHitDice ?? {},
        );
      });
    },
    [compendium?.raceFeatures, compendium?.classSpellTables, compendium?.classHitDice],
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
    if (!hydrated || !user || !planIdParam) return;

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
  }, [compendiumKeyValue, hydrated, user, nonce, planIdParam]);

  useEffect(() => {
    if (!user) {
      setHydrated(true);
      return;
    }

    setHydrated(false);

    startTransition(async () => {
      if (!planIdParam) {
        const userPlans = await getUserPcPlans();
        setPlans(userPlans);
        setPlanId(null);
        setHydrated(true);
        return;
      }

      const plan = await getPcPlan(planIdParam);
      if (plan) {
        lastCompendiumSync.current = "";
        lastRaceSlug.current = undefined;
        setPlanId(plan.id);
        setShortcut(plan.shortcut ?? "");
        setState(plan.state);
        setHydrated(true);
        return;
      }

      setListError("Character not found.");
      router.replace("/tools/pc-planner");
      const userPlans = await getUserPcPlans();
      setPlans(userPlans);
      setPlanId(null);
      setHydrated(true);
    });
  }, [user, planIdParam, router]);

  useEffect(() => {
    if (!hydrated || !planId || !user || !planIdParam) return;

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
  }, [state, hydrated, planId, user, planIdParam]);

  function handleShortcutSelect(plan: PcPlanSummary) {
    router.push(`/tools/pc-planner?id=${plan.id}`);
    startTransition(async () => {
      const loaded = await getPcPlan(plan.id);
      if (loaded) {
        lastCompendiumSync.current = "";
        setPlanId(loaded.id);
        setShortcut(loaded.shortcut ?? "");
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
      setShortcut(result.plan.shortcut ?? "");
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

  function addFeat(slug: string, name: string) {
    patch((s) => {
      if (s.feats.some((f) => f.slug === slug)) return;
      s.feats.push({ slug, name });
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
    return (
      <div className="pc-planner-auth-gate">
        <p>
          PC Planner saves character builds to your account. Sign in to use the Fantasy
          Grounds character sheet with automatic spell slot calculation.
        </p>
        <Link href="/login?next=/tools/pc-planner" className="tool-btn">
          Sign in to continue
        </Link>
      </div>
    );
  }

  if (!hydrated) {
    return <p className="pc-planner-loading">Loading…</p>;
  }

  let body: ReactNode;
  if (!planIdParam) {
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
            shortcut={shortcut}
            onShortcutChange={setShortcut}
            onNameBlur={() => {
              if (!planId) return;
              void renamePcPlan(planId, state.identity.name || "Unnamed");
            }}
            onShortcutBlur={() => {
              if (!planId) return;
              void renamePcPlan(planId, state.identity.name, shortcut || null);
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
