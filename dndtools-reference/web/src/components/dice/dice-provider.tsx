"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { startCampaignRoll } from "@/actions/campaigns";
import { startCombatRollAction } from "@/actions/combatRolls";
import { useCampaignLiveOptional } from "@/components/tools/campaign-live-provider";
import { markSeenRollId } from "@/lib/campaign/seenRollIds";
import type { CampaignRollView } from "@/lib/campaign/types";
import { rollViewToResult } from "@/lib/campaign/types";
import {
  addDieToPool,
  createRollId,
  d20Check,
  poolDieCount,
  removeOneDieFromPool,
} from "@/lib/dice/notation";
import { DEFAULT_SKIN_ID, getDiceSkin } from "@/lib/dice/skins";
import type {
  DicePoolItem,
  DieSides,
  RollActor,
  RollKind,
  RollRequest,
  RollResult,
} from "@/lib/dice/types";

const TRAY_EXPANDED_KEY = "pc-planner-dice-tray-expanded";
const SKIN_ID_KEY = "pc-planner-dice-skin-id";
const THEME_COLOR_KEY = "pc-planner-dice-theme-color";
const HISTORY_LIMIT_SOLO = 24;
const HISTORY_LIMIT_CAMPAIGN = 50;
const ROLL_QUEUE_LIMIT = 8;

type QueuedRoll = {
  run: () => void | Promise<void>;
};

export type CampaignDiceConfig = {
  campaignId: string;
  actor: RollActor;
  isDm: boolean;
  initialHistory?: RollResult[];
  onRollError?: (message: string) => void;
};

type DiceContextValue = {
  trayExpanded: boolean;
  setTrayExpanded: (open: boolean) => void;
  toggleTray: () => void;
  pool: DicePoolItem[];
  addDie: (sides: DieSides) => void;
  removeDie: (sides: DieSides) => void;
  clearPool: () => void;
  modifier: number;
  setModifier: (n: number) => void;
  rollPool: () => void;
  /** Throw a single die (used by drag-to-throw). */
  rollDie: (sides: DieSides) => void;
  rollCheck: (label: string, modifier: number, kind?: RollKind) => void;
  roll: (request: RollRequest, onComplete?: (result: RollResult) => void) => void;
  clearDice: () => void;
  rolling: boolean;
  ready: boolean;
  /** Whether roll buttons should accept clicks. */
  canRoll: boolean;
  lastResult: RollResult | null;
  history: RollResult[];
  activeRequest: RollRequest | null;
  skinId: string;
  themeColor: string;
  setSkinId: (id: string) => void;
  setThemeColor: (hex: string) => void;
  /** Called by DiceCanvas when the engine is ready / torn down. */
  setEngineReady: (ready: boolean) => void;
  /** Called by DiceCanvas when a roll finishes. */
  completeRoll: (result: RollResult) => void;
  /** Reset rolling lock without recording a result (engine error). */
  failRoll: () => void;
  /** Clear request after canvas consumes it (or on failure). */
  acknowledgeRollStart: () => void;
  clearSignal: number;
  /** Shift held: next roll is hidden (campaign). */
  secretModifierHeld: boolean;
  /** Actor defaults for campaign rolls. */
  defaultActor: RollActor | null;
  isCampaign: boolean;
  /** Overlay should render dice as unreadable silhouette. */
  silhouetteActive: boolean;
  setCharacterName: (name: string | null) => void;
};

const DiceContext = createContext<DiceContextValue | null>(null);

export { DiceContext };

function campaignRollToRequest(roll: CampaignRollView): RollRequest {
  return {
    id: roll.id,
    label: roll.label,
    dice: roll.dice,
    modifier: roll.modifier,
    ...(roll.iterativeModifiers ? { iterativeModifiers: roll.iterativeModifiers } : {}),
    kind: roll.kind,
    hidden: roll.hidden,
    actor: roll.actor,
    ...(roll.faces ? { faces: roll.faces } : {}),
    silhouetteOnly: roll.hidden && !roll.revealResult,
  };
}

function campaignRollToHistoryEntry(roll: CampaignRollView): RollResult | null {
  if (roll.hidden && !roll.revealResult) return null;
  return rollViewToResult(roll);
}

export function DiceProvider({
  children,
  campaign,
}: {
  children: ReactNode;
  campaign?: CampaignDiceConfig | null;
}) {
  const [trayExpanded, setTrayExpandedState] = useState(false);
  const [pool, setPool] = useState<DicePoolItem[]>([]);
  const [modifier, setModifier] = useState(0);
  const [rolling, setRolling] = useState(false);
  const [queuedCount, setQueuedCount] = useState(0);
  const [ready, setReady] = useState(false);
  const [activeRequest, setActiveRequest] = useState<RollRequest | null>(null);
  const [lastResult, setLastResult] = useState<RollResult | null>(null);
  const [history, setHistory] = useState<RollResult[]>(
    () => campaign?.initialHistory ?? [],
  );
  const [skinId, setSkinIdState] = useState(DEFAULT_SKIN_ID);
  const [themeColor, setThemeColorState] = useState(
    () => getDiceSkin(DEFAULT_SKIN_ID).themeColor,
  );
  const [clearSignal, setClearSignal] = useState(0);
  const [secretModifierHeld, setSecretModifierHeld] = useState(false);
  const [silhouetteActive, setSilhouetteActive] = useState(false);
  const [characterName, setCharacterNameState] = useState<string | null>(
    campaign?.actor.characterName ?? null,
  );
  const hydrated = useRef(false);
  const onCompleteRef = useRef<((result: RollResult) => void) | null>(null);
  const pendingCanonicalRef = useRef<RollResult | null>(null);
  const pendingCombatOutcomeRef = useRef<RollResult["combat"]>(undefined);
  const seenRollIds = useRef(new Set<string>());
  const readyRef = useRef(false);
  readyRef.current = ready;
  const activeRequestRef = useRef<RollRequest | null>(null);
  activeRequestRef.current = activeRequest;
  const completeRollRef = useRef<(result: RollResult) => void>(() => {});
  const failRollRef = useRef<() => void>(() => {});
  const finishCurrentRollRef = useRef<() => void>(() => {});
  const busyRef = useRef(false);
  const rollQueueRef = useRef<QueuedRoll[]>([]);
  const campaignId = campaign?.campaignId ?? null;
  const isCampaign = Boolean(campaignId);
  const historyLimit = isCampaign ? HISTORY_LIMIT_CAMPAIGN : HISTORY_LIMIT_SOLO;
  const canRoll = (isCampaign || ready) && queuedCount < ROLL_QUEUE_LIMIT;

  const syncQueueCount = useCallback(() => {
    setQueuedCount(rollQueueRef.current.length);
  }, []);

  const markBusy = useCallback(() => {
    busyRef.current = true;
    setRolling(true);
  }, []);

  const enqueueRoll = useCallback(
    (run: () => void | Promise<void>): boolean => {
      if (rollQueueRef.current.length >= ROLL_QUEUE_LIMIT) return false;
      rollQueueRef.current.push({ run });
      syncQueueCount();
      return true;
    },
    [syncQueueCount],
  );

  const finishCurrentRoll = useCallback(() => {
    setActiveRequest(null);
    setSilhouetteActive(false);

    if (rollQueueRef.current.length === 0) {
      busyRef.current = false;
      setRolling(false);
      syncQueueCount();
      return;
    }

    syncQueueCount();
    const next = rollQueueRef.current.shift();
    syncQueueCount();
    if (!next) {
      busyRef.current = false;
      setRolling(false);
      return;
    }
    void Promise.resolve(next.run());
  }, [syncQueueCount]);
  finishCurrentRollRef.current = finishCurrentRoll;

  const startIngestAnimation = useCallback(
    (request: RollRequest, canonical: RollResult | null) => {
      pendingCanonicalRef.current = canonical;
      setSilhouetteActive(Boolean(request.silhouetteOnly));
      if (!readyRef.current) {
        if (canonical) {
          completeRollRef.current(canonical);
        } else {
          finishCurrentRollRef.current();
        }
        return;
      }
      markBusy();
      setActiveRequest(request);
    },
    [markBusy],
  );

  const defaultActor = useMemo<RollActor | null>(() => {
    if (!campaign) return null;
    return {
      ...campaign.actor,
      characterName: characterName ?? campaign.actor.characterName,
    };
  }, [campaign, characterName]);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    try {
      setTrayExpandedState(sessionStorage.getItem(TRAY_EXPANDED_KEY) === "1");
      const storedSkin = localStorage.getItem(SKIN_ID_KEY);
      const skin = getDiceSkin(storedSkin);
      setSkinIdState(skin.id);
      const storedColor = localStorage.getItem(THEME_COLOR_KEY);
      setThemeColorState(
        storedColor && /^#[0-9A-Fa-f]{6}$/.test(storedColor)
          ? storedColor
          : skin.themeColor,
      );
    } catch {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Shift") setSecretModifierHeld(true);
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.key === "Shift") {
        setSecretModifierHeld(e.shiftKey);
      }
    }
    function onBlur() {
      setSecretModifierHeld(false);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  useEffect(() => {
    if (!isCampaign) return;
    document.documentElement.classList.toggle(
      "dice-secret-cursor",
      secretModifierHeld,
    );
    return () => {
      document.documentElement.classList.remove("dice-secret-cursor");
    };
  }, [isCampaign, secretModifierHeld]);

  const ingestCampaignRoll = useCallback(
    (view: CampaignRollView) => {
      if (!markSeenRollId(seenRollIds.current, view.id)) return;

      const historyEntry = campaignRollToHistoryEntry(view);
      const request = campaignRollToRequest(view);
      const canonical =
        historyEntry ??
        (request.silhouetteOnly
          ? {
              id: view.id,
              label: view.label,
              faces: [] as number[],
              faceSum: 0,
              modifier: view.modifier,
              total: 0,
              natural20: false,
              natural1: false,
              at: view.at,
              kind: view.kind,
              hidden: view.hidden,
              actor: view.actor,
              silhouetteOnly: true,
            }
          : null);

      if (historyEntry) {
        setLastResult(historyEntry);
        setHistory((prev) => {
          if (prev.some((r) => r.id === historyEntry.id)) return prev;
          return [historyEntry, ...prev].slice(0, historyLimit);
        });
      }

      if (busyRef.current && activeRequestRef.current) {
        enqueueRoll(() => startIngestAnimation(request, canonical));
        return;
      }

      startIngestAnimation(request, canonical);
    },
    [historyLimit, enqueueRoll, startIngestAnimation],
  );

  useEffect(() => {
    if (!rolling) return;
    const timer = window.setTimeout(() => {
      console.warn("[DiceProvider] roll watchdog reset");
      const canonical = pendingCanonicalRef.current;
      if (canonical) {
        completeRollRef.current(canonical);
      } else {
        failRollRef.current();
      }
    }, 8000);
    return () => window.clearTimeout(timer);
  }, [rolling]);

  // Campaign rolls arrive on the shared WebSocket (CampaignLiveProvider).
  const live = useCampaignLiveOptional();
  const rollStore = live?.store ?? null;
  const rollVersion = useSyncExternalStore(
    (onStoreChange) => {
      if (!rollStore) return () => {};
      return rollStore.subscribe(onStoreChange);
    },
    () => (rollStore ? rollStore.getRollVersion() : 0),
    () => 0,
  );
  const seenRollRef = useRef<string | null>(null);
  useEffect(() => {
    if (!rollStore) return;
    const latest = rollStore.getState().rolls[0];
    if (!latest) return;
    // rollVersion 0 is the HTTP history snapshot. Replaying it sets
    // rolling=true before the 3D engine is ready and deadlocks the tray.
    if (rollVersion === 0) {
      seenRollRef.current = latest.id;
      return;
    }
    if (seenRollRef.current === latest.id) return;
    seenRollRef.current = latest.id;
    ingestCampaignRoll(latest);
  }, [rollStore, rollVersion, ingestCampaignRoll]);

  const setTrayExpanded = useCallback((open: boolean) => {
    setTrayExpandedState(open);
    try {
      sessionStorage.setItem(TRAY_EXPANDED_KEY, open ? "1" : "0");
    } catch {
      // ignore
    }
  }, []);

  const toggleTray = useCallback(() => {
    setTrayExpandedState((prev) => {
      const next = !prev;
      try {
        sessionStorage.setItem(TRAY_EXPANDED_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const setSkinId = useCallback((id: string) => {
    const skin = getDiceSkin(id);
    setSkinIdState(skin.id);
    setThemeColorState(skin.themeColor);
    try {
      localStorage.setItem(SKIN_ID_KEY, skin.id);
      localStorage.setItem(THEME_COLOR_KEY, skin.themeColor);
    } catch {
      // ignore
    }
  }, []);

  const setThemeColor = useCallback((hex: string) => {
    setThemeColorState(hex);
    try {
      localStorage.setItem(THEME_COLOR_KEY, hex);
    } catch {
      // ignore
    }
  }, []);

  const setCharacterName = useCallback((name: string | null) => {
    setCharacterNameState(name);
  }, []);

  const addDie = useCallback((sides: DieSides) => {
    setPool((prev) => addDieToPool(prev, sides));
  }, []);

  const removeDie = useCallback((sides: DieSides) => {
    setPool((prev) => removeOneDieFromPool(prev, sides));
  }, []);

  const clearPool = useCallback(() => {
    setPool([]);
    setModifier(0);
  }, []);

  const rollLocal = useCallback(
    (request: RollRequest, onComplete?: (result: RollResult) => void) => {
      if (!readyRef.current) return;
      if (request.dice.every((d) => d.qty <= 0)) return;

      const start = () => {
        if (!readyRef.current) return;
        pendingCanonicalRef.current = null;
        pendingCombatOutcomeRef.current = undefined;
        onCompleteRef.current = onComplete ?? null;
        setSilhouetteActive(false);
        markBusy();
        setActiveRequest(request);
      };

      if (busyRef.current) {
        enqueueRoll(start);
        return;
      }
      start();
    },
    [enqueueRoll, markBusy],
  );

  const roll = useCallback(
    (request: RollRequest, onComplete?: (result: RollResult) => void) => {
      if (request.dice.every((d) => d.qty <= 0)) return;

      const hidden =
        request.hidden ?? (isCampaign && secretModifierHeld ? true : false);
      const actor = request.actor ?? defaultActor ?? undefined;
      const enriched: RollRequest = {
        ...request,
        hidden,
        ...(actor ? { actor } : {}),
      };

      if (!campaignId) {
        rollLocal(enriched, onComplete);
        return;
      }

      const executeCampaignRoll = () => {
        // Campaign: server RNG first; every client animates the shared roll once.
        // Set onComplete before await so SSE-first ingest still fires sheet callbacks.
        onCompleteRef.current = onComplete ?? null;
        pendingCombatOutcomeRef.current = undefined;
        markBusy();
        void (async () => {
          try {
            if (enriched.combat) {
              const result = await startCombatRollAction({
                campaignId,
                label: enriched.label,
                kind: enriched.kind ?? "other",
                hidden: Boolean(enriched.hidden),
                characterName: actor?.characterName ?? null,
                dice: enriched.dice,
                modifier: enriched.modifier,
                iterativeModifiers: enriched.iterativeModifiers,
                combat: enriched.combat,
              });
              if (!result.success || !result.roll) {
                onCompleteRef.current = null;
                const message = result.error ?? "Combat roll failed";
                campaign?.onRollError?.(message);
                console.warn("[DiceProvider] combat roll failed:", message);
                finishCurrentRollRef.current();
                return;
              }
              pendingCombatOutcomeRef.current = result.outcome;
              ingestCampaignRoll(result.roll);
              return;
            }

            const result = await startCampaignRoll({
              campaignId,
              label: enriched.label,
              kind: enriched.kind ?? "other",
              hidden: Boolean(enriched.hidden),
              characterName: actor?.characterName ?? null,
              dice: enriched.dice,
              modifier: enriched.modifier,
              iterativeModifiers: enriched.iterativeModifiers,
            });
            if (!result.success || !result.roll) {
              onCompleteRef.current = null;
              const message = result.error ?? "Roll failed";
              campaign?.onRollError?.(message);
              console.warn("[DiceProvider] campaign roll failed:", message);
              finishCurrentRollRef.current();
              return;
            }
            ingestCampaignRoll(result.roll);
          } catch (err) {
            onCompleteRef.current = null;
            const message =
              err instanceof Error ? err.message : "Roll failed unexpectedly";
            campaign?.onRollError?.(message);
            console.warn("[DiceProvider] campaign roll error:", err);
            finishCurrentRollRef.current();
          }
        })();
      };

      if (busyRef.current) {
        enqueueRoll(executeCampaignRoll);
        return;
      }
      executeCampaignRoll();
    },
    [
      isCampaign,
      secretModifierHeld,
      defaultActor,
      campaignId,
      campaign,
      rollLocal,
      ingestCampaignRoll,
      enqueueRoll,
      markBusy,
    ],
  );

  const rollPool = useCallback(() => {
    if (poolDieCount(pool) === 0) return;
    roll({
      id: createRollId(),
      label: "Tray",
      dice: pool,
      modifier,
      kind: "tray",
    });
  }, [pool, modifier, roll]);

  const rollDie = useCallback(
    (sides: DieSides) => {
      roll({
        id: createRollId(),
        label: `d${sides}`,
        dice: [{ qty: 1, sides }],
        modifier,
        kind: "tray",
      });
    },
    [modifier, roll],
  );

  const rollCheck = useCallback(
    (label: string, mod: number, kind: RollKind = "other") => {
      roll(d20Check(label, mod, kind));
    },
    [roll],
  );

  const acknowledgeRollStart = useCallback(() => {
    setActiveRequest(null);
  }, []);

  const completeRoll = useCallback(
    (result: RollResult) => {
      const apply = onCompleteRef.current;
      onCompleteRef.current = null;
      const canonical = pendingCanonicalRef.current;
      pendingCanonicalRef.current = null;
      const combatOutcome = pendingCombatOutcomeRef.current;
      pendingCombatOutcomeRef.current = undefined;
      setSilhouetteActive(false);

      if (isCampaign) {
        // Log already written at ingest from server faces; do not log engine faces.
        const base = canonical ?? result;
        apply?.(
          combatOutcome != null ? { ...base, combat: combatOutcome } : base,
        );
        finishCurrentRoll();
        return;
      }

      if (!result.silhouetteOnly) {
        setLastResult(result);
        setHistory((prev) => {
          if (prev.some((r) => r.id === result.id)) return prev;
          return [result, ...prev].slice(0, historyLimit);
        });
      }

      apply?.(result);
      finishCurrentRoll();
    },
    [isCampaign, historyLimit, finishCurrentRoll],
  );
  completeRollRef.current = completeRoll;

  const failRoll = useCallback(() => {
    onCompleteRef.current = null;
    pendingCanonicalRef.current = null;
    pendingCombatOutcomeRef.current = undefined;
    finishCurrentRoll();
  }, [finishCurrentRoll]);
  failRollRef.current = failRoll;

  const clearDice = useCallback(() => {
    onCompleteRef.current = null;
    pendingCanonicalRef.current = null;
    pendingCombatOutcomeRef.current = undefined;
    rollQueueRef.current = [];
    syncQueueCount();
    busyRef.current = false;
    setSilhouetteActive(false);
    setClearSignal((n) => n + 1);
    setRolling(false);
    setActiveRequest(null);
  }, [syncQueueCount]);

  const setEngineReady = useCallback((isReady: boolean) => {
    setReady(isReady);
  }, []);

  const value = useMemo<DiceContextValue>(
    () => ({
      trayExpanded,
      setTrayExpanded,
      toggleTray,
      pool,
      addDie,
      removeDie,
      clearPool,
      modifier,
      setModifier,
      rollPool,
      rollDie,
      rollCheck,
      roll,
      clearDice,
      rolling,
      ready,
      canRoll,
      lastResult,
      history,
      activeRequest,
      skinId,
      themeColor,
      setSkinId,
      setThemeColor,
      setEngineReady,
      completeRoll,
      failRoll,
      acknowledgeRollStart,
      clearSignal,
      secretModifierHeld,
      defaultActor,
      isCampaign,
      silhouetteActive,
      setCharacterName,
    }),
    [
      trayExpanded,
      setTrayExpanded,
      toggleTray,
      pool,
      addDie,
      removeDie,
      clearPool,
      modifier,
      rollPool,
      rollDie,
      rollCheck,
      roll,
      clearDice,
      rolling,
      ready,
      canRoll,
      lastResult,
      history,
      activeRequest,
      skinId,
      themeColor,
      setSkinId,
      setThemeColor,
      setEngineReady,
      completeRoll,
      failRoll,
      acknowledgeRollStart,
      clearSignal,
      secretModifierHeld,
      defaultActor,
      isCampaign,
      silhouetteActive,
      setCharacterName,
    ],
  );

  return <DiceContext.Provider value={value}>{children}</DiceContext.Provider>;
}

export function useDice(): DiceContextValue {
  const ctx = useContext(DiceContext);
  if (!ctx) {
    throw new Error("useDice must be used within DiceProvider");
  }
  return ctx;
}
