"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { startCampaignRoll } from "@/actions/campaigns";
import { markSeenRollId } from "@/lib/campaign/seenRollIds";
import type { CampaignLiveEvent, CampaignRollView } from "@/lib/campaign/types";
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

export type CampaignDiceConfig = {
  campaignId: string;
  actor: RollActor;
  isDm: boolean;
  initialHistory?: RollResult[];
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
  /** Ctrl/Cmd held: next roll is hidden (campaign). */
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
  const seenRollIds = useRef(new Set<string>());
  const campaignId = campaign?.campaignId ?? null;
  const isCampaign = Boolean(campaignId);
  const historyLimit = isCampaign ? HISTORY_LIMIT_CAMPAIGN : HISTORY_LIMIT_SOLO;

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
      if (e.key === "Control" || e.key === "Meta") setSecretModifierHeld(true);
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.key === "Control" || e.key === "Meta") {
        setSecretModifierHeld(e.ctrlKey || e.metaKey);
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

      pendingCanonicalRef.current = canonical;
      setSilhouetteActive(Boolean(request.silhouetteOnly));
      setRolling(true);
      setActiveRequest(request);
    },
    [historyLimit],
  );

  // Campaign SSE: every client (including roller) ingests once by roll.id.
  useEffect(() => {
    if (!campaignId) return;
    const es = new EventSource(`/tools/campaign/${campaignId}/live`);
    es.onmessage = (msg) => {
      try {
        const event = JSON.parse(msg.data) as CampaignLiveEvent;
        if (event.type !== "roll") return;
        ingestCampaignRoll(event.roll);
      } catch {
        // ignore malformed
      }
    };
    return () => {
      es.close();
    };
  }, [campaignId, ingestCampaignRoll]);

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
      if (!ready || rolling) return;
      if (request.dice.every((d) => d.qty <= 0)) return;
      pendingCanonicalRef.current = null;
      onCompleteRef.current = onComplete ?? null;
      setSilhouetteActive(false);
      setRolling(true);
      setActiveRequest(request);
    },
    [ready, rolling],
  );

  const roll = useCallback(
    (request: RollRequest, onComplete?: (result: RollResult) => void) => {
      if (!ready || rolling) return;
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

      // Campaign: server RNG first; every client animates the shared roll once.
      // Set onComplete before await so SSE-first ingest still fires sheet callbacks.
      onCompleteRef.current = onComplete ?? null;
      setRolling(true);
      void (async () => {
        try {
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
            setRolling(false);
            return;
          }
          ingestCampaignRoll(result.roll);
        } catch {
          onCompleteRef.current = null;
          setRolling(false);
        }
      })();
    },
    [
      ready,
      rolling,
      isCampaign,
      secretModifierHeld,
      defaultActor,
      campaignId,
      rollLocal,
      ingestCampaignRoll,
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
      setSilhouetteActive(false);

      if (isCampaign) {
        // Log already written at ingest from server faces; do not log engine faces.
        setRolling(false);
        setActiveRequest(null);
        apply?.(canonical ?? result);
        return;
      }

      if (!result.silhouetteOnly) {
        setLastResult(result);
        setHistory((prev) => {
          if (prev.some((r) => r.id === result.id)) return prev;
          return [result, ...prev].slice(0, historyLimit);
        });
      }

      setRolling(false);
      setActiveRequest(null);
      apply?.(result);
    },
    [isCampaign, historyLimit],
  );

  const failRoll = useCallback(() => {
    onCompleteRef.current = null;
    pendingCanonicalRef.current = null;
    setSilhouetteActive(false);
    setRolling(false);
    setActiveRequest(null);
  }, []);

  const clearDice = useCallback(() => {
    onCompleteRef.current = null;
    pendingCanonicalRef.current = null;
    setSilhouetteActive(false);
    setClearSignal((n) => n + 1);
    setRolling(false);
    setActiveRequest(null);
  }, []);

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
