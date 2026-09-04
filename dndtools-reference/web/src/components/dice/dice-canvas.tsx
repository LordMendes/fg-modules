"use client";

import { useEffect, useRef } from "react";
import { useDice } from "@/components/dice/dice-provider";
import { resultFromEngineGroups, toEngineNotation } from "@/lib/dice/notation";
import { getDiceSkin } from "@/lib/dice/skins";
import type { RollRequest } from "@/lib/dice/types";

/** How long settled dice stay visible before fading. */
const FADE_HOLD_MS = 2800;
/** Must match `.dice-box-canvas` opacity transition in theme.css. */
const FADE_DURATION_MS = 1000;
const FADE_CLASS = "dice-box-canvas--hide";

type EngineGroup = {
  value?: number;
  modifier?: number;
  sides?: number;
  rolls?: { value?: number; sides?: number }[];
};

type DiceBoxInstance = {
  init: () => Promise<DiceBoxInstance>;
  roll: (notation: string | object | object[]) => Promise<EngineGroup[]>;
  clear: () => void;
  hide: (className?: string) => DiceBoxInstance;
  show: () => DiceBoxInstance;
  updateConfig: (config: Record<string, unknown>) => Promise<unknown>;
  onRollComplete: ((results: EngineGroup[]) => void) | null;
};

type DiceBoxConstructor = new (config: Record<string, unknown>) => DiceBoxInstance;

/**
 * Full-viewport transparent dice overlay. pointer-events: none so sheet stays clickable.
 */
export function DiceCanvas() {
  const {
    activeRequest,
    acknowledgeRollStart,
    completeRoll,
    failRoll,
    clearSignal,
    setEngineReady,
    skinId,
    themeColor,
  } = useDice();

  const containerRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<DiceBoxInstance | null>(null);
  const pendingRef = useRef<RollRequest | null>(null);
  const rollingRef = useRef(false);
  const fadeTimersRef = useRef<{ hold?: number; clear?: number }>({});

  function cancelFade() {
    const timers = fadeTimersRef.current;
    if (timers.hold) window.clearTimeout(timers.hold);
    if (timers.clear) window.clearTimeout(timers.clear);
    fadeTimersRef.current = {};
  }

  function scheduleFadeOut() {
    cancelFade();
    const box = boxRef.current;
    if (!box) return;
    fadeTimersRef.current.hold = window.setTimeout(() => {
      try {
        box.hide(FADE_CLASS);
      } catch {
        // ignore
      }
      fadeTimersRef.current.clear = window.setTimeout(() => {
        try {
          box.clear();
          box.show();
        } catch {
          // ignore
        }
      }, FADE_DURATION_MS);
    }, FADE_HOLD_MS);
  }

  // Initialize engine once
  useEffect(() => {
    let cancelled = false;
    const el = containerRef.current;
    if (!el) return;

    async function init() {
      try {
        const mod = await import("@3d-dice/dice-box");
        if (cancelled || !containerRef.current) return;
        const DiceBox = (mod.default ?? mod) as DiceBoxConstructor;
        const skin = getDiceSkin(skinId);
        // dice-box requires a CSS selector string, not an HTMLElement
        const box = new DiceBox({
          assetPath: "/dice-box/",
          container: "#pc-planner-dice-box",
          theme: skin.engineTheme,
          themeColor,
          scale: 6,
          gravity: 1,
          throwForce: 8,
          spinForce: 6,
          startingHeight: 8,
          settleTimeout: 5000,
          offscreen: true,
          enableShadows: true,
        });

        box.onRollComplete = (results) => {
          const request = pendingRef.current;
          if (!request) return;
          pendingRef.current = null;
          rollingRef.current = false;
          const parsed = resultFromEngineGroups(request, results ?? []);
          completeRoll(parsed);
          scheduleFadeOut();
        };

        await box.init();
        if (cancelled) {
          try {
            box.clear();
          } catch {
            // ignore
          }
          return;
        }
        boxRef.current = box;
        setEngineReady(true);
      } catch (err) {
        console.error("[DiceCanvas] failed to init dice-box", err);
        setEngineReady(false);
      }
    }

    void init();

    return () => {
      cancelled = true;
      cancelFade();
      setEngineReady(false);
      const box = boxRef.current;
      boxRef.current = null;
      if (box) {
        try {
          box.clear();
        } catch {
          // ignore
        }
      }
      if (el) el.replaceChildren();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live theme / color updates
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const skin = getDiceSkin(skinId);
    void box.updateConfig({
      theme: skin.engineTheme,
      themeColor,
    });
  }, [skinId, themeColor]);

  // Clear signal from tray
  useEffect(() => {
    if (clearSignal === 0) return;
    cancelFade();
    const box = boxRef.current;
    if (!box) return;
    try {
      box.clear();
      box.show();
    } catch {
      // ignore
    }
    pendingRef.current = null;
    rollingRef.current = false;
  }, [clearSignal]);

  // Execute pending roll
  useEffect(() => {
    if (!activeRequest) return;
    const box = boxRef.current;
    if (!box || rollingRef.current) {
      return;
    }

    const request = activeRequest;
    acknowledgeRollStart();

    const groups = toEngineNotation(request.dice);
    if (groups.length === 0) {
      rollingRef.current = false;
      return;
    }
    const notation = groups.length === 1 ? groups[0] : groups;

    pendingRef.current = request;
    rollingRef.current = true;
    cancelFade();

    const finishFromResults = (results: EngineGroup[] | undefined) => {
      if (pendingRef.current?.id !== request.id) return;
      pendingRef.current = null;
      rollingRef.current = false;
      completeRoll(resultFromEngineGroups(request, results ?? []));
      scheduleFadeOut();
    };

    box.onRollComplete = (results) => {
      finishFromResults(results as EngineGroup[]);
    };

    void (async () => {
      try {
        try {
          box.show();
          box.clear();
        } catch {
          // ignore
        }
        const results = (await box.roll(notation)) as EngineGroup[];
        finishFromResults(results);
      } catch (err) {
        console.error("[DiceCanvas] roll failed", err);
        if (pendingRef.current?.id === request.id) {
          pendingRef.current = null;
          rollingRef.current = false;
          failRoll();
        }
      }
    })();
  }, [activeRequest, acknowledgeRollStart, completeRoll, failRoll]);

  return (
    <div
      ref={containerRef}
      id="pc-planner-dice-box"
      className="dice-overlay"
      aria-hidden="true"
    />
  );
}
