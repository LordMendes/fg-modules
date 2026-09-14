"use client";

import { useEffect, useRef } from "react";
import type { MapOccluderView, MapPoint } from "@/lib/map/types";
import type { LosWorkerRequest, LosWorkerResponse } from "@/lib/map/los.worker";

type Pending = {
  resolve: (polygon: MapPoint[]) => void;
  reject: (err: Error) => void;
};

/**
 * Lazy LOS worker: recomputes visibility polygons off the main thread.
 * Falls back to sync import if workers are unavailable.
 */
export function useLosWorker() {
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef<Map<number, Pending>>(new Map());
  const idRef = useRef(1);

  useEffect(() => {
    let worker: Worker | null = null;
    try {
      worker = new Worker(new URL("./los.worker.ts", import.meta.url));
      worker.onmessage = (ev: MessageEvent<LosWorkerResponse>) => {
        const pending = pendingRef.current.get(ev.data.id);
        if (!pending) return;
        pendingRef.current.delete(ev.data.id);
        pending.resolve(ev.data.polygon);
      };
      worker.onerror = () => {
        for (const [, p] of pendingRef.current) {
          p.reject(new Error("LOS worker failed"));
        }
        pendingRef.current.clear();
      };
      workerRef.current = worker;
    } catch {
      workerRef.current = null;
    }
    return () => {
      worker?.terminate();
      workerRef.current = null;
      pendingRef.current.clear();
    };
  }, []);

  return {
    compute(
      origin: MapPoint,
      occluders: MapOccluderView[],
      rangeSquares: number,
      sampleCount = 180,
    ): Promise<MapPoint[]> {
      const worker = workerRef.current;
      if (!worker) {
        return import("@/lib/map/los").then(({ segmentsFromOccluders, visibilityPolygon }) => {
          const segments = segmentsFromOccluders(occluders);
          return visibilityPolygon(origin, segments, rangeSquares, sampleCount);
        });
      }
      const id = idRef.current++;
      const req: LosWorkerRequest = {
        id,
        origin,
        rangeSquares,
        sampleCount,
        occluders,
      };
      return new Promise((resolve, reject) => {
        pendingRef.current.set(id, { resolve, reject });
        worker.postMessage(req);
      });
    },
  };
}
