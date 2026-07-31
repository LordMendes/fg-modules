"use client";

import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_IMAGE_TRANSFORM,
  imageDrawRect,
  loadHtmlImage,
  readFileAsDataUrl,
  renderTransformedImage,
  type ImageTransform,
} from "@/lib/npc-creator/imageTransform";

type SlotKind = "portrait" | "token";

const SLOT = {
  portrait: {
    viewW: 160,
    viewH: 213,
    outW: 384,
    outH: 512,
    label: "Portrait",
    round: false,
  },
  token: {
    viewW: 96,
    viewH: 96,
    outW: 256,
    outH: 256,
    label: "Token",
    round: true,
  },
} as const;

export function NpcMediaSlot({
  kind,
  value,
  sourceUrl,
  onSourceChange,
  onChange,
}: {
  kind: SlotKind;
  /** Cropped result shown / stored on NPC state */
  value: string;
  /** Full original image for pan/zoom (falls back to value once) */
  sourceUrl: string;
  onSourceChange: (sourceUrl: string) => void;
  onChange: (croppedDataUrl: string) => void;
}) {
  const cfg = SLOT[kind];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const transformRef = useRef<ImageTransform>({ ...DEFAULT_IMAGE_TRANSFORM });
  const sourceRef = useRef(sourceUrl);
  const [zoom, setZoom] = useState(1);
  const [hasImage, setHasImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const commitTimer = useRef<number | null>(null);
  const dragRef = useRef({
    active: false,
    pointerId: null as number | null,
    startX: 0,
    startY: 0,
    originPanX: 0,
    originPanY: 0,
    moved: false,
  });

  sourceRef.current = sourceUrl;

  // Draft may only have the cropped value — promote it to a stable edit source
  // so later onChange updates do not reload/reset the transform.
  useEffect(() => {
    if (!sourceUrl && value) {
      onSourceChange(value);
    }
  }, [sourceUrl, value, onSourceChange]);

  const paint = () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, cfg.viewW, cfg.viewH);
    ctx.fillStyle = "#1a1a1a";
    if (cfg.round) {
      ctx.beginPath();
      ctx.arc(cfg.viewW / 2, cfg.viewH / 2, cfg.viewW / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.clip();
    } else {
      ctx.fillRect(0, 0, cfg.viewW, cfg.viewH);
    }

    if (img && img.naturalWidth) {
      const { x, y, w, h } = imageDrawRect(
        img.naturalWidth,
        img.naturalHeight,
        cfg.viewW,
        cfg.viewH,
        transformRef.current,
      );
      ctx.drawImage(img, x, y, w, h);
    }

    if (cfg.round) ctx.restore();

    ctx.strokeStyle = "rgba(212, 175, 55, 0.9)";
    ctx.lineWidth = 2;
    if (cfg.round) {
      ctx.beginPath();
      ctx.arc(cfg.viewW / 2, cfg.viewH / 2, cfg.viewW / 2 - 1, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.strokeRect(1, 1, cfg.viewW - 2, cfg.viewH - 2);
    }
  };

  const scheduleCommit = () => {
    if (commitTimer.current) window.clearTimeout(commitTimer.current);
    commitTimer.current = window.setTimeout(() => {
      void (async () => {
        const src = sourceRef.current;
        if (!src || !imgRef.current) return;
        try {
          const scaleX = cfg.outW / cfg.viewW;
          const scaleY = cfg.outH / cfg.viewH;
          const t = transformRef.current;
          const dataUrl = await renderTransformedImage(
            src,
            {
              zoom: t.zoom,
              panX: t.panX * scaleX,
              panY: t.panY * scaleY,
            },
            cfg.outW,
            cfg.outH,
          );
          onChange(dataUrl);
        } catch {
          setError("Could not update image.");
        }
      })();
    }, 200);
  };

  const applyTransform = (
    next: ImageTransform | ((t: ImageTransform) => ImageTransform),
  ) => {
    const valueNext =
      typeof next === "function" ? next(transformRef.current) : next;
    transformRef.current = valueNext;
    setZoom(valueNext.zoom);
    paint();
    scheduleCommit();
  };

  // Reload ONLY when the edit source changes — never when cropped `value` changes.
  useEffect(() => {
    let cancelled = false;
    imgRef.current = null;
    setHasImage(false);
    setError(null);
    transformRef.current = { ...DEFAULT_IMAGE_TRANSFORM };
    setZoom(1);
    paint();

    if (!sourceUrl) return;

    void loadHtmlImage(sourceUrl)
      .then(async (img) => {
        if (cancelled) return;
        try {
          if (img.decode) await img.decode();
        } catch {
          // ignore
        }
        if (cancelled) return;
        if (!img.naturalWidth) {
          setError("Invalid image");
          return;
        }
        imgRef.current = img;
        setHasImage(true);
        requestAnimationFrame(() => {
          if (!cancelled) {
            paint();
            scheduleCommit();
          }
        });
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load");
      });

    return () => {
      cancelled = true;
      if (commitTimer.current) window.clearTimeout(commitTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceUrl, kind]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el || !hasImage) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      applyTransform((t) => ({
        ...t,
        zoom: Math.min(4, Math.max(0.5, Number((t.zoom + delta).toFixed(3)))),
      }));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasImage]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!hasImage) {
      fileRef.current?.click();
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    stageRef.current?.setPointerCapture(e.pointerId);
    dragRef.current = {
      active: true,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originPanX: transformRef.current.panX,
      originPanY: transformRef.current.panY,
      moved: false,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.active || dragRef.current.pointerId !== e.pointerId) {
      return;
    }
    e.preventDefault();
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
      dragRef.current.moved = true;
    }
    applyTransform({
      zoom: transformRef.current.zoom,
      panX: dragRef.current.originPanX + dx,
      panY: dragRef.current.originPanY + dy,
    });
  };

  const endDrag = (e: React.PointerEvent) => {
    if (dragRef.current.pointerId !== e.pointerId) return;
    dragRef.current.active = false;
    dragRef.current.pointerId = null;
    try {
      stageRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const onFile = async (file: File | null) => {
    if (!file) return;
    try {
      const url = await readFileAsDataUrl(file);
      transformRef.current = { ...DEFAULT_IMAGE_TRANSFORM };
      setZoom(1);
      onSourceChange(url);
    } catch {
      setError("Could not read file");
    }
  };

  return (
    <div className={`npc-media-slot npc-media-slot-${kind}`}>
      <div
        ref={stageRef}
        className={[
          "npc-media-slot-stage",
          cfg.round ? "npc-media-slot-stage-round" : "",
          hasImage ? "npc-media-slot-stage-filled" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        role="button"
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileRef.current?.click();
          }
        }}
        title={
          hasImage
            ? "Drag to pan · scroll to zoom · Replace below to change file"
            : `Click to choose ${cfg.label.toLowerCase()}`
        }
      >
        <canvas
          ref={canvasRef}
          width={cfg.viewW}
          height={cfg.viewH}
          className={
            cfg.round
              ? "npc-media-slot-canvas npc-media-slot-canvas-round"
              : "npc-media-slot-canvas"
          }
        />
        {!hasImage ? (
          <span className="npc-media-slot-placeholder">
            Click to add {cfg.label.toLowerCase()}
          </span>
        ) : null}
      </div>
      <div className="npc-media-slot-controls">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            void onFile(e.target.files?.[0] ?? null);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          className="tool-btn-secondary"
          onClick={() => fileRef.current?.click()}
        >
          {hasImage ? "Replace" : "Choose"}
        </button>
        {hasImage ? (
          <>
            <label className="sr-only" htmlFor={`zoom-${kind}`}>
              Zoom
            </label>
            <input
              id={`zoom-${kind}`}
              type="range"
              min={0.5}
              max={4}
              step={0.01}
              value={zoom}
              className="npc-media-slot-zoom"
              onChange={(e) =>
                applyTransform({
                  ...transformRef.current,
                  zoom: Number(e.target.value),
                })
              }
            />
          </>
        ) : null}
      </div>
      {error ? <span className="npc-media-slot-error">{error}</span> : null}
    </div>
  );
}
