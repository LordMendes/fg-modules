"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

export type TrayPos = { x: number; y: number };

export const DRAG_MOVE_THRESHOLD_PX = 12;

export function clampTrayPos(x: number, y: number, width: number, height: number): TrayPos {
  const margin = 8;
  const maxX = Math.max(margin, window.innerWidth - width - margin);
  const maxY = Math.max(margin, window.innerHeight - height - margin);
  return {
    x: Math.min(maxX, Math.max(margin, x)),
    y: Math.min(maxY, Math.max(margin, y)),
  };
}

type UseFloatingTrayOptions = {
  storageKey: string;
  defaultPos: (width: number, height: number) => TrayPos;
  /** Re-clamp when this value changes (e.g. expanded). */
  layoutKey?: string | boolean | number;
};

/**
 * Persisted left/top position + pointer drag helpers for floating trays.
 */
export function useFloatingTrayPos({
  storageKey,
  defaultPos,
  layoutKey,
}: UseFloatingTrayOptions) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<TrayPos | null>(null);
  const moveDragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const movedRef = useRef(false);
  const hydrated = useRef(false);

  const measureDefault = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos(defaultPos(rect.width || 180, rect.height || 48));
  }, [defaultPos]);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as TrayPos;
        if (typeof parsed.x === "number" && typeof parsed.y === "number") {
          setPos(parsed);
          return;
        }
      }
    } catch {
      // ignore
    }
    requestAnimationFrame(() => measureDefault());
  }, [storageKey, measureDefault]);

  useEffect(() => {
    if (!pos) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(pos));
    } catch {
      // ignore
    }
  }, [pos, storageKey]);

  useEffect(() => {
    function onResize() {
      setPos((prev) => {
        const el = rootRef.current;
        if (!el || !prev) return prev;
        const rect = el.getBoundingClientRect();
        return clampTrayPos(prev.x, prev.y, rect.width, rect.height);
      });
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    requestAnimationFrame(() => {
      const el = rootRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setPos((prev) => {
        if (!prev) return prev;
        return clampTrayPos(prev.x, prev.y, rect.width, rect.height);
      });
    });
  }, [layoutKey]);

  function persistClampedPos(next: TrayPos) {
    const el = rootRef.current;
    if (!el) {
      setPos(next);
      return;
    }
    const rect = el.getBoundingClientRect();
    setPos(clampTrayPos(next.x, next.y, rect.width, rect.height));
  }

  /** Resolve a drag origin even before localStorage hydration finishes. */
  function ensurePos(): TrayPos | null {
    if (pos) return pos;
    const el = rootRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const next = defaultPos(rect.width || 180, rect.height || 48);
    const clamped = clampTrayPos(next.x, next.y, rect.width || 180, rect.height || 48);
    setPos(clamped);
    return clamped;
  }

  function beginMoveDrag(event: ReactPointerEvent, current: TrayPos) {
    if (event.button !== 0) return;
    movedRef.current = false;
    moveDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origX: current.x,
      origY: current.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onMovePointerMove(event: ReactPointerEvent) {
    const drag = moveDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (Math.hypot(dx, dy) >= DRAG_MOVE_THRESHOLD_PX) {
      movedRef.current = true;
    }
    persistClampedPos({
      x: drag.origX + dx,
      y: drag.origY + dy,
    });
  }

  function onMovePointerUp(event: ReactPointerEvent) {
    const drag = moveDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    moveDragRef.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // ignore
    }
  }

  return {
    rootRef,
    pos,
    setPos,
    movedRef,
    ensurePos,
    beginMoveDrag,
    onMovePointerMove,
    onMovePointerUp,
    style: pos
      ? ({ left: pos.x, top: pos.y, bottom: "auto", right: "auto" } as const)
      : undefined,
  };
}
