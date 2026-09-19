"use client";

import type { CombatEventView } from "@/lib/combat/events/types";
import type { CombatantView, DamageType } from "@/lib/combat/types";
import type { GridConfig } from "@/lib/map/grid";
import { gridToPixels } from "@/lib/map/grid";
import {
  buildFxForEvent,
  coalesceFloaters,
  shouldCoalesceBurst,
  type FloaterSpec,
  type FxPoint,
  type SvgFxSpec,
} from "@/lib/map/mapCombatFxUtils";
import { tokenCenterPx } from "@/lib/map/tokenGeometry";
import type { MapTokenView } from "@/lib/map/types";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

type MapCombatFxLayerProps = {
  combatEvents: CombatEventView[];
  tokens: MapTokenView[];
  tokensRef: React.RefObject<MapTokenView[]>;
  grid: GridConfig;
  imageWidth: number;
  imageHeight: number;
  viewportScale: number;
  combatants: CombatantView[];
  isDm: boolean;
  viewerPcPlanId: string | null;
  combatActive: boolean;
  onShakeToken?: (tokenId: string, durationMs: number) => void;
  onPulseToken?: (tokenId: string, durationMs: number) => void;
  onDeathToken?: (tokenId: string, durationMs: number) => void;
};

function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", onStoreChange);
      return () => mq.removeEventListener("change", onStoreChange);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

function floaterClass(tone: FloaterSpec["tone"], large?: boolean): string {
  return [
    "map-fx-floater",
    `map-fx-floater--${tone}`,
    large ? "map-fx-floater--large" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function burstClass(damageType?: DamageType): string {
  if (!damageType || damageType === "untyped") return "map-fx-burst--untyped";
  return `map-fx-burst--${damageType}`;
}

function SvgFxItem({
  fx,
  reducedMotion,
}: {
  fx: SvgFxSpec;
  reducedMotion: boolean;
}) {
  switch (fx.kind) {
    case "arc":
      return (
        <path
          key={fx.id}
          className={`map-fx-arc${reducedMotion ? " map-fx-arc--static" : ""}`}
          d={`M ${fx.x - fx.radius * 0.6} ${fx.y - fx.radius * 0.2} Q ${fx.x + fx.radius * 0.1} ${fx.y - fx.radius} ${fx.x + fx.radius * 0.7} ${fx.y - fx.radius * 0.15}`}
          style={{ animationDuration: `${fx.durationMs}ms` }}
        />
      );
    case "projectile":
      if (reducedMotion) return null;
      return (
        <g key={fx.id} className="map-fx-projectile">
          <line
            x1={fx.from.x}
            y1={fx.from.y}
            x2={fx.to.x}
            y2={fx.to.y}
            className="map-fx-projectile-trail"
          />
          <circle
            cx={fx.from.x}
            cy={fx.from.y}
            r={4}
            className="map-fx-projectile-dot"
            style={{ animationDuration: `${fx.durationMs}ms` }}
          >
            <animateMotion
              dur={`${fx.durationMs}ms`}
              fill="freeze"
              path={`M ${fx.from.x} ${fx.from.y} L ${fx.to.x} ${fx.to.y}`}
            />
          </circle>
        </g>
      );
    case "ring":
      return (
        <circle
          key={fx.id}
          cx={fx.x}
          cy={fx.y}
          r={fx.radius}
          className={`map-fx-ring map-fx-ring--${fx.tone}${reducedMotion ? " map-fx-ring--static" : ""}`}
          style={{ animationDuration: `${fx.durationMs}ms` }}
        />
      );
    case "burst":
      return (
        <g key={fx.id}>
          {fx.shape === "cone" ? (
            <path
              d={`M ${fx.x} ${fx.y} L ${fx.x + fx.radius} ${fx.y - fx.radius * 0.35} A ${fx.radius} ${fx.radius} 0 0 1 ${fx.x + fx.radius} ${fx.y + fx.radius * 0.35} Z`}
              className={`map-fx-burst ${burstClass(fx.damageType)}${reducedMotion ? " map-fx-burst--static" : ""}`}
              transform={`rotate(${fx.angle} ${fx.x} ${fx.y})`}
              style={{ animationDuration: `${fx.durationMs}ms` }}
            />
          ) : fx.shape === "square" ? (
            <rect
              x={fx.x - fx.radius / 2}
              y={fx.y - fx.radius / 2}
              width={fx.radius}
              height={fx.radius}
              className={`map-fx-burst ${burstClass(fx.damageType)}${reducedMotion ? " map-fx-burst--static" : ""}`}
              style={{ animationDuration: `${fx.durationMs}ms` }}
            />
          ) : (
            <circle
              cx={fx.x}
              cy={fx.y}
              r={fx.radius}
              className={`map-fx-burst ${burstClass(fx.damageType)}${reducedMotion ? " map-fx-burst--static" : ""}`}
              style={{ animationDuration: `${fx.durationMs}ms` }}
            />
          )}
        </g>
      );
    default:
      return null;
  }
}

export function MapCombatFxLayer({
  combatEvents,
  tokens,
  tokensRef,
  grid,
  imageWidth,
  imageHeight,
  viewportScale,
  combatants,
  isDm,
  viewerPcPlanId,
  combatActive,
  onShakeToken,
  onPulseToken,
  onDeathToken,
}: MapCombatFxLayerProps) {
  const reducedMotion = useReducedMotion();
  const lastSeqRef = useRef(0);
  const eventTimesRef = useRef<number[]>([]);
  const [floaters, setFloaters] = useState<FloaterSpec[]>([]);
  const [svgFx, setSvgFx] = useState<SvgFxSpec[]>([]);
  const [domFx, setDomFx] = useState<
    Array<
      | { id: string; kind: "effectPop" | "effectFade"; tokenId: string; label: string }
    >
  >([]);

  const tokenCenter = useCallback(
    (tokenId: string): FxPoint | null => {
      const list = tokensRef.current ?? tokens;
      const token = list.find((t) => t.id === tokenId);
      if (!token) return null;
      return tokenCenterPx(token, grid);
    },
    [grid, tokens, tokensRef],
  );

  const removeFloater = useCallback((id: string) => {
    setFloaters((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const removeSvgFx = useCallback((id: string) => {
    setSvgFx((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const removeDomFx = useCallback((id: string) => {
    setDomFx((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const floaterFontSize = useMemo(
    () => Math.max(11, Math.min(18, 13 / Math.max(viewportScale, 0.35))),
    [viewportScale],
  );

  useEffect(() => {
    if (!combatActive || combatEvents.length === 0) return;

    const pending = combatEvents.filter(
      (event) => event.seq > lastSeqRef.current && !event.reverted,
    );
    if (pending.length === 0) return;

    lastSeqRef.current = Math.max(
      lastSeqRef.current,
      ...pending.map((event) => event.seq),
    );

    const byRoll = new Map<string | null, CombatEventView[]>();
    for (const event of pending) {
      const key = event.rollId ?? `solo-${event.seq}`;
      const group = byRoll.get(key) ?? [];
      group.push(event);
      byRoll.set(key, group);
    }

    let delay = 0;
    for (const group of byRoll.values()) {
      for (const event of group) {
        const now = Date.now();
        eventTimesRef.current.push(now);
        const coalesce = shouldCoalesceBurst(eventTimesRef.current, now);
        eventTimesRef.current = eventTimesRef.current.filter((t) => t >= now - 1000);

        window.setTimeout(() => {
          const batch = buildFxForEvent(event, {
            combatants,
            tokenCenter,
            imageWidth,
            imageHeight,
            isDm,
            viewerPcPlanId,
            reducedMotion,
            skipShake: coalesce,
            gridSizePx: grid.gridSizePx,
            gridPointToPx: (x, y) => gridToPixels(x, y, grid),
          });
          if (!batch) return;

          const nextFloaters = coalesce
            ? coalesceFloaters(batch.floaters)
            : batch.floaters;
          if (nextFloaters.length) {
            setFloaters((prev) => [...prev, ...nextFloaters]);
            for (const floater of nextFloaters) {
              window.setTimeout(() => removeFloater(floater.id), 950);
            }
          }

          const renderableSvg = batch.svgFx.filter(
            (fx) => fx.kind === "arc" || fx.kind === "projectile" || fx.kind === "ring" || fx.kind === "burst",
          );
          if (renderableSvg.length) {
            setSvgFx((prev) => [...prev, ...renderableSvg]);
            for (const fx of renderableSvg) {
              window.setTimeout(() => removeSvgFx(fx.id), fx.durationMs + 50);
            }
          }

          for (const fx of batch.svgFx) {
            if (fx.kind === "shake") onShakeToken?.(fx.tokenId, fx.durationMs);
            if (fx.kind === "pulse") onPulseToken?.(fx.tokenId, fx.durationMs);
            if (fx.kind === "deathFx") onDeathToken?.(fx.tokenId, fx.durationMs);
            if (fx.kind === "effectPop" || fx.kind === "effectFade") {
              setDomFx((prev) => [
                ...prev,
                {
                  id: fx.id,
                  kind: fx.kind,
                  tokenId: fx.tokenId,
                  label: fx.label,
                },
              ]);
              window.setTimeout(() => removeDomFx(fx.id), fx.durationMs + 50);
            }
          }
        }, delay);

        delay += 120;
      }
    }
  }, [
    combatActive,
    combatEvents,
    combatants,
    imageHeight,
    imageWidth,
    isDm,
    onDeathToken,
    onPulseToken,
    onShakeToken,
    reducedMotion,
    removeDomFx,
    removeFloater,
    removeSvgFx,
    tokenCenter,
    viewerPcPlanId,
  ]);

  if (!combatActive) return null;

  return (
    <>
      <svg
        className="map-combat-fx-layer"
        width={imageWidth}
        height={imageHeight}
        aria-hidden="true"
      >
        {svgFx.map((fx) => (
          <SvgFxItem key={fx.id} fx={fx} reducedMotion={reducedMotion} />
        ))}
      </svg>

      <div className="map-combat-fx-floaters" aria-hidden="true">
        {floaters.map((floater) => (
          <span
            key={floater.id}
            className={`${floaterClass(floater.tone, floater.large)}${reducedMotion ? " map-fx-floater--reduced" : ""}`}
            style={{
              left: floater.x,
              top: floater.y,
              fontSize: floaterFontSize,
            }}
            onAnimationEnd={() => removeFloater(floater.id)}
          >
            {floater.text}
          </span>
        ))}
      </div>

      {domFx.map((fx) => {
        const token = (tokensRef.current ?? tokens).find((t) => t.id === fx.tokenId);
        if (!token) return null;
        const center = tokenCenterPx(token, grid);
        const left = gridToPixels(token.x, token.y, grid).x;
        const width = token.width * grid.gridSizePx;
        return (
          <span
            key={fx.id}
            className={`map-fx-effect-label map-fx-effect-label--${fx.kind === "effectPop" ? "pop" : "fade"}${reducedMotion ? " map-fx-effect-label--reduced" : ""}`}
            style={{
              left: left + width / 2,
              top: center.y + token.height * grid.gridSizePx * 0.35,
            }}
            onAnimationEnd={() => removeDomFx(fx.id)}
          >
            {fx.label}
          </span>
        );
      })}
    </>
  );
}
