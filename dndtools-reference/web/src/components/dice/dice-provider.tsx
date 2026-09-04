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
  RollRequest,
  RollResult,
} from "@/lib/dice/types";

const TRAY_EXPANDED_KEY = "pc-planner-dice-tray-expanded";
const SKIN_ID_KEY = "pc-planner-dice-skin-id";
const THEME_COLOR_KEY = "pc-planner-dice-theme-color";
const HISTORY_LIMIT = 12;

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
  rollCheck: (label: string, modifier: number) => void;
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
};

const DiceContext = createContext<DiceContextValue | null>(null);

export function DiceProvider({ children }: { children: ReactNode }) {
  const [trayExpanded, setTrayExpandedState] = useState(false);
  const [pool, setPool] = useState<DicePoolItem[]>([]);
  const [modifier, setModifier] = useState(0);
  const [rolling, setRolling] = useState(false);
  const [ready, setReady] = useState(false);
  const [activeRequest, setActiveRequest] = useState<RollRequest | null>(null);
  const [lastResult, setLastResult] = useState<RollResult | null>(null);
  const [history, setHistory] = useState<RollResult[]>([]);
  const [skinId, setSkinIdState] = useState(DEFAULT_SKIN_ID);
  const [themeColor, setThemeColorState] = useState(
    () => getDiceSkin(DEFAULT_SKIN_ID).themeColor,
  );
  const [clearSignal, setClearSignal] = useState(0);
  const hydrated = useRef(false);
  const onCompleteRef = useRef<((result: RollResult) => void) | null>(null);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    try {
      setTrayExpandedState(sessionStorage.getItem(TRAY_EXPANDED_KEY) === "1");
      const storedSkin = localStorage.getItem(SKIN_ID_KEY);
      const skin = getDiceSkin(storedSkin);
      setSkinIdState(skin.id);
      const storedColor = localStorage.getItem(THEME_COLOR_KEY);
      setThemeColorState(storedColor && /^#[0-9A-Fa-f]{6}$/.test(storedColor)
        ? storedColor
        : skin.themeColor);
    } catch {
      // ignore storage errors
    }
  }, []);

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

  const roll = useCallback(
    (request: RollRequest, onComplete?: (result: RollResult) => void) => {
      if (!ready || rolling) return;
      if (request.dice.every((d) => d.qty <= 0)) return;
      onCompleteRef.current = onComplete ?? null;
      setRolling(true);
      setActiveRequest(request);
    },
    [ready, rolling],
  );

  const rollPool = useCallback(() => {
    if (poolDieCount(pool) === 0) return;
    roll({
      id: createRollId(),
      label: "Tray",
      dice: pool,
      modifier,
    });
  }, [pool, modifier, roll]);

  const rollDie = useCallback(
    (sides: DieSides) => {
      roll({
        id: createRollId(),
        label: `d${sides}`,
        dice: [{ qty: 1, sides }],
        modifier,
      });
    },
    [modifier, roll],
  );

  const rollCheck = useCallback(
    (label: string, mod: number) => {
      roll(d20Check(label, mod));
    },
    [roll],
  );

  const acknowledgeRollStart = useCallback(() => {
    setActiveRequest(null);
  }, []);

  const completeRoll = useCallback((result: RollResult) => {
    const apply = onCompleteRef.current;
    onCompleteRef.current = null;
    setLastResult(result);
    setHistory((prev) => [result, ...prev].slice(0, HISTORY_LIMIT));
    setRolling(false);
    setActiveRequest(null);
    apply?.(result);
  }, []);

  const failRoll = useCallback(() => {
    onCompleteRef.current = null;
    setRolling(false);
    setActiveRequest(null);
  }, []);

  const clearDice = useCallback(() => {
    onCompleteRef.current = null;
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
