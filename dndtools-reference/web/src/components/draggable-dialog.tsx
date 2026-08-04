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
};

export function DraggableDialog({
  open,
  title,
  onClose,
  children,
  className,
  panelClassName,
  ariaLabelledBy,
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

  useEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }

    previouslyFocused.current = document.activeElement as HTMLElement | null;

    const panel = panelRef.current;
    if (!panel) return;

    const rect = panel.getBoundingClientRect();
    setPos({
      x: Math.max(16, (window.innerWidth - rect.width) / 2),
      y: Math.max(16, (window.innerHeight - rect.height) / 2),
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key !== "Tab" || !panel) return;

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
      previouslyFocused.current?.focus();
    };
  }, [open, onClose]);

  function handleHeaderPointerDown(event: React.PointerEvent<HTMLElement>) {
    if ((event.target as HTMLElement).closest("button:not(.draggable-dialog-handle)")) {
      return;
    }
    if (!pos) return;

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

  return (
    <div className={["draggable-dialog-root", className].filter(Boolean).join(" ")} role="presentation">
      <button
        type="button"
        className="draggable-dialog-backdrop"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className={["draggable-dialog-panel", panelClassName].filter(Boolean).join(" ")}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
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
