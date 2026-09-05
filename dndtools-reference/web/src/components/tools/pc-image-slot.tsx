"use client";

import { useEffect, useRef, useState } from "react";
import { removePcImage, uploadPcImage } from "@/actions/pc-images";
import {
  DEFAULT_IMAGE_TRANSFORM,
  imageDrawRect,
  loadHtmlImage,
  readFileAsDataUrl,
  renderTransformedImageBlob,
  type ImageTransform,
} from "@/lib/npc-creator/imageTransform";
import { pcImagePublicUrl } from "@/lib/storage/pc-image-url";
import type { PcImageKind } from "@/lib/storage/pc-image-kind";

const ACCEPTED = "image/jpeg,image/png,image/webp";
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const SLOT = {
  profile: {
    viewW: 120,
    viewH: 120,
    outW: 512,
    outH: 512,
    label: "Profile",
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

export function PcImageSlot({
  planId,
  kind,
  imageKey,
  onKeyChange,
  readOnly = false,
}: {
  planId: string;
  kind: PcImageKind;
  imageKey: string | null | undefined;
  onKeyChange: (key: string | null) => void;
  readOnly?: boolean;
}) {
  const cfg = SLOT[kind];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const transformRef = useRef<ImageTransform>({ ...DEFAULT_IMAGE_TRANSFORM });
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayUrl, setDisplayUrl] = useState<string | null>(null);
  const dragRef = useRef({
    active: false,
    pointerId: null as number | null,
    startX: 0,
    startY: 0,
    originPanX: 0,
    originPanY: 0,
  });

  useEffect(() => {
    if (!imageKey) {
      setDisplayUrl(null);
      return;
    }
    const url = pcImagePublicUrl(imageKey, Date.now());
    if (url) setDisplayUrl(url);
  }, [imageKey]);

  const paint = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = imgRef.current;

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

  const applyTransform = (
    next: ImageTransform | ((t: ImageTransform) => ImageTransform),
  ) => {
    const valueNext =
      typeof next === "function" ? next(transformRef.current) : next;
    transformRef.current = valueNext;
    setZoom(valueNext.zoom);
    paint();
  };

  useEffect(() => {
    if (!editing || !sourceUrl) return;
    let cancelled = false;
    imgRef.current = null;
    transformRef.current = { ...DEFAULT_IMAGE_TRANSFORM };
    setZoom(1);

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
        requestAnimationFrame(() => {
          if (!cancelled) paint();
        });
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load image");
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, sourceUrl, kind]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el || !editing) return;
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
  }, [editing]);

  const onFile = async (file: File | null) => {
    if (!file) return;
    setError(null);
    if (!ACCEPTED_TYPES.has(file.type)) {
      setError("Use JPEG, PNG, or WebP");
      return;
    }
    try {
      const url = await readFileAsDataUrl(file);
      setSourceUrl(url);
      setEditing(true);
    } catch {
      setError("Could not read file");
    }
  };

  const cancelEdit = () => {
    setEditing(false);
    setSourceUrl(null);
    setError(null);
    imgRef.current = null;
  };

  const uploadCrop = async () => {
    if (!sourceUrl || !imgRef.current) return;
    setBusy(true);
    setError(null);
    try {
      const scaleX = cfg.outW / cfg.viewW;
      const scaleY = cfg.outH / cfg.viewH;
      const t = transformRef.current;
      const blob = await renderTransformedImageBlob(
        sourceUrl,
        {
          zoom: t.zoom,
          panX: t.panX * scaleX,
          panY: t.panY * scaleY,
        },
        cfg.outW,
        cfg.outH,
      );
      const formData = new FormData();
      formData.append("file", blob, `${kind}.jpg`);
      const result = await uploadPcImage(planId, kind, formData);
      if (!result.success || !result.key) {
        setError(result.error || "Upload failed");
        return;
      }
      onKeyChange(result.key);
      setDisplayUrl(result.url ?? pcImagePublicUrl(result.key, Date.now()));
      cancelEdit();
    } catch {
      setError("Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const clearImage = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await removePcImage(planId, kind);
      if (!result.success) {
        setError(result.error || "Could not remove image");
        return;
      }
      onKeyChange(null);
      setDisplayUrl(null);
      cancelEdit();
    } finally {
      setBusy(false);
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!editing) {
      if (!readOnly) fileRef.current?.click();
      return;
    }
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

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.active || dragRef.current.pointerId !== e.pointerId) {
      return;
    }
    e.preventDefault();
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
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

  if (readOnly) {
    return (
      <div className={`pc-image-slot pc-image-slot--${kind}`}>
        <span className="pc-image-slot-label">{cfg.label}</span>
        <div
          className={[
            "pc-image-slot-stage",
            cfg.round ? "pc-image-slot-stage--round" : "",
            displayUrl ? "pc-image-slot-stage--filled" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {displayUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={displayUrl} alt="" className="pc-image-slot-img" />
          ) : (
            <span className="pc-image-slot-placeholder">No {cfg.label.toLowerCase()}</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`pc-image-slot pc-image-slot--${kind}`}>
      <span className="pc-image-slot-label">{cfg.label}</span>
      <div
        ref={stageRef}
        className={[
          "pc-image-slot-stage",
          cfg.round ? "pc-image-slot-stage--round" : "",
          editing || displayUrl ? "pc-image-slot-stage--filled" : "",
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
          editing
            ? "Drag to pan · scroll to zoom"
            : `Click to choose ${cfg.label.toLowerCase()}`
        }
      >
        {editing ? (
          <canvas
            ref={canvasRef}
            width={cfg.viewW}
            height={cfg.viewH}
            className={
              cfg.round
                ? "pc-image-slot-canvas pc-image-slot-canvas--round"
                : "pc-image-slot-canvas"
            }
          />
        ) : displayUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={displayUrl} alt="" className="pc-image-slot-img" />
        ) : (
          <span className="pc-image-slot-placeholder">
            Click to add {cfg.label.toLowerCase()}
          </span>
        )}
      </div>
      <div className="pc-image-slot-controls">
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPTED}
          className="sr-only"
          onChange={(e) => {
            void onFile(e.target.files?.[0] ?? null);
            e.target.value = "";
          }}
        />
        {editing ? (
          <>
            <label className="sr-only" htmlFor={`pc-zoom-${kind}`}>
              Zoom
            </label>
            <input
              id={`pc-zoom-${kind}`}
              type="range"
              min={0.5}
              max={4}
              step={0.01}
              value={zoom}
              className="pc-image-slot-zoom"
              disabled={busy}
              onChange={(e) =>
                applyTransform({
                  ...transformRef.current,
                  zoom: Number(e.target.value),
                })
              }
            />
            <button
              type="button"
              className="tool-btn-primary"
              disabled={busy}
              onClick={() => void uploadCrop()}
            >
              {busy ? "Saving…" : "Apply"}
            </button>
            <button
              type="button"
              className="tool-btn-secondary"
              disabled={busy}
              onClick={cancelEdit}
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="tool-btn-secondary"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
            >
              {displayUrl ? "Replace" : "Choose"}
            </button>
            {displayUrl ? (
              <button
                type="button"
                className="tool-btn-secondary"
                disabled={busy}
                onClick={() => void clearImage()}
              >
                Remove
              </button>
            ) : null}
          </>
        )}
      </div>
      {error ? <span className="pc-image-slot-error">{error}</span> : null}
    </div>
  );
}
