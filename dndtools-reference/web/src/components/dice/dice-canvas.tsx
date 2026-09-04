"use client";

import { useEffect, useRef } from "react";
import { useDice } from "@/components/dice/dice-provider";
import {
  expandDieColors,
  resultFromThreejsRoll,
  toThreejsNotation,
} from "@/lib/dice/notation";
import type { RollRequest } from "@/lib/dice/types";

/** How long settled dice stay visible before fading. */
const FADE_HOLD_MS = 2800;
/** Opacity fade before clear. */
const FADE_DURATION_MS = 1000;

type ThreejsResult = {
  sets?: { rolls?: { value?: number; sides?: number }[] }[];
  modifier?: number;
  total?: number;
};

type DiceFactory = {
  create: (type: string) => unknown;
  applyColorSet: (set: unknown) => void;
};

type DiceColors = {
  makeColorSet: (config: Record<string, unknown>) => Promise<unknown>;
};

type DiceBoxThreejs = {
  initialize: () => Promise<void>;
  roll: (notation: string) => Promise<ThreejsResult>;
  clearDice: () => void;
  getDiceResults: () => ThreejsResult;
  updateConfig: (config: Record<string, unknown>) => Promise<void>;
  DiceFactory: DiceFactory;
  DiceColors: DiceColors;
  colorData: unknown;
  desk?: { visible: boolean; material?: { opacity: number; transparent?: boolean } };
  renderer?: { domElement: HTMLCanvasElement };
  theme_customColorset?: Record<string, unknown> | null;
};

type DiceBoxThreejsConstructor = new (
  selector: string,
  config?: Record<string, unknown>,
) => DiceBoxThreejs;

/** Mix a hex color toward white so dice read as lit, not muddy. */
function lightenHex(hex: string, amount = 0.42): string {
  const raw = hex.replace("#", "");
  if (!/^[0-9A-Fa-f]{6}$/.test(raw)) return hex;
  const mix = (channel: number) =>
    Math.round(channel + (255 - channel) * amount);
  const r = mix(Number.parseInt(raw.slice(0, 2), 16));
  const g = mix(Number.parseInt(raw.slice(2, 4), 16));
  const b = mix(Number.parseInt(raw.slice(4, 6), 16));
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

function customColorsetFromHex(hex: string) {
  const normalized = /^#[0-9A-Fa-f]{6}$/.test(hex) ? hex : "#B8860B";
  const lit = lightenHex(normalized, 0.45);
  return {
    name: `custom-lit-${normalized.replace("#", "").toLowerCase()}`,
    foreground: "#1a1a1a",
    background: lit,
    outline: "#ffffff",
    edge: lightenHex(normalized, 0.62),
    texture: "none",
    material: "plastic",
  };
}

function hideDesk(box: DiceBoxThreejs) {
  if (!box.desk) return;
  box.desk.visible = false;
  if (box.desk.material) {
    box.desk.material.transparent = true;
    box.desk.material.opacity = 0;
  }
}

async function preloadColorSets(
  box: DiceBoxThreejs,
  colors: string[],
): Promise<Map<string, unknown>> {
  const map = new Map<string, unknown>();
  const unique = [...new Set(colors.map((c) => c.toLowerCase()))];
  for (const hex of unique) {
    const set = await box.DiceColors.makeColorSet(customColorsetFromHex(hex));
    map.set(hex, set);
  }
  return map;
}

/**
 * Throw every die in one physics toss, tinting each mesh by themeColor.
 * threejs only keeps one active colorset, so we swap it inside DiceFactory.create.
 */
async function rollWithPerDieColors(
  box: DiceBoxThreejs,
  notation: string,
  dieColors: string[],
  fallbackColor: string,
): Promise<ThreejsResult> {
  const colors =
    dieColors.length > 0
      ? dieColors
      : [fallbackColor];
  const colorSets = await preloadColorSets(box, [...colors, fallbackColor]);
  const factory = box.DiceFactory;
  const originalCreate = factory.create.bind(factory);
  let createIndex = 0;

  factory.create = (type: string) => {
    const hex = (colors[createIndex] ?? fallbackColor).toLowerCase();
    createIndex += 1;
    const set = colorSets.get(hex) ?? colorSets.get(fallbackColor.toLowerCase());
    if (set) {
      factory.applyColorSet(set);
      box.colorData = set;
    }
    return originalCreate(type);
  };

  try {
    return await box.roll(notation);
  } finally {
    factory.create = originalCreate;
  }
}

/**
 * Full-viewport transparent dice overlay. pointer-events: none so sheet stays clickable.
 * Uses dice-box-threejs so campaign rolls can force shared faces onto the mesh.
 */
export function DiceCanvas() {
  const {
    activeRequest,
    acknowledgeRollStart,
    completeRoll,
    failRoll,
    clearSignal,
    setEngineReady,
    themeColor,
    silhouetteActive,
  } = useDice();

  const containerRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<DiceBoxThreejs | null>(null);
  const pendingRef = useRef<RollRequest | null>(null);
  const rollingRef = useRef(false);
  const fadeTimersRef = useRef<{ hold?: number; clear?: number }>({});
  const seenIdsRef = useRef(new Set<string>());
  const themeColorRef = useRef(themeColor);

  function cancelFade() {
    const timers = fadeTimersRef.current;
    if (timers.hold) window.clearTimeout(timers.hold);
    if (timers.clear) window.clearTimeout(timers.clear);
    fadeTimersRef.current = {};
    const canvas = boxRef.current?.renderer?.domElement;
    if (canvas) canvas.style.opacity = "1";
  }

  function scheduleFadeOut() {
    cancelFade();
    const box = boxRef.current;
    const canvas = box?.renderer?.domElement;
    if (!box || !canvas) return;
    fadeTimersRef.current.hold = window.setTimeout(() => {
      canvas.style.transition = `opacity ${FADE_DURATION_MS}ms ease`;
      canvas.style.opacity = "0";
      fadeTimersRef.current.clear = window.setTimeout(() => {
        try {
          box.clearDice();
        } catch {
          // ignore
        }
        canvas.style.opacity = "1";
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
        const mod = await import("@3d-dice/dice-box-threejs");
        if (cancelled || !containerRef.current) return;
        const DiceBox = (mod.default ?? mod) as DiceBoxThreejsConstructor;
        const box = new DiceBox("#pc-planner-dice-box", {
          assetPath: "/dice-box-threejs/",
          framerate: 1 / 60,
          sounds: true,
          volume: 85,
          sound_dieMaterial: "plastic",
          shadows: false,
          theme_surface: "green-felt",
          theme_material: "plastic",
          theme_customColorset: customColorsetFromHex(themeColorRef.current),
          color_spotlight: 0xfff6e8,
          light_intensity: 1.65,
          strength: 1.2,
          onRollComplete: () => {
            // Completion is handled from await box.roll().
          },
        });

        await box.initialize();
        if (cancelled) {
          try {
            box.clearDice();
          } catch {
            // ignore
          }
          return;
        }
        hideDesk(box);
        const canvas = box.renderer?.domElement;
        if (canvas) {
          canvas.style.width = "100%";
          canvas.style.height = "100%";
          canvas.style.pointerEvents = "none";
        }
        const onResize = () => {
          requestAnimationFrame(() => hideDesk(box));
        };
        window.addEventListener("resize", onResize);
        (box as DiceBoxThreejs & { __onResize?: () => void }).__onResize = onResize;
        boxRef.current = box;
        setEngineReady(true);
      } catch (err) {
        console.error("[DiceCanvas] failed to init dice-box-threejs", err);
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
        const onResize = (box as DiceBoxThreejs & { __onResize?: () => void })
          .__onResize;
        if (onResize) window.removeEventListener("resize", onResize);
        try {
          box.clearDice();
        } catch {
          // ignore
        }
      }
      if (el) el.replaceChildren();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    themeColorRef.current = themeColor;
    const box = boxRef.current;
    if (!box || rollingRef.current) return;
    void (async () => {
      try {
        const set = customColorsetFromHex(themeColor);
        box.theme_customColorset = set;
        await box.updateConfig({ theme_customColorset: set });
        hideDesk(box);
      } catch {
        // ignore theme update failures
      }
    })();
  }, [themeColor]);

  useEffect(() => {
    if (clearSignal === 0) return;
    cancelFade();
    const box = boxRef.current;
    if (!box) return;
    try {
      box.clearDice();
    } catch {
      // ignore
    }
    pendingRef.current = null;
    rollingRef.current = false;
  }, [clearSignal]);

  useEffect(() => {
    if (!activeRequest) return;
    const box = boxRef.current;
    if (!box || rollingRef.current) {
      return;
    }

    if (seenIdsRef.current.has(activeRequest.id)) {
      acknowledgeRollStart();
      return;
    }
    seenIdsRef.current.add(activeRequest.id);
    if (seenIdsRef.current.size > 80) {
      const first = seenIdsRef.current.values().next().value;
      if (first) seenIdsRef.current.delete(first);
    }

    const request = activeRequest;
    acknowledgeRollStart();

    const notation = toThreejsNotation(
      request.dice,
      request.modifier,
      request.faces,
    );
    if (!notation) {
      rollingRef.current = false;
      return;
    }

    pendingRef.current = request;
    rollingRef.current = true;
    cancelFade();

    let finished = false;
    const finishOnce = (payload: ThreejsResult | undefined) => {
      if (finished) return;
      if (pendingRef.current?.id !== request.id) return;
      finished = true;
      pendingRef.current = null;
      rollingRef.current = false;
      completeRoll(resultFromThreejsRoll(request, payload));
      scheduleFadeOut();
    };

    void (async () => {
      try {
        hideDesk(box);
        try {
          box.clearDice();
        } catch {
          // ignore
        }
        const fallback = themeColorRef.current;
        const dieColors = expandDieColors(request.dice, fallback);
        const results = await rollWithPerDieColors(
          box,
          notation,
          dieColors,
          fallback,
        );
        finishOnce(results);
      } catch (err) {
        console.error("[DiceCanvas] roll failed", err);
        if (!finished && pendingRef.current?.id === request.id) {
          finished = true;
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
      className={`dice-overlay${silhouetteActive ? " dice-overlay--silhouette" : ""}`}
      aria-hidden="true"
    />
  );
}
