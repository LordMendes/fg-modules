"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { ExternalLink, X } from "lucide-react";
import {
  clampTrayPos,
  useFloatingTrayPos,
} from "@/components/dice/use-floating-tray-pos";

const MIN_WIDTH = 360;
const MIN_HEIGHT = 320;
const BASE_Z_INDEX = 70;

type WindowSize = { width: number; height: number };

type CombatFloatingWindowProps = {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  onClose: () => void;
  onPopOut?: () => void;
  zIndex?: number;
  children: ReactNode;
};

function defaultSize(): WindowSize {
  return {
    width: 420,
    height: Math.round(window.innerHeight * 0.8),
  };
}

function clampSize(width: number, height: number): WindowSize {
  const maxW = Math.max(MIN_WIDTH, window.innerWidth - 24);
  const maxH = Math.max(MIN_HEIGHT, window.innerHeight - 24);
  return {
    width: Math.min(maxW, Math.max(MIN_WIDTH, Math.round(width))),
    height: Math.min(maxH, Math.max(MIN_HEIGHT, Math.round(height))),
  };
}

export function CombatFloatingWindow({
  title,
  subtitle,
  icon,
  onClose,
  onPopOut,
  zIndex = BASE_Z_INDEX,
  children,
}: CombatFloatingWindowProps) {
  const windowPosKey = "campaign-combat-window-pos";
  const windowSizeKey = "campaign-combat-window-size";

  const [size, setSize] = useState<WindowSize | null>(null);
  const resizeDragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    origW: number;
    origH: number;
  } | null>(null);

  const defaultWindowPos = useCallback(
    (width: number, height: number) =>
      clampTrayPos(
        Math.max(72, window.innerWidth - width - 24),
        Math.max(72, (window.innerHeight - height) / 3),
        width,
        height,
      ),
    [],
  );

  const windowPos = useFloatingTrayPos({
    storageKey: windowPosKey,
    defaultPos: defaultWindowPos,
    layoutKey: `${size?.width ?? 0}x${size?.height ?? 0}`,
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(windowSizeKey);
      if (raw) {
        const parsed = JSON.parse(raw) as WindowSize;
        if (typeof parsed.width === "number" && typeof parsed.height === "number") {
          setSize(clampSize(parsed.width, parsed.height));
          return;
        }
      }
    } catch {
      // ignore
    }
    setSize(defaultSize());
  }, [windowSizeKey]);

  useEffect(() => {
    if (!size) return;
    try {
      localStorage.setItem(windowSizeKey, JSON.stringify(size));
    } catch {
      // ignore
    }
  }, [size, windowSizeKey]);

  useEffect(() => {
    function onResize() {
      setSize((prev) => (prev ? clampSize(prev.width, prev.height) : prev));
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  function onTitlePointerDown(event: ReactPointerEvent) {
    const current = windowPos.ensurePos();
    if (!current) return;
    windowPos.beginMoveDrag(event, current);
  }

  function onResizePointerDown(event: ReactPointerEvent) {
    if (event.button !== 0 || !size) return;
    event.preventDefault();
    event.stopPropagation();
    resizeDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origW: size.width,
      origH: size.height,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onResizePointerMove(event: ReactPointerEvent) {
    const drag = resizeDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const next = clampSize(
      drag.origW + (event.clientX - drag.startX),
      drag.origH + (event.clientY - drag.startY),
    );
    setSize(next);
    if (windowPos.pos) {
      windowPos.setPos(
        clampTrayPos(windowPos.pos.x, windowPos.pos.y, next.width, next.height),
      );
    }
  }

  function onResizePointerUp(event: ReactPointerEvent) {
    const drag = resizeDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    resizeDragRef.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // ignore
    }
  }

  const windowStyle: CSSProperties = {
    ...(windowPos.style ?? {}),
    ...(size ? { width: size.width, height: size.height, maxHeight: "none" } : {}),
    zIndex,
  };

  return (
    <div
      ref={windowPos.rootRef}
      className="combat-window"
      style={windowStyle}
      role="dialog"
      aria-label={title}
    >
      <header
        className="combat-window-titlebar"
        onPointerDown={onTitlePointerDown}
        onPointerMove={windowPos.onMovePointerMove}
        onPointerUp={windowPos.onMovePointerUp}
        onPointerCancel={windowPos.onMovePointerUp}
      >
        <div className="combat-window-title-text">
          <h2 className="combat-window-title">
            {icon}
            {title}
          </h2>
          {subtitle ? <p className="combat-window-sub">{subtitle}</p> : null}
        </div>
        <div className="combat-window-title-actions">
          {onPopOut ? (
            <button
              type="button"
              className="combat-window-action"
              aria-label="Open combat tracker in a new window"
              title="Open in new window"
              onClick={() => onPopOut()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <ExternalLink size={15} aria-hidden />
            </button>
          ) : null}
          <button
            type="button"
            className="combat-window-action"
            aria-label="Close combat tracker"
            title="Close"
            onClick={() => onClose()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <X size={16} aria-hidden />
          </button>
        </div>
      </header>
      <div className="combat-window-body">{children}</div>
      <div
        className="combat-window-resize"
        onPointerDown={onResizePointerDown}
        onPointerMove={onResizePointerMove}
        onPointerUp={onResizePointerUp}
        onPointerCancel={onResizePointerUp}
        aria-hidden="true"
      />
    </div>
  );
}
