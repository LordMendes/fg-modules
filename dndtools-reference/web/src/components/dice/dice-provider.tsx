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
  resultFromThreejsRoll,
} from "@/lib/dice/notation";
import { rollFaces } from "@/lib/campaign/rollFaces";
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

type InFlightRoll = {
  request: RollRequest;
  onComplete: ((result: RollResult) => void) | null;
  canonical: RollResult | null;
  combat?: RollResult["combat"];
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
  const [rollToken, setRollToken] = useState(0);
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
  const inFlightRef = useRef<InFlightRoll | null>(null);
  const settledIdsRef = useRef(new Set<string>());
  const settledResultsRef = useRef(new Map<string, RollResult>());
  const pendingCallbacksRef = useRef(
    new Map<string, ((result: RollResult) => void) | null>(),
  );
  const pendingCombatRef = useRef(new Map<string, RollResult["combat"]>());
  const seenRollIds = useRef(new Set<string>());
  const readyRef = useRef(false);
  readyRef.current = ready;
  const completeRollRef = useRef<(result: RollResult) => void>(() => {});
  const failRollRef = useRef<() => void>(() => {});
  const campaignId = campaign?.campaignId ?? null;
  const isCampaign = Boolean(campaignId);
  const historyLimit = isCampaign ? HISTORY_LIMIT_CAMPAIGN : HISTORY_LIMIT_SOLO;
  const canRoll = isCampaign || ready;

  const rememberSettled = useCallback((id: string, result: RollResult | null) => {
    settledIdsRef.current.add(id);
    if (result) settledResultsRef.current.set(id, result);
    if (settledIdsRef.current.size <= 80) return;
    const first = settledIdsRef.current.values().next().value;
    if (!first) return;
    settledIdsRef.current.delete(first);
    settledResultsRef.current.delete(first);
  }, []);

  const pushHistory = useCallback(
    (result: RollResult) => {
      if (result.silhouetteOnly) return;
      setLastResult(result);
      setHistory((prev) => {
        if (prev.some((entry) => entry.id === result.id)) return prev;
        return [result, ...prev].slice(0, historyLimit);
      });
    },
    [historyLimit],
  );

  const resultForFlight = useCallback((flight: InFlightRoll, engine?: RollResult): RollResult => {
    const base = flight.canonical ?? engine ?? resultFromThreejsRoll(flight.request, undefined);
    return flight.combat != null ? { ...base, combat: flight.combat } : base;
  }, []);

  const releaseRolling = useCallback(() => {
    setActiveRequest(null);
    setSilhouetteActive(false);
    setRolling(false);
  }, []);

  const settleInFlight = useCallback(() => {
    const flight = inFlightRef.current;
    if (!flight || settledIdsRef.current.has(flight.request.id)) {
      inFlightRef.current = null;
      return;
    }
    inFlightRef.current = null;
    const result = resultForFlight(flight);
    rememberSettled(flight.request.id, result);
    if (!isCampaign) pushHistory(result);
    flight.onComplete?.(result);
  }, [isCampaign, pushHistory, rememberSettled, resultForFlight]);

  const beginAnimatedRoll = useCallback(
    (flight: InFlightRoll) => {
      settleInFlight();
      if (!readyRef.current) {
        if (flight.canonical || (flight.request.faces?.length ?? 0) > 0) {
          const result = resultForFlight(flight);
          rememberSettled(flight.request.id, result);
          if (!isCampaign) pushHistory(result);
          flight.onComplete?.(result);
        }
        return;
      }
      inFlightRef.current = flight;
      setSilhouetteActive(Boolean(flight.request.silhouetteOnly));
      setRolling(true);
      setRollToken((n) => n + 1);
      setActiveRequest(flight.request);
    },
    [isCampaign, pushHistory, rememberSettled, resultForFlight, settleInFlight],
  );

  const attachLocalCallback = useCallback(
    (
      rollId: string,
      onComplete: ((result: RollResult) => void) | null,
      combat?: RollResult["combat"],
    ) => {
      if (settledIdsRef.current.has(rollId)) {
        const stored = settledResultsRef.current.get(rollId);
        if (!stored) return;
        const result = combat !== undefined ? { ...stored, combat } : stored;
        if (combat !== undefined) settledResultsRef.current.set(rollId, result);
        onComplete?.(result);
        return;
      }
      const flight = inFlightRef.current;
      if (flight?.request.id === rollId) {
        if (combat !== undefined) flight.combat = combat;
        if (onComplete) flight.onComplete = onComplete;
        return;
      }
      if (combat !== undefined) pendingCombatRef.current.set(rollId, combat);
      if (onComplete) pendingCallbacksRef.current.set(rollId, onComplete);
    },
    [],
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

      const onComplete = pendingCallbacksRef.current.get(view.id) ?? null;
      pendingCallbacksRef.current.delete(view.id);
      const combat = pendingCombatRef.current.get(view.id);
      pendingCombatRef.current.delete(view.id);

      beginAnimatedRoll({
        request,
        onComplete,
        canonical,
        ...(combat !== undefined ? { combat } : {}),
      });
    },
    [beginAnimatedRoll, historyLimit],
  );

  useEffect(() => {
    if (!rolling) return;
    const timer = window.setTimeout(() => {
      console.warn("[DiceProvider] roll watchdog reset");
      const flight = inFlightRef.current;
      if (flight) {
        completeRollRef.current(resultForFlight(flight));
      } else {
        failRollRef.current();
      }
    }, 8000);
    return () => window.clearTimeout(timer);
  }, [resultForFlight, rolling, rollToken]);

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
      const withFaces =
        request.faces && request.faces.length > 0
          ? request
          : { ...request, faces: rollFaces(request.dice) };
      beginAnimatedRoll({
        request: withFaces,
        onComplete: onComplete ?? null,
        canonical: null,
      });
    },
    [beginAnimatedRoll],
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

      const callback = onComplete ?? null;
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
              const message = result.error ?? "Combat roll failed";
              campaign?.onRollError?.(message);
              console.warn("[DiceProvider] combat roll failed:", message);
              return;
            }
            attachLocalCallback(result.roll.id, callback, result.outcome);
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
            const message = result.error ?? "Roll failed";
            campaign?.onRollError?.(message);
            console.warn("[DiceProvider] campaign roll failed:", message);
            return;
          }
          attachLocalCallback(result.roll.id, callback);
          ingestCampaignRoll(result.roll);
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Roll failed unexpectedly";
          campaign?.onRollError?.(message);
          console.warn("[DiceProvider] campaign roll error:", err);
        }
      })();
    },
    [
      isCampaign,
      secretModifierHeld,
      defaultActor,
      campaignId,
      campaign,
      rollLocal,
      ingestCampaignRoll,
      attachLocalCallback,
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
      if (settledIdsRef.current.has(result.id)) return;
      const flight = inFlightRef.current;
      if (flight && flight.request.id !== result.id) return;
      const finalResult = flight ? resultForFlight(flight, result) : result;
      if (flight) inFlightRef.current = null;
      rememberSettled(result.id, finalResult);
      if (!isCampaign) pushHistory(finalResult);
      (flight?.onComplete ?? null)?.(finalResult);
      releaseRolling();
    },
    [isCampaign, pushHistory, rememberSettled, releaseRolling, resultForFlight],
  );
  completeRollRef.current = completeRoll;

  const failRoll = useCallback(() => {
    const flight = inFlightRef.current;
    inFlightRef.current = null;
    if (flight) rememberSettled(flight.request.id, null);
    releaseRolling();
  }, [releaseRolling, rememberSettled]);
  failRollRef.current = failRoll;

  const clearDice = useCallback(() => {
    const flight = inFlightRef.current;
    inFlightRef.current = null;
    if (flight) rememberSettled(flight.request.id, null);
    pendingCallbacksRef.current.clear();
    pendingCombatRef.current.clear();
    setClearSignal((n) => n + 1);
    releaseRolling();
  }, [releaseRolling, rememberSettled]);

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
