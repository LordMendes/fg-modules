"use client";

import { useEffect, useId, useRef, useState } from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

type DraggableDialogProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  panelClassName?: string;
  ariaLabelledBy?: string;
  /** When false, no backdrop or focus trap so several windows can stay open. */
  modal?: boolean;
  zIndex?: number;
  onActivate?: () => void;
  /** Offsets the initial position so stacked windows do not overlap. */
  cascadeIndex?: number;
  closeOnEscape?: boolean;
};

export function DraggableDialog({
  open,
  title,
  onClose,
  children,
  className,
  panelClassName,
  ariaLabelledBy,
  modal = true,
  zIndex,
  onActivate,
  cascadeIndex = 0,
  closeOnEscape,
}: DraggableDialogProps) {
  const titleId = useId();
  const labelledBy = ariaLabelledBy ?? titleId;
  const panelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const handleEscape = closeOnEscape ?? modal;

  useEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }

    previouslyFocused.current = document.activeElement as HTMLElement | null;

    const panel = panelRef.current;
    if (!panel) return;

    const rect = panel.getBoundingClientRect();
    const offset = cascadeIndex * 28;
    setPos({
      x: Math.max(16, (window.innerWidth - rect.width) / 2 + offset),
      y: Math.max(16, (window.innerHeight - rect.height) / 2 + offset),
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && handleEscape) {
        onClose();
        return;
      }

      if (!modal || event.key !== "Tab" || !panel) return;

      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);

      if (focusable.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (modal) previouslyFocused.current?.focus();
    };
  }, [open, onClose, modal, cascadeIndex, handleEscape]);

  function handleHeaderPointerDown(event: React.PointerEvent<HTMLElement>) {
    if ((event.target as HTMLElement).closest("button:not(.draggable-dialog-handle)")) {
      return;
    }
    if (!pos) return;
    onActivate?.();

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origX: pos.x,
      origY: pos.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleHeaderPointerMove(event: React.PointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    setPos({
      x: drag.origX + (event.clientX - drag.startX),
      y: drag.origY + (event.clientY - drag.startY),
    });
  }

  function handleHeaderPointerUp(event: React.PointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  if (!open) return null;

  const rootStyle = zIndex != null ? { zIndex } : undefined;

  return (
    <div
      className={["draggable-dialog-root", className].filter(Boolean).join(" ")}
      role="presentation"
      style={rootStyle}
    >
      {modal ? (
        <button
          type="button"
          className="draggable-dialog-backdrop"
          aria-label="Close dialog"
          onClick={onClose}
        />
      ) : null}
      <div
        ref={panelRef}
        className={["draggable-dialog-panel", panelClassName].filter(Boolean).join(" ")}
        role="dialog"
        aria-modal={modal}
        aria-labelledby={labelledBy}
        tabIndex={-1}
        onPointerDown={() => onActivate?.()}
        style={
          pos
            ? {
                left: `${pos.x}px`,
                top: `${pos.y}px`,
                visibility: "visible",
              }
            : { visibility: "hidden" }
        }
      >
        <header
          className="draggable-dialog-header draggable-dialog-handle"
          onPointerDown={handleHeaderPointerDown}
          onPointerMove={handleHeaderPointerMove}
          onPointerUp={handleHeaderPointerUp}
          onPointerCancel={handleHeaderPointerUp}
        >
          <h2 id={titleId}>{title}</h2>
          <button
            type="button"
            className="draggable-dialog-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </header>
        <div className="draggable-dialog-body">{children}</div>
      </div>
    </div>
  );
}
