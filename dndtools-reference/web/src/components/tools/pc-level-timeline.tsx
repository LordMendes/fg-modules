"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import {
  getPcPlanRevision,
  getSharedPcPlanRevision,
  listPcPlanRevisions,
  listSharedPcPlanRevisions,
  type PcPlanLevelCard,
} from "@/actions/pc-plans";
import { characterLevelFromPlan } from "@/lib/pc-planner/gestalt";
import { classSummaryForPlan } from "@/lib/pc-planner/levelHistory";
import type { PcPlanState } from "@/lib/pc-planner/types";
import { pcImagePublicUrl } from "@/lib/storage/pc-image-url";

const STORAGE_KEY = "pc-timeline-open";
const WIDE_MIN_PX = 1200;

export type PcLevelTimelineView = {
  state: PcPlanState;
  characterLevel: number;
  classSummary: string;
};

type TimelineSource = { planId: string } | { shareToken: string };

type WheelCard = {
  key: string;
  kind: "saved" | "current";
  characterLevel: number;
  name: string;
  classSummary: string;
  profileImageKey: string | null;
};

function sourceKeyOf(source: TimelineSource): string {
  return "planId" in source ? `plan:${source.planId}` : `share:${source.shareToken}`;
}

export function PcLevelTimeline({
  source,
  liveState,
  refreshKey,
  onView,
}: {
  source: TimelineSource;
  liveState: PcPlanState;
  refreshKey: number;
  onView: (view: PcLevelTimelineView | null) => void;
}) {
  const sourceKey = sourceKeyOf(source);
  const sourceRef = useRef(source);
  sourceRef.current = source;
  const onViewRef = useRef(onView);
  onViewRef.current = onView;

  const [open, setOpen] = useState(false);
  const [openEpoch, setOpenEpoch] = useState(0);
  const [saved, setSaved] = useState<PcPlanLevelCard[]>([]);
  const [centeredKey, setCenteredKey] = useState("current");
  const [publishedKey, setPublishedKey] = useState("current");
  const [spacerPx, setSpacerPx] = useState(0);
  const [layoutReady, setLayoutReady] = useState(false);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const cache = useRef(new Map<string, PcPlanState>());
  const cacheGen = useRef("");
  const publishTarget = useRef<string | null>(null);
  const settleTimer = useRef<number | null>(null);
  const swallowClick = useRef(false);
  const viewGen = useRef(0);
  const publishedKeyRef = useRef(publishedKey);
  publishedKeyRef.current = publishedKey;
  const [trackedSource, setTrackedSource] = useState(sourceKey);
  if (trackedSource !== sourceKey) {
    setTrackedSource(sourceKey);
    setPublishedKey("current");
    setCenteredKey("current");
    cache.current.clear();
    cacheGen.current = "";
  }

  const wheelCards = useMemo(() => {
    const currentLevel = characterLevelFromPlan(liveState);
    const current: WheelCard = {
      key: "current",
      kind: "current",
      characterLevel: currentLevel,
      name: liveState.identity.name.trim() || "Unnamed",
      classSummary: classSummaryForPlan(liveState),
      profileImageKey: liveState.identity.profileImageKey ?? null,
    };
    const savedCards: WheelCard[] = saved.map((card) => ({
      key: `saved:${card.characterLevel}`,
      kind: "saved",
      characterLevel: card.characterLevel,
      name: card.name,
      classSummary: card.classSummary,
      profileImageKey: card.profileImageKey,
    }));
    return [...savedCards, current].sort((a, b) => {
      if (a.characterLevel !== b.characterLevel) return a.characterLevel - b.characterLevel;
      if (a.kind === b.kind) return 0;
      return a.kind === "current" ? 1 : -1;
    });
  }, [liveState, saved]);

  const scrollKeyIntoCenter = useCallback((key: string, behavior: ScrollBehavior) => {
    const root = scrollerRef.current;
    if (!root) return;
    const el = root.querySelector<HTMLElement>(
      `[data-level-key="${CSS.escape(key)}"]`,
    );
    el?.scrollIntoView({ block: "center", behavior });
  }, []);

  const keyAtCenter = useCallback(() => {
    const root = scrollerRef.current;
    if (!root) return null;
    const rootBox = root.getBoundingClientRect();
    const mid = rootBox.top + rootBox.height / 2;
    let best: { key: string; dist: number } | null = null;
    for (const el of root.querySelectorAll<HTMLElement>("[data-level-key]")) {
      const key = el.dataset.levelKey;
      if (!key) continue;
      const box = el.getBoundingClientRect();
      const dist = Math.abs(box.top + box.height / 2 - mid);
      if (!best || dist < best.dist) best = { key, dist };
    }
    return best?.key ?? null;
  }, []);

  const publishKey = useCallback((key: string) => {
    setPublishedKey((prev) => (prev === key ? prev : key));
  }, []);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const next =
      stored === "1" ? true : stored === "0" ? false : window.innerWidth >= WIDE_MIN_PX;
    setOpen(next);
    if (next) setOpenEpoch(1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const current = sourceRef.current;
      const rows =
        "planId" in current
          ? await listPcPlanRevisions(current.planId)
          : await listSharedPcPlanRevisions(current.shareToken);
      if (!cancelled) setSaved(rows);
    })();
    return () => {
      cancelled = true;
    };
  }, [sourceKey, refreshKey]);

  useEffect(() => {
    const gen = `${sourceKey}:${refreshKey}`;
    if (cacheGen.current !== gen) {
      cacheGen.current = gen;
      cache.current.clear();
    }
    const request = ++viewGen.current;
    if (publishedKey === "current") {
      onViewRef.current(null);
      return;
    }
    const level = Number(publishedKey.slice("saved:".length));
    if (!Number.isFinite(level)) return;
    const cacheId = `${sourceKey}:${level}`;
    const hit = cache.current.get(cacheId);
    if (hit) {
      onViewRef.current({
        state: hit,
        characterLevel: level,
        classSummary: classSummaryForPlan(hit),
      });
      return;
    }
    void (async () => {
      const current = sourceRef.current;
      const loaded =
        "planId" in current
          ? await getPcPlanRevision(current.planId, level)
          : await getSharedPcPlanRevision(current.shareToken, level);
      if (viewGen.current !== request || !loaded) return;
      cache.current.set(cacheId, loaded);
      onViewRef.current({
        state: loaded,
        characterLevel: level,
        classSummary: classSummaryForPlan(loaded),
      });
    })();
  }, [publishedKey, sourceKey, refreshKey]);

  useEffect(() => {
    if (!open) {
      setLayoutReady(false);
      return;
    }
    const root = scrollerRef.current;
    if (!root) return;
    const measure = () => {
      if (root.clientHeight <= 0) return;
      const card = root.querySelector<HTMLElement>(".pc-level-timeline-card");
      const cardH = card?.getBoundingClientRect().height ?? 88;
      const next = Math.max(0, root.clientHeight / 2 - cardH / 2);
      setSpacerPx((prev) => (Math.abs(prev - next) < 1 ? prev : next));
      setLayoutReady(true);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, [open, wheelCards.length]);

  useEffect(() => {
    if (!open || !layoutReady || openEpoch === 0) return;
    const frame = requestAnimationFrame(() => {
      const key = publishedKeyRef.current;
      publishTarget.current = key;
      scrollKeyIntoCenter(key, "auto");
      publishTarget.current = null;
      setCenteredKey(key);
    });
    return () => cancelAnimationFrame(frame);
  }, [open, openEpoch, layoutReady, spacerPx, scrollKeyIntoCenter]);

  function toggle() {
    setOpen((prev) => {
      const next = !prev;
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      if (next) setOpenEpoch((epoch) => epoch + 1);
      return next;
    });
  }

  function focusCard(key: string) {
    if (settleTimer.current) window.clearTimeout(settleTimer.current);
    publishTarget.current = key;
    setCenteredKey(key);
    publishKey(key);
    scrollKeyIntoCenter(key, "auto");
    requestAnimationFrame(() => {
      if (publishTarget.current !== key) return;
      if (keyAtCenter() === key) publishTarget.current = null;
    });
  }

  function handleCardPointerDown(event: PointerEvent<HTMLButtonElement>, key: string) {
    const press = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      dragged: false,
      key,
    };
    const onMove = (ev: globalThis.PointerEvent) => {
      if (ev.pointerId !== press.id || press.dragged) return;
      const dx = ev.clientX - press.x;
      const dy = ev.clientY - press.y;
      if (dx * dx + dy * dy > 36) press.dragged = true;
    };
    const onUp = (ev: globalThis.PointerEvent) => {
      if (ev.pointerId !== press.id) return;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      if (ev.type === "pointercancel" || press.dragged) return;
      const dx = ev.clientX - press.x;
      const dy = ev.clientY - press.y;
      if (dx * dx + dy * dy > 36) return;
      swallowClick.current = true;
      window.setTimeout(() => {
        swallowClick.current = false;
      }, 0);
      focusCard(press.key);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  function handleCardClick(key: string) {
    if (swallowClick.current) {
      swallowClick.current = false;
      return;
    }
    focusCard(key);
  }

  function handleScroll() {
    if (publishTarget.current) return;
    const key = keyAtCenter();
    if (key) setCenteredKey((prev) => (prev === key ? prev : key));
    if (settleTimer.current) window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(() => {
      if (publishTarget.current) return;
      const settled = keyAtCenter();
      if (settled) publishKey(settled);
    }, 140);
  }

  function handleScrollEnd() {
    if (settleTimer.current) window.clearTimeout(settleTimer.current);
    const target = publishTarget.current;
    if (target) {
      publishTarget.current = null;
      setCenteredKey(target);
      publishKey(target);
      return;
    }
    const settled = keyAtCenter();
    if (settled) {
      setCenteredKey(settled);
      publishKey(settled);
    }
  }

  return (
    <aside className={open ? "pc-level-timeline is-open" : "pc-level-timeline"}>
      <button
        type="button"
        className="pc-level-timeline-toggle"
        aria-expanded={open}
        onClick={toggle}
      >
        {open ? "Hide" : "Levels"}
      </button>
      {open ? (
        <div className="pc-level-timeline-panel">
          <div className="pc-level-timeline-frame" aria-hidden="true" />
          <div
            ref={scrollerRef}
            className="pc-level-timeline-scroller"
            onScroll={handleScroll}
            onScrollEnd={handleScrollEnd}
            onPointerDown={(event) => {
              if ((event.target as HTMLElement).closest("[data-level-key]")) return;
              publishTarget.current = null;
            }}
          >
            <div className="pc-level-timeline-spacer" style={{ height: spacerPx }} />
            {wheelCards.map((card) => {
              const photo = pcImagePublicUrl(card.profileImageKey);
              const centered = card.key === centeredKey;
              const label = `${card.name}, ${card.classSummary}`;
              return (
                <button
                  key={card.key}
                  type="button"
                  data-level-key={card.key}
                  className={
                    centered
                      ? "pc-level-timeline-card is-centered"
                      : "pc-level-timeline-card"
                  }
                  aria-current={centered ? "true" : undefined}
                  aria-label={card.kind === "current" ? `${label}, current` : label}
                  title={label}
                  onPointerDown={(event) => handleCardPointerDown(event, card.key)}
                  onClick={() => handleCardClick(card.key)}
                >
                  {photo ? (
                    <img src={photo} alt="" className="pc-level-timeline-photo" />
                  ) : (
                    <span className="pc-level-timeline-photo pc-level-timeline-photo--empty" aria-hidden>
                      {(card.name.trim()[0] || "?").toUpperCase()}
                    </span>
                  )}
                  <span className="pc-level-timeline-copy">
                    <span className="pc-level-timeline-name">{card.name}</span>
                    <span className="pc-level-timeline-class">{card.classSummary}</span>
                    {card.kind === "current" ? (
                      <span className="pc-level-timeline-now">Now</span>
                    ) : null}
                  </span>
                </button>
              );
            })}
            <div className="pc-level-timeline-spacer" style={{ height: spacerPx }} />
          </div>
        </div>
      ) : null}
    </aside>
  );
}
