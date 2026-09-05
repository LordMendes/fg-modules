"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
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
import { CampaignPcAvatar } from "@/components/tools/campaign-pc-avatar";
import { CampaignPcWindow } from "@/components/tools/campaign-pc-window";
import { PcSheet } from "@/components/tools/pc-sheet";
import { pcImagePublicUrl } from "@/lib/storage/pc-image-url";
import {
  campaignSheetPopoutChannelName,
  campaignSheetWindowName,
  type CampaignSheetPopoutMessage,
} from "@/lib/campaign/immersive";
import type { CampaignLiveEvent, CampaignTableState } from "@/lib/campaign/types";
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

type MenuId = "roster" | null;

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
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);

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

  // Live roster + presence via SSE
  useEffect(() => {
    if (!user || !table || table.myStatus !== "active") return;
    const es = new EventSource(`/tools/campaign/${campaignId}/live`);
    es.onmessage = (msg) => {
      try {
        const event = JSON.parse(msg.data) as CampaignLiveEvent;
        if (event.type === "roster" && event.members && event.pcs) {
          setTable((prev) =>
            prev ? { ...prev, members: event.members, pcs: event.pcs } : prev,
          );
        } else if (event.type === "presence") {
          setOnlineUserIds(event.onlineUserIds);
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
        error={error}
        setError={setError}
        pending={pending}
        startTransition={startTransition}
        refresh={refresh}
        onlineUserIds={onlineUserIds}
      />
    </DiceProvider>
  );
}

function CampaignTableBody({
  table,
  error,
  setError,
  pending,
  startTransition,
  refresh,
  onlineUserIds,
}: {
  table: CampaignTableState;
  error: string | null;
  setError: (e: string | null) => void;
  pending: boolean;
  startTransition: (fn: () => void) => void;
  refresh: () => void;
  onlineUserIds: string[];
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
  const [activeMenu, setActiveMenu] = useState<MenuId>(null);
  const [sheetMinimized, setSheetMinimized] = useState(false);
  const [poppedOutPcPlanId, setPoppedOutPcPlanId] = useState<string | null>(null);
  const popoutWindowRef = useRef<Window | null>(null);
  const saveTimer = useRef<number | null>(null);
  const lastCompendiumSync = useRef("");
  const lastRaceSlug = useRef<string | null | undefined>(undefined);

  const visiblePcs = useMemo(() => {
    if (isDm) return table.pcs;
    return table.pcs.filter((p) => p.userId === user.id);
  }, [isDm, table.pcs, user.id]);

  const onlinePcs = useMemo(() => {
    const online = new Set(onlineUserIds);
    return table.pcs.filter((p) => online.has(p.userId));
  }, [table.pcs, onlineUserIds]);

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
        setSheetMinimized(false);
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

  // Auto-save for owners (paused while this PC is in a pop-out window)
  useEffect(() => {
    if (poppedOutPcPlanId && poppedOutPcPlanId === selectedPcPlanId) return;
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
  }, [state, hydrated, plan, startTransition, poppedOutPcPlanId, selectedPcPlanId]);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(campaignSheetPopoutChannelName(table.id));
    channel.onmessage = (event: MessageEvent<CampaignSheetPopoutMessage>) => {
      const msg = event.data;
      if (!msg || typeof msg !== "object") return;
      if (msg.type === "opened") {
        setPoppedOutPcPlanId(msg.pcPlanId);
        if (msg.pcPlanId === selectedPcPlanId) {
          setSheetMinimized(true);
        }
      } else if (msg.type === "closed") {
        setPoppedOutPcPlanId((prev) => (prev === msg.pcPlanId ? null : prev));
        if (popoutWindowRef.current && popoutWindowRef.current.closed) {
          popoutWindowRef.current = null;
        }
        if (msg.pcPlanId === selectedPcPlanId) {
          loadPlan(msg.pcPlanId);
          setSheetMinimized(false);
        }
      }
    };
    return () => channel.close();
  }, [table.id, selectedPcPlanId, loadPlan]);

  const compendiumKeyValue = state
    ? compendiumSyncKey(state.identity.classLevels, state.identity.raceSlug)
    : "";

  useEffect(() => {
    if (poppedOutPcPlanId && poppedOutPcPlanId === selectedPcPlanId) return;
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
  }, [hydrated, state, plan?.canEdit, nonce, compendiumKeyValue, startTransition, compendium, poppedOutPcPlanId, selectedPcPlanId]);

  function updateAbility(key: AbilityKey, value: number) {
    const next = Number.isFinite(value) ? Math.max(1, Math.min(99, Math.round(value))) : 10;
    patch((s) => {
      if (!s.abilityBase) s.abilityBase = { ...s.abilities };
      s.abilityBase[key] = next;
    });
  }

  function focusPopOut(pcPlanId: string) {
    const existing = popoutWindowRef.current;
    if (existing && !existing.closed) {
      existing.focus();
      return;
    }
    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel(campaignSheetPopoutChannelName(table.id));
      const msg: CampaignSheetPopoutMessage = { type: "focus", pcPlanId };
      channel.postMessage(msg);
      channel.close();
    }
    try {
      const named = window.open("", campaignSheetWindowName(pcPlanId));
      if (named && !named.closed) {
        popoutWindowRef.current = named;
        named.focus();
      }
    } catch {
      // ignore
    }
  }

  function openPopOut(pcPlanId: string) {
    const url = `/tools/campaign/${table.id}/sheet/${pcPlanId}`;
    const features = "popup=yes,width=900,height=900,menubar=no,toolbar=no,location=no,status=no";
    const win = window.open(url, campaignSheetWindowName(pcPlanId), features);
    if (!win) {
      setError("Pop-up blocked. Allow pop-ups for this site to open the sheet in a new window.");
      return;
    }
    popoutWindowRef.current = win;
    win.focus();
    setPoppedOutPcPlanId(pcPlanId);
    setSheetMinimized(true);
    setSelectedPcPlanId(pcPlanId);
  }

  function selectPc(pcPlanId: string, ownerUserId: string) {
    if (!isDm && ownerUserId !== user.id) return;
    if (poppedOutPcPlanId === pcPlanId) {
      setSelectedPcPlanId(pcPlanId);
      setActiveMenu(null);
      focusPopOut(pcPlanId);
      return;
    }
    setSelectedPcPlanId(pcPlanId);
    setSheetMinimized(false);
    setActiveMenu(null);
  }

  const isSelectedPoppedOut =
    Boolean(selectedPcPlanId) && poppedOutPcPlanId === selectedPcPlanId;

  const joinUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/tools/campaign?join=${table.joinCode}`
      : `/tools/campaign?join=${table.joinCode}`;

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

  let sheetInner: ReactNode = null;
  if (isSelectedPoppedOut) {
    sheetInner = null;
  } else if (!selectedPcPlanId) {
    sheetInner = (
      <p className="pc-sheet-empty">
        {isDm
          ? "No characters attached yet. Players can create or import PCs from the roster."
          : "Attach or create a character to roll from the sheet."}
      </p>
    );
  } else if (!hydrated || !state || !plan) {
    sheetInner = <p className="pc-planner-loading">Loading character…</p>;
  } else {
    sheetInner = (
      <>
        <CampaignCharacterNameSync name={state.identity.name} />
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
    );
  }

  const characterName =
    state?.identity.name ||
    table.pcs.find((p) => p.pcPlanId === selectedPcPlanId)?.name ||
    "Character";

  const tokenImageUrl =
    pcImagePublicUrl(state?.identity.tokenImageKey) ||
    table.pcs.find((p) => p.pcPlanId === selectedPcPlanId)?.tokenImageUrl ||
    null;

  return (
    <>
      <div className="campaign-stage">
        {error ? <p className="tool-error campaign-stage-error">{error}</p> : null}

        <nav className="campaign-rail" aria-label="Campaign menu">
          <button
            type="button"
            className={`campaign-rail-btn${activeMenu === "roster" ? " campaign-rail-btn--active" : ""}`}
            aria-pressed={activeMenu === "roster"}
            aria-label="Invite and characters"
            title="Invite and characters"
            onClick={() => setActiveMenu((m) => (m === "roster" ? null : "roster"))}
          >
            <Users size={20} aria-hidden />
          </button>
        </nav>

        {activeMenu === "roster" ? (
          <>
            <button
              type="button"
              className="campaign-drawer-backdrop"
              aria-label="Close menu"
              onClick={() => setActiveMenu(null)}
            />
            <aside className="campaign-drawer" aria-label="Invite and characters">
              <header className="campaign-drawer-header">
                <div>
                  <h2 className="campaign-drawer-title">{table.name}</h2>
                  <p className="campaign-drawer-sub">
                    You are {isDm ? "the DM" : "a player"} · Hold Ctrl (Cmd on Mac) while rolling
                    to hide the result from other players
                  </p>
                </div>
                <div className="campaign-drawer-actions">
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

              <div className="campaign-roster">
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
                          {onlineUserIds.includes(m.userId) ? " · online" : ""}
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
                          onClick={() => selectPc(pc.pcPlanId, pc.userId)}
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
                          setSheetMinimized(false);
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
                                  setSheetMinimized(false);
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
              </div>
            </aside>
          </>
        ) : null}

        <div className="campaign-party-strip" aria-label="Online characters">
          {onlinePcs.length === 0 ? (
            <p className="campaign-party-empty">No characters online</p>
          ) : (
            <ul className="campaign-party-list">
              {onlinePcs.map((pc) => {
                const canOpen = isDm || pc.userId === user.id;
                return (
                  <li key={pc.id}>
                    <button
                      type="button"
                      className={`campaign-party-chip${
                        selectedPcPlanId === pc.pcPlanId ? " campaign-party-chip--active" : ""
                      }${canOpen ? "" : " campaign-party-chip--locked"}`}
                      disabled={!canOpen}
                      title={
                        canOpen
                          ? `Open ${pc.name}`
                          : `${pc.name} (${pc.username})`
                      }
                      onClick={() => selectPc(pc.pcPlanId, pc.userId)}
                    >
                      <CampaignPcAvatar
                        name={pc.name}
                        src={
                          (state && plan?.id === pc.pcPlanId
                            ? pcImagePublicUrl(state.identity.tokenImageKey)
                            : null) || pc.tokenImageUrl
                        }
                        size="sm"
                      />
                      <span className="campaign-party-chip-name">{pc.name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {selectedPcPlanId ? (
          <CampaignPcWindow
            characterName={characterName}
            tokenImageUrl={tokenImageUrl}
            statusLabel={isSelectedPoppedOut ? "Open in other window" : statusLabel}
            minimized={sheetMinimized || isSelectedPoppedOut}
            onMinimizedChange={setSheetMinimized}
            poppedOut={isSelectedPoppedOut}
            onPopOut={
              selectedPcPlanId ? () => openPopOut(selectedPcPlanId) : undefined
            }
            onFocusPopOut={
              selectedPcPlanId ? () => focusPopOut(selectedPcPlanId) : undefined
            }
          >
            {sheetInner}
          </CampaignPcWindow>
        ) : (
          <div className="campaign-stage-empty">{sheetInner}</div>
        )}
      </div>

      <DiceCanvas />
      <DiceTray />
      <DiceLogTray />
    </>
  );
}
