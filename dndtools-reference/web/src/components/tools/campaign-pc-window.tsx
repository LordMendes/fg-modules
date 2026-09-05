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
import { ExternalLink, Maximize2, Minus } from "lucide-react";
import { CampaignPcAvatar } from "@/components/tools/campaign-pc-avatar";
import {
  clampTrayPos,
  useFloatingTrayPos,
} from "@/components/dice/use-floating-tray-pos";

const WINDOW_POS_KEY = "campaign-pc-window-pos";
const WINDOW_SIZE_KEY = "campaign-pc-window-size";
const TOKEN_POS_KEY = "campaign-pc-token-pos";

const MIN_WIDTH = 320;
const MIN_HEIGHT = 256;

type WindowSize = { width: number; height: number };

type CampaignPcWindowProps = {
  characterName: string;
  tokenImageUrl?: string | null;
  statusLabel: string;
  minimized: boolean;
  onMinimizedChange: (minimized: boolean) => void;
  /** When true, token click focuses the pop-out instead of restoring. */
  poppedOut?: boolean;
  onPopOut?: () => void;
  onFocusPopOut?: () => void;
  children: ReactNode;
};

function defaultSize(): WindowSize {
  const width = Math.min(42 * 16, Math.max(MIN_WIDTH, window.innerWidth - 72));
  const height = Math.min(
    Math.round(window.innerHeight * 0.7),
    Math.max(MIN_HEIGHT, window.innerHeight - 88),
  );
  return { width, height };
}

function clampSize(width: number, height: number): WindowSize {
  const maxW = Math.max(MIN_WIDTH, window.innerWidth - 24);
  const maxH = Math.max(MIN_HEIGHT, window.innerHeight - 24);
  return {
    width: Math.min(maxW, Math.max(MIN_WIDTH, Math.round(width))),
    height: Math.min(maxH, Math.max(MIN_HEIGHT, Math.round(height))),
  };
}

export function CampaignPcWindow({
  characterName,
  tokenImageUrl = null,
  statusLabel,
  minimized,
  onMinimizedChange,
  poppedOut = false,
  onPopOut,
  onFocusPopOut,
  children,
}: CampaignPcWindowProps) {
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
        Math.max(72, (window.innerWidth - width) / 2),
        Math.max(72, (window.innerHeight - height) / 3),
        width,
        height,
      ),
    [],
  );

  const defaultTokenPos = useCallback(
    (width: number, height: number) =>
      clampTrayPos(88, Math.max(72, window.innerHeight - height - 120), width, height),
    [],
  );

  const windowPos = useFloatingTrayPos({
    storageKey: WINDOW_POS_KEY,
    defaultPos: defaultWindowPos,
    layoutKey: `${minimized ? "min" : "exp"}:${size?.width ?? 0}x${size?.height ?? 0}`,
  });

  const tokenPos = useFloatingTrayPos({
    storageKey: TOKEN_POS_KEY,
    defaultPos: defaultTokenPos,
    layoutKey: minimized || poppedOut ? "token" : "hidden",
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(WINDOW_SIZE_KEY);
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
  }, []);

  useEffect(() => {
    if (!size) return;
    try {
      localStorage.setItem(WINDOW_SIZE_KEY, JSON.stringify(size));
    } catch {
      // ignore
    }
  }, [size]);

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

  function onTokenPointerDown(event: ReactPointerEvent) {
    const current = tokenPos.ensurePos();
    if (!current) return;
    tokenPos.beginMoveDrag(event, current);
  }

  function onTokenPointerUp(event: ReactPointerEvent) {
    const moved = tokenPos.movedRef.current;
    tokenPos.onMovePointerUp(event);
    if (moved) return;
    if (poppedOut) {
      onFocusPopOut?.();
      return;
    }
    onMinimizedChange(false);
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

  const showToken = minimized || poppedOut;
  const hideWindow = minimized || poppedOut;

  const windowStyle: CSSProperties = {
    ...(windowPos.style ?? {}),
    ...(size ? { width: size.width, height: size.height, maxHeight: "none" } : {}),
  };

  return (
    <>
      <div
        ref={windowPos.rootRef}
        className={`campaign-pc-window${hideWindow ? " campaign-pc-window--hidden" : ""}`}
        style={windowStyle}
        role="dialog"
        aria-label={`${characterName || "Character"} sheet`}
        aria-hidden={hideWindow || undefined}
        inert={hideWindow ? true : undefined}
      >
        <header
          className="campaign-pc-window-titlebar"
          onPointerDown={onTitlePointerDown}
          onPointerMove={windowPos.onMovePointerMove}
          onPointerUp={windowPos.onMovePointerUp}
          onPointerCancel={windowPos.onMovePointerUp}
        >
          <div className="campaign-pc-window-title-text">
            <strong>{characterName || "Unnamed"}</strong>
            {statusLabel ? <span>{statusLabel}</span> : null}
          </div>
          <div className="campaign-pc-window-title-actions">
            {onPopOut ? (
              <button
                type="button"
                className="campaign-pc-window-minimize"
                aria-label="Open character sheet in a new window"
                title="Open in new window"
                onClick={() => onPopOut()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <ExternalLink size={15} aria-hidden />
              </button>
            ) : null}
            <button
              type="button"
              className="campaign-pc-window-minimize"
              aria-label="Minimize character sheet"
              onClick={() => onMinimizedChange(true)}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <Minus size={16} aria-hidden />
            </button>
          </div>
        </header>
        <div className="campaign-pc-window-body">{children}</div>
        <div
          className="campaign-pc-window-resize"
          onPointerDown={onResizePointerDown}
          onPointerMove={onResizePointerMove}
          onPointerUp={onResizePointerUp}
          onPointerCancel={onResizePointerUp}
          aria-hidden="true"
        />
      </div>

      {showToken ? (
        <div
          ref={tokenPos.rootRef}
          className={`campaign-pc-token${poppedOut ? " campaign-pc-token--popped" : ""}`}
          style={tokenPos.style}
          onPointerDown={onTokenPointerDown}
          onPointerMove={tokenPos.onMovePointerMove}
          onPointerUp={onTokenPointerUp}
          onPointerCancel={tokenPos.onMovePointerUp}
          role="button"
          tabIndex={0}
          aria-label={
            poppedOut
              ? `Focus ${characterName} in other window`
              : `Restore ${characterName} character sheet`
          }
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              if (poppedOut) onFocusPopOut?.();
              else onMinimizedChange(false);
            }
          }}
        >
          <CampaignPcAvatar name={characterName} src={tokenImageUrl} size="lg" />
          <span className="campaign-pc-token-name">{characterName || "Unnamed"}</span>
          {poppedOut ? (
            <span className="campaign-pc-token-hint">Other window</span>
          ) : (
            <button
              type="button"
              className="campaign-pc-token-expand"
              aria-label="Expand character sheet"
              onClick={(e) => {
                e.stopPropagation();
                onMinimizedChange(false);
              }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <Maximize2 size={14} aria-hidden />
            </button>
          )}
        </div>
      ) : null}
    </>
  );
}
