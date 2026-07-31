"use client";

import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_IMAGE_TRANSFORM,
  imageDrawRect,
  loadHtmlImage,
  renderTransformedImage,
  type ImageTransform,
} from "@/lib/npc-creator/imageTransform";

export type ImageEditorKind = "portrait" | "token";

const VIEW = {
  portrait: { w: 240, h: 320, outW: 384, outH: 512, label: "Portrait" },
  token: { w: 240, h: 240, outW: 256, outH: 256, label: "Token" },
} as const;

export function NpcImageEditor({
  kind,
  sourceUrl,
  onApply,
  onCancel,
}: {
  kind: ImageEditorKind;
  sourceUrl: string;
  onApply: (dataUrl: string) => void;
  onCancel: () => void;
}) {
  const cfg = VIEW[kind];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const transformRef = useRef<ImageTransform>({ ...DEFAULT_IMAGE_TRANSFORM });
  const [zoomLabel, setZoomLabel] = useState(DEFAULT_IMAGE_TRANSFORM.zoom);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const dragRef = useRef<{
    active: boolean;
    pointerId: number | null;
    startX: number;
    startY: number;
    originPanX: number;
    originPanY: number;
  }>({
    active: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    originPanX: 0,
    originPanY: 0,
  });

  const paint = () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !img.naturalWidth) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#121212";
    ctx.fillRect(0, 0, cfg.w, cfg.h);

    const { x, y, w, h } = imageDrawRect(
      img.naturalWidth,
      img.naturalHeight,
      cfg.w,
      cfg.h,
      transformRef.current,
    );
    ctx.drawImage(img, x, y, w, h);

    ctx.strokeStyle = "rgba(212, 175, 55, 0.85)";
    ctx.lineWidth = 2;
    if (kind === "token") {
      ctx.beginPath();
      ctx.arc(cfg.w / 2, cfg.h / 2, cfg.w / 2 - 2, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.strokeRect(1, 1, cfg.w - 2, cfg.h - 2);
    }
  };

  const setTransform = (next: ImageTransform | ((t: ImageTransform) => ImageTransform)) => {
    const value =
      typeof next === "function" ? next(transformRef.current) : next;
    transformRef.current = value;
    setZoomLabel(value.zoom);
    paint();
  };

  useEffect(() => {
    let cancelled = false;
    imgRef.current = null;
    setReady(false);
    setError(null);
    transformRef.current = { ...DEFAULT_IMAGE_TRANSFORM };
    setZoomLabel(DEFAULT_IMAGE_TRANSFORM.zoom);

    void loadHtmlImage(sourceUrl)
      .then(async (img) => {
        if (cancelled) return;
        if (img.decode) {
          try {
            await img.decode();
          } catch {
            // continue with naturalWidth check
          }
        }
        if (cancelled) return;
        if (!img.naturalWidth || !img.naturalHeight) {
          setError("Image failed to decode.");
          setReady(false);
          return;
        }
        imgRef.current = img;
        setReady(true);
        // Paint after layout so the canvas is mounted.
        requestAnimationFrame(() => {
          if (!cancelled) paint();
        });
      })
      .catch(() => {
        if (!cancelled) {
          setError("Could not load image.");
          setReady(false);
        }
      });

    return () => {
      cancelled = true;
    };
    // paint uses cfg/kind from closure; re-run only when source changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceUrl, kind, cfg.w, cfg.h]);

  // Native non-passive wheel so zoom works reliably
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setTransform((t) => ({
        ...t,
        zoom: Math.min(4, Math.max(0.5, Number((t.zoom + delta).toFixed(3)))),
      }));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [ready]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!ready) return;
    e.preventDefault();
    stageRef.current?.setPointerCapture(e.pointerId);
    dragRef.current = {
      active: true,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originPanX: transformRef.current.panX,
      originPanY: transformRef.current.panY,
    };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active || dragRef.current.pointerId !== e.pointerId) {
      return;
    }
    e.preventDefault();
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setTransform({
      ...transformRef.current,
      panX: dragRef.current.originPanX + dx,
      panY: dragRef.current.originPanY + dy,
    });
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current.pointerId !== e.pointerId) return;
    dragRef.current.active = false;
    dragRef.current.pointerId = null;
    try {
      stageRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handleApply = async () => {
    setBusy(true);
    try {
      const dataUrl = await renderTransformedImage(
        sourceUrl,
        transformRef.current,
        cfg.outW,
        cfg.outH,
      );
      onApply(dataUrl);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="npc-conflict-overlay" role="dialog" aria-modal="true">
      <div className="npc-image-editor-modal">
        <h3>Adjust {cfg.label}</h3>
        <p className="tool-step-desc">
          Drag the image to pan. Use the slider or mouse wheel to zoom.
        </p>
        {error ? <p className="npc-creator-status">{error}</p> : null}
        <div
          ref={stageRef}
          className={
            kind === "token"
              ? "npc-image-editor-stage npc-image-editor-stage-round"
              : "npc-image-editor-stage"
          }
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <canvas
            ref={canvasRef}
            width={cfg.w}
            height={cfg.h}
            className={
              kind === "token"
                ? "npc-image-editor-canvas npc-image-editor-canvas-round"
                : "npc-image-editor-canvas"
            }
          />
          {!ready && !error ? (
            <div className="npc-image-editor-loading">Loading…</div>
          ) : null}
        </div>
        <div className="tool-field tool-field-wide">
          <label className="tool-label" htmlFor={`npc-zoom-${kind}`}>
            Zoom ({zoomLabel.toFixed(2)}×)
          </label>
          <input
            id={`npc-zoom-${kind}`}
            type="range"
            min={0.5}
            max={4}
            step={0.01}
            value={zoomLabel}
            disabled={!ready}
            className="npc-image-zoom-slider"
            onChange={(e) =>
              setTransform({
                ...transformRef.current,
                zoom: Number(e.target.value),
              })
            }
          />
        </div>
        <div className="tool-button-row">
          <button
            type="button"
            className="tool-btn-secondary"
            disabled={!ready}
            onClick={() => setTransform({ ...DEFAULT_IMAGE_TRANSFORM })}
          >
            Reset view
          </button>
          <button
            type="button"
            className="tool-btn-primary"
            disabled={!ready || busy}
            onClick={() => void handleApply()}
          >
            {busy ? "Saving…" : "Apply"}
          </button>
          <button type="button" className="tool-btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
