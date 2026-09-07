"use client";

import {
  attachPcToCampaign,
  createPcInCampaign,
  deleteCampaign,
  getCampaignActivity,
  getCampaignTable,
  inviteByUsername,
  kickMember,
  leaveCampaign,
  unlinkPcFromCampaign,
} from "@/actions/campaigns";
import { getUserPcPlans, type PcPlanSummary } from "@/actions/pc-plans";
import { useAuthUser } from "@/components/auth-provider";
import { DiceCanvas } from "@/components/dice/dice-canvas";
import { DiceLogTray } from "@/components/dice/dice-log-tray";
import { DiceProvider } from "@/components/dice/dice-provider";
import { DiceTray } from "@/components/dice/dice-tray";
import { CampaignLogsDrawer } from "@/components/tools/campaign-logs-drawer";
import { CampaignMapBoard } from "@/components/map/campaign-map-board";
import type { MapPing } from "@/components/map/campaign-map-board";
import { MapScenesDrawer } from "@/components/map/map-scenes-drawer";
import { CampaignLiveProvider, useCampaignLive } from "@/components/tools/campaign-live-provider";
import { CampaignPcAvatar } from "@/components/tools/campaign-pc-avatar";
import { CampaignSheetInstance } from "@/components/tools/campaign-sheet-instance";
import {
  campaignSheetPopoutChannelName,
  campaignSheetWindowName,
  type CampaignSheetPopoutMessage,
} from "@/lib/campaign/immersive";
import {
  useLiveActivity,
  useLiveMap,
  useLivePcUpdated,
  useLivePresence,
  useLiveStoreVersion,
} from "@/lib/campaign/liveClient";
import type {
  CampaignActivityView,
  CampaignTableState,
} from "@/lib/campaign/types";
import type { CampaignMapView, MapAoePointerView } from "@/lib/map/types";
import { rollViewToResult } from "@/lib/campaign/types";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronsLeft, ChevronsRight, MapPinned, ScrollText, Users } from "lucide-react";

type MenuId = "roster" | "logs" | "maps" | null;

const RAIL_EXPANDED_KEY = "campaign-table-rail-expanded";

const SHEET_Z_BASE = 80;

function CampaignRail({
  campaignName,
  isDm,
  activeMenu,
  onSelectMenu,
}: {
  campaignName: string;
  isDm: boolean;
  activeMenu: MenuId;
  onSelectMenu: (id: MenuId) => void;
}) {
  const [railExpanded, setRailExpanded] = useState(false);

  useEffect(() => {
    try {
      setRailExpanded(sessionStorage.getItem(RAIL_EXPANDED_KEY) === "1");
    } catch {
      // ignore
    }
  }, []);

  function toggleRail() {
    setRailExpanded((prev) => {
      const next = !prev;
      try {
        sessionStorage.setItem(RAIL_EXPANDED_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  }

  return (
    <nav
      className={`campaign-rail${railExpanded ? " campaign-rail--expanded" : ""}`}
      aria-label="Campaign menu"
    >
      {railExpanded ? (
        <div className="campaign-rail-brand">
          <div className="campaign-rail-brand-text">
            <span className="campaign-rail-brand-name">{campaignName}</span>
            <span className="campaign-rail-brand-role">
              {isDm ? "Dungeon Master" : "Player"}
            </span>
          </div>
          <button
            type="button"
            className="campaign-rail-btn campaign-rail-toggle"
            aria-expanded={true}
            aria-label="Collapse menu"
            title="Collapse menu"
            onClick={toggleRail}
          >
            <ChevronsLeft size={18} aria-hidden />
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="campaign-rail-btn campaign-rail-toggle"
          aria-expanded={false}
          aria-label="Expand menu"
          title="Expand menu"
          onClick={toggleRail}
        >
          <ChevronsRight size={20} aria-hidden />
        </button>
      )}
      <button
        type="button"
        className={`campaign-rail-btn${activeMenu === "roster" ? " campaign-rail-btn--active" : ""}`}
        aria-pressed={activeMenu === "roster"}
        aria-label={railExpanded ? undefined : "Invite and characters"}
        title="Invite and characters"
        onClick={() => onSelectMenu(activeMenu === "roster" ? null : "roster")}
      >
        <Users size={20} aria-hidden />
        <span className="campaign-rail-btn-label">Characters</span>
      </button>
      <button
        type="button"
        className={`campaign-rail-btn${activeMenu === "logs" ? " campaign-rail-btn--active" : ""}`}
        aria-pressed={activeMenu === "logs"}
        aria-label={railExpanded ? undefined : "Campaign logs"}
        title="Campaign logs"
        onClick={() => onSelectMenu(activeMenu === "logs" ? null : "logs")}
      >
        <ScrollText size={20} aria-hidden />
        <span className="campaign-rail-btn-label">Logs</span>
      </button>
      {isDm ? (
        <button
          type="button"
          className={`campaign-rail-btn${activeMenu === "maps" ? " campaign-rail-btn--active" : ""}`}
          aria-pressed={activeMenu === "maps"}
          aria-label={railExpanded ? undefined : "Map scenes"}
          title="Map scenes"
          onClick={() => onSelectMenu(activeMenu === "maps" ? null : "maps")}
        >
          <MapPinned size={20} aria-hidden />
          <span className="campaign-rail-btn-label">Maps</span>
        </button>
      ) : null}
    </nav>
  );
}

export function CampaignTable({ campaignId }: { campaignId: string }) {
  const user = useAuthUser();
  const [table, setTable] = useState<CampaignTableState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const refresh = useCallback(() => {
    startTransition(async () => {
      const next = await getCampaignTable(campaignId);
      if (!next) {
        setError("Campaign not found or you are not a member.");
        setTable(null);
        return;
      }
      if (next.myStatus === "pending") {
        setError("Accept your invite from the campaign list first.");
        setTable(next);
        return;
      }
      setTable(next);
      setError(null);
    });
  }, [campaignId]);

  const onLiveMapChange = useCallback((map: CampaignMapView | null) => {
    setTable((prev) => {
      if (!prev) return prev;
      if (prev.liveMap === map) return prev;
      return { ...prev, liveMap: map };
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    refresh();
  }, [user, refresh]);

  if (!user) {
    return (
      <div className="pc-planner-auth-gate">
        <p>Sign in to open this campaign.</p>
        <Link href={`/login?next=/tools/campaign/${campaignId}`} className="tool-btn">
          Sign in
        </Link>
      </div>
    );
  }

  if (!table && !error) {
    return <p className="pc-planner-loading">Loading campaign…</p>;
  }

  if (!table) {
    return (
      <div className="campaign-home">
        <p className="tool-error">{error}</p>
        <Link href="/tools/campaign" className="tool-btn tool-btn--ghost">
          Back to campaigns
        </Link>
      </div>
    );
  }

  const initialHistory = table.rolls
    .map((r) => rollViewToResult(r))
    .filter((r): r is NonNullable<typeof r> => r != null);

  const liveEnabled = table.myStatus === "active";

  return (
    <CampaignLiveProvider
      campaignId={campaignId}
      table={table}
      viewerUserId={user.id}
      enabled={liveEnabled}
    >
      <DiceProvider
        campaign={{
          campaignId,
          actor: {
            userId: user.id,
            username: user.username,
            characterName: null,
          },
          isDm: table.myRole === "dm",
          initialHistory,
        }}
      >
        <CampaignTableBody
          table={table}
          error={error}
          setError={setError}
          pending={pending}
          startTransition={startTransition}
          refresh={refresh}
          onLiveMapChange={onLiveMapChange}
        />
      </DiceProvider>
    </CampaignLiveProvider>
  );
}

function CampaignTableBody({
  table,
  error,
  setError,
  pending,
  startTransition,
  refresh,
  onLiveMapChange,
}: {
  table: CampaignTableState;
  error: string | null;
  setError: (e: string | null) => void;
  pending: boolean;
  startTransition: (fn: () => void) => void;
  refresh: () => void;
  onLiveMapChange: (map: CampaignMapView | null) => void;
}) {
  const user = useAuthUser()!;
  const router = useRouter();
  const isDm = table.myRole === "dm";
  const { store, send: sendLive } = useCampaignLive();
  useLiveStoreVersion(store);
  const onlineUserIds = useLivePresence(store);
  const liveActivityList = useLiveActivity(store);
  const pcUpdatedEvent = useLivePcUpdated(store);
  const liveMapFromStore = useLiveMap(store);
  // Store is source of truth after connect; HTTP snapshot is the fallback.
  const liveMap = liveMapFromStore ?? table.liveMap;
  const rosterPcs =
    store.getState().pcs.length > 0 ? store.getState().pcs : table.pcs;
  const mapPings: MapPing[] = store.getState().mapPings;
  const aoePointers: MapAoePointerView[] = store.getState().aoePointers;
  const viewportGoToRaw = store.getState().viewportGoTo;
  const viewportGoTo = viewportGoToRaw
    ? { x: viewportGoToRaw.x, y: viewportGoToRaw.y }
    : null;

  const initialPcId =
    table.pcs.find((p) => p.userId === user.id)?.pcPlanId ?? table.pcs[0]?.pcPlanId ?? null;

  const [openPcPlanIds, setOpenPcPlanIds] = useState<string[]>(() =>
    initialPcId ? [initialPcId] : [],
  );
  const [focusedPcPlanId, setFocusedPcPlanId] = useState<string | null>(initialPcId);
  const [focusOrder, setFocusOrder] = useState<Record<string, number>>(() =>
    initialPcId ? { [initialPcId]: 1 } : {},
  );
  const focusSeqRef = useRef(1);
  const [poppedOutPcPlanIds, setPoppedOutPcPlanIds] = useState<string[]>([]);
  const [restoreTicks, setRestoreTicks] = useState<Record<string, number>>({});
  const [myPlans, setMyPlans] = useState<PcPlanSummary[]>([]);
  const [inviteUsername, setInviteUsername] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeMenu, setActiveMenu] = useState<MenuId>(null);
  const [createOwnerUserId, setCreateOwnerUserId] = useState(user.id);
  const [activities, setActivities] = useState<CampaignActivityView[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const popoutWindowsRef = useRef<Map<string, Window>>(new Map());
  const lastActivityId = useRef<string | null>(null);

  const handleMapChange = useCallback(
    (map: CampaignMapView | null) => {
      // Keep parent HTTP snapshot in sync for refresh/drawer, but do not
      // feed store-derived objects back every render (that loops).
      onLiveMapChange(map);
    },
    [onLiveMapChange],
  );

  const visiblePcs = useMemo(() => {
    if (isDm) return rosterPcs;
    return rosterPcs.filter((p) => p.userId === user.id);
  }, [isDm, rosterPcs, user.id]);

  const onlinePcs = useMemo(() => {
    const online = new Set(onlineUserIds);
    return rosterPcs.filter((p) => online.has(p.userId));
  }, [rosterPcs, onlineUserIds]);

  const raisePc = useCallback((pcPlanId: string) => {
    focusSeqRef.current += 1;
    setFocusOrder((prev) => ({ ...prev, [pcPlanId]: focusSeqRef.current }));
    setFocusedPcPlanId(pcPlanId);
  }, []);

  const openPc = useCallback(
    (pcPlanId: string, opts?: { restore?: boolean }) => {
      setOpenPcPlanIds((prev) =>
        prev.includes(pcPlanId) ? prev : [...prev, pcPlanId],
      );
      raisePc(pcPlanId);
      if (opts?.restore) {
        setRestoreTicks((prev) => ({
          ...prev,
          [pcPlanId]: (prev[pcPlanId] ?? 0) + 1,
        }));
      }
    },
    [raisePc],
  );

  const closePc = useCallback((pcPlanId: string) => {
    setOpenPcPlanIds((prev) => {
      const next = prev.filter((id) => id !== pcPlanId);
      setFocusedPcPlanId((focused) => {
        if (focused !== pcPlanId) return focused;
        return next[next.length - 1] ?? null;
      });
      return next;
    });
    setPoppedOutPcPlanIds((prev) => prev.filter((id) => id !== pcPlanId));
    popoutWindowsRef.current.delete(pcPlanId);
  }, []);

  useEffect(() => {
    setOpenPcPlanIds((prev) => {
      const next = prev.filter((id) => visiblePcs.some((p) => p.pcPlanId === id));
      if (next.length === prev.length) return prev;
      return next;
    });
  }, [visiblePcs]);

  useEffect(() => {
    if (liveActivityList.length === 0) return;
    const latest = liveActivityList[0]!;
    if (lastActivityId.current === latest.id) return;
    lastActivityId.current = latest.id;
    setActivities((prev) => {
      if (prev.some((a) => a.id === latest.id)) return prev;
      return [latest, ...prev].slice(0, 200);
    });
  }, [liveActivityList]);

  useEffect(() => {
    if (activeMenu !== "logs") return;
    let cancelled = false;
    setActivitiesLoading(true);
    void getCampaignActivity(table.id).then((rows) => {
      if (cancelled) return;
      setActivities(rows);
      setActivitiesLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [activeMenu, table.id]);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(campaignSheetPopoutChannelName(table.id));
    channel.onmessage = (event: MessageEvent<CampaignSheetPopoutMessage>) => {
      const msg = event.data;
      if (!msg || typeof msg !== "object") return;
      if (msg.type === "opened") {
        setPoppedOutPcPlanIds((prev) =>
          prev.includes(msg.pcPlanId) ? prev : [...prev, msg.pcPlanId],
        );
        setOpenPcPlanIds((prev) =>
          prev.includes(msg.pcPlanId) ? prev : [...prev, msg.pcPlanId],
        );
      } else if (msg.type === "closed") {
        setPoppedOutPcPlanIds((prev) => prev.filter((id) => id !== msg.pcPlanId));
        popoutWindowsRef.current.delete(msg.pcPlanId);
        setOpenPcPlanIds((prev) => {
          if (!prev.includes(msg.pcPlanId)) return prev;
          setRestoreTicks((ticks) => ({
            ...ticks,
            [msg.pcPlanId]: (ticks[msg.pcPlanId] ?? 0) + 1,
          }));
          return prev;
        });
      }
    };
    return () => channel.close();
  }, [table.id]);

  const focusPopOut = useCallback((pcPlanId: string) => {
    const existing = popoutWindowsRef.current.get(pcPlanId);
    if (existing && !existing.closed) {
      existing.focus();
      return;
    }
    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel(campaignSheetPopoutChannelName(table.id));
      const msg: CampaignSheetPopoutMessage = { type: "focus", pcPlanId };
      channel.postMessage(msg);
      channel.close();
    }
    try {
      const named = window.open("", campaignSheetWindowName(pcPlanId));
      if (named && !named.closed) {
        popoutWindowsRef.current.set(pcPlanId, named);
        named.focus();
      }
    } catch {
      // ignore
    }
  }, [table.id]);

  const openPopOut = useCallback((pcPlanId: string) => {
    const url = `/tools/campaign/${table.id}/sheet/${pcPlanId}`;
    const features =
      "popup=yes,width=900,height=900,menubar=no,toolbar=no,location=no,status=no";
    const win = window.open(url, campaignSheetWindowName(pcPlanId), features);
    if (!win) {
      setError(
        "Pop-up blocked. Allow pop-ups for this site to open the sheet in a new window.",
      );
      return;
    }
    popoutWindowsRef.current.set(pcPlanId, win);
    win.focus();
    setPoppedOutPcPlanIds((prev) =>
      prev.includes(pcPlanId) ? prev : [...prev, pcPlanId],
    );
    openPc(pcPlanId);
  }, [table.id, setError, openPc]);

  function selectPc(pcPlanId: string, ownerUserId: string) {
    if (!isDm && ownerUserId !== user.id) return;
    setActiveMenu(null);
    if (poppedOutPcPlanIds.includes(pcPlanId)) {
      openPc(pcPlanId);
      focusPopOut(pcPlanId);
      return;
    }
    openPc(pcPlanId, { restore: true });
  }

  const joinUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/tools/campaign?join=${table.joinCode}`
      : `/tools/campaign?join=${table.joinCode}`;

  return (
    <>
      <div className="campaign-stage">
        {error ? <p className="tool-error campaign-stage-error">{error}</p> : null}

        <CampaignRail
          campaignName={table.name}
          isDm={isDm}
          activeMenu={activeMenu}
          onSelectMenu={setActiveMenu}
        />

        {activeMenu === "logs" ? (
          <CampaignLogsDrawer
            activities={activities}
            loading={activitiesLoading}
            onClose={() => setActiveMenu(null)}
          />
        ) : null}

        {activeMenu === "maps" && isDm ? (
          <MapScenesDrawer
            maps={table.maps}
            liveMapId={liveMap?.id ?? null}
            campaignId={table.id}
            currentMap={liveMap}
            onClose={() => setActiveMenu(null)}
            onChanged={refresh}
          />
        ) : null}

        {activeMenu === "roster" ? (
          <>
            <button
              type="button"
              className="campaign-drawer-backdrop"
              aria-label="Close menu"
              onClick={() => setActiveMenu(null)}
            />
            <aside className="campaign-drawer" aria-label="Invite and characters">
              <header className="campaign-drawer-header">
                <div>
                  <h2 className="campaign-drawer-title">{table.name}</h2>
                  <p className="campaign-drawer-sub">
                    You are {isDm ? "the DM" : "a player"} · Hold Ctrl (Cmd on Mac) while rolling
                    to hide the result from other players
                  </p>
                </div>
                <div className="campaign-drawer-actions">
                  <Link href="/tools/campaign" className="tool-btn tool-btn--ghost">
                    All campaigns
                  </Link>
                  {isDm ? (
                    <button
                      type="button"
                      className="tool-btn tool-btn--danger"
                      disabled={pending}
                      onClick={() => {
                        if (!confirm("Delete this campaign for everyone?")) return;
                        startTransition(async () => {
                          const r = await deleteCampaign(table.id);
                          if (r.success) router.push("/tools/campaign");
                          else setError(r.error ?? "Could not delete");
                        });
                      }}
                    >
                      Delete
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="tool-btn tool-btn--ghost"
                      disabled={pending}
                      onClick={() => {
                        if (!confirm("Leave this campaign?")) return;
                        startTransition(async () => {
                          const r = await leaveCampaign(table.id);
                          if (r.success) router.push("/tools/campaign");
                          else setError(r.error ?? "Could not leave");
                        });
                      }}
                    >
                      Leave
                    </button>
                  )}
                </div>
              </header>

              <div className="campaign-roster">
                {isDm ? (
                  <section className="campaign-roster-section">
                    <h3>Invite</h3>
                    <p className="campaign-roster-hint">
                      Code: <strong>{table.joinCode}</strong>
                    </p>
                    <button
                      type="button"
                      className="tool-btn tool-btn--ghost"
                      onClick={() => {
                        void navigator.clipboard.writeText(joinUrl).then(() => {
                          setCopied(true);
                          window.setTimeout(() => setCopied(false), 1500);
                        });
                      }}
                    >
                      {copied ? "Copied!" : "Copy join link"}
                    </button>
                    <div className="campaign-home-row">
                      <input
                        type="text"
                        className="pc-sheet-input"
                        placeholder="Username"
                        value={inviteUsername}
                        onChange={(e) => setInviteUsername(e.target.value)}
                        disabled={pending}
                      />
                      <button
                        type="button"
                        className="tool-btn"
                        disabled={pending || !inviteUsername.trim()}
                        onClick={() =>
                          startTransition(async () => {
                            const r = await inviteByUsername(table.id, inviteUsername);
                            if (!r.success) setError(r.error ?? "Invite failed");
                            else {
                              setInviteUsername("");
                              refresh();
                            }
                          })
                        }
                      >
                        Invite
                      </button>
                    </div>
                  </section>
                ) : null}

                <section className="campaign-roster-section">
                  <h3>Members</h3>
                  <ul className="campaign-roster-list">
                    {table.members.map((m) => (
                      <li key={m.id}>
                        <span>
                          {m.username}
                          {m.role === "dm" ? " (DM)" : ""}
                          {m.status === "pending" ? " · pending" : ""}
                          {onlineUserIds.includes(m.userId) ? " · online" : ""}
                        </span>
                        {isDm && m.role !== "dm" && m.status === "active" ? (
                          <button
                            type="button"
                            className="tool-btn tool-btn--ghost"
                            disabled={pending}
                            onClick={() =>
                              startTransition(async () => {
                                const r = await kickMember(table.id, m.userId);
                                if (!r.success) setError(r.error ?? "Kick failed");
                                else refresh();
                              })
                            }
                          >
                            Kick
                          </button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="campaign-roster-section">
                  <h3>Characters</h3>
                  <ul className="campaign-roster-list">
                    {visiblePcs.map((pc) => (
                      <li key={pc.id}>
                        <button
                          type="button"
                          className={`campaign-pc-select${
                            openPcPlanIds.includes(pc.pcPlanId)
                              ? " campaign-pc-select--active"
                              : ""
                          }${
                            focusedPcPlanId === pc.pcPlanId
                              ? " campaign-pc-select--focused"
                              : ""
                          }`}
                          onClick={() => selectPc(pc.pcPlanId, pc.userId)}
                        >
                          <strong>{pc.name}</strong>
                          <span>
                            {pc.classSummary} · {pc.username}
                          </span>
                        </button>
                        {(isDm || pc.userId === user.id) && (
                          <button
                            type="button"
                            className="tool-btn tool-btn--ghost"
                            disabled={pending}
                            onClick={() =>
                              startTransition(async () => {
                                const r = await unlinkPcFromCampaign(table.id, pc.id);
                                if (!r.success) setError(r.error ?? "Unlink failed");
                                else refresh();
                              })
                            }
                          >
                            Unlink
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>

                  <div className="campaign-pc-actions">
                    {isDm ? (
                      <label className="campaign-owner-select">
                        <span>Owner</span>
                        <select
                          value={createOwnerUserId}
                          onChange={(e) => setCreateOwnerUserId(e.target.value)}
                          disabled={pending}
                        >
                          {table.members
                            .filter((m) => m.status === "active")
                            .map((m) => (
                              <option key={m.userId} value={m.userId}>
                                {m.username}
                                {m.role === "dm" ? " (DM)" : ""}
                              </option>
                            ))}
                        </select>
                      </label>
                    ) : null}
                    <button
                      type="button"
                      className="tool-btn"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          const r = await createPcInCampaign(
                            table.id,
                            undefined,
                            isDm ? createOwnerUserId : undefined,
                          );
                          if (!r.success || !r.planId) {
                            setError(r.error ?? "Could not create PC");
                            return;
                          }
                          refresh();
                          openPc(r.planId, { restore: true });
                        })
                      }
                    >
                      Create PC
                    </button>
                    <button
                      type="button"
                      className="tool-btn tool-btn--ghost"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          const plans = await getUserPcPlans();
                          setMyPlans(plans);
                          setShowImport(true);
                        })
                      }
                    >
                      Import PC
                    </button>
                  </div>

                  {showImport ? (
                    <div className="campaign-import">
                      <p>Attach an existing character from PC Planner:</p>
                      <ul className="campaign-roster-list">
                        {myPlans.map((p) => (
                          <li key={p.id}>
                            <span>
                              {p.name} · {p.classSummary}
                            </span>
                            <button
                              type="button"
                              className="tool-btn"
                              disabled={pending}
                              onClick={() =>
                                startTransition(async () => {
                                  const r = await attachPcToCampaign(table.id, p.id);
                                  if (!r.success) {
                                    setError(r.error ?? "Could not attach");
                                    return;
                                  }
                                  setShowImport(false);
                                  refresh();
                                  openPc(p.id, { restore: true });
                                })
                              }
                            >
                              Attach
                            </button>
                          </li>
                        ))}
                      </ul>
                      <button
                        type="button"
                        className="tool-btn tool-btn--ghost"
                        onClick={() => setShowImport(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : null}
                </section>
              </div>
            </aside>
          </>
        ) : null}

        <div className="campaign-party-strip" aria-label="Online characters">
          {onlinePcs.length === 0 ? (
            <p className="campaign-party-empty">No characters online</p>
          ) : (
            <ul className="campaign-party-list">
              {onlinePcs.map((pc) => {
                const canOpen = isDm || pc.userId === user.id;
                return (
                  <li key={pc.id}>
                    <button
                      type="button"
                      className={`campaign-party-chip${
                        openPcPlanIds.includes(pc.pcPlanId)
                          ? " campaign-party-chip--active"
                          : ""
                      }${
                        focusedPcPlanId === pc.pcPlanId
                          ? " campaign-party-chip--focused"
                          : ""
                      }${canOpen ? "" : " campaign-party-chip--locked"}`}
                      disabled={!canOpen}
                      title={
                        canOpen
                          ? `Open ${pc.name}`
                          : `${pc.name} (${pc.username})`
                      }
                      onClick={() => selectPc(pc.pcPlanId, pc.userId)}
                    >
                      <CampaignPcAvatar
                        name={pc.name}
                        src={pc.tokenImageUrl}
                        size="sm"
                      />
                      <span className="campaign-party-chip-name">{pc.name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {liveMap ? (
          <CampaignMapBoard
            campaignId={table.id}
            map={liveMap}
            isDm={isDm}
            viewerUserId={user.id}
            onMapChange={handleMapChange}
            onOpenPcSheet={(pcPlanId) => {
              const pc = rosterPcs.find((p) => p.pcPlanId === pcPlanId);
              if (!pc) return;
              selectPc(pcPlanId, pc.userId);
            }}
            extraPings={mapPings}
            aoePointers={aoePointers}
            viewportGoTo={viewportGoTo}
            sendLive={sendLive}
          />
        ) : null}

        {openPcPlanIds.length === 0 && !liveMap ? (
          <div className="campaign-stage-empty">
            <p className="pc-sheet-empty">
              {isDm
                ? "Upload a map from the Maps rail, then set it live."
                : "Waiting for the DM to share a map."}
            </p>
          </div>
        ) : null}

        {openPcPlanIds.length > 0
          ? openPcPlanIds.map((pcPlanId, index) => {
            const pc = table.pcs.find((p) => p.pcPlanId === pcPlanId);
            return (
              <CampaignSheetInstance
                key={pcPlanId}
                campaignId={table.id}
                pcPlanId={pcPlanId}
                fallbackName={pc?.name ?? "Character"}
                fallbackTokenImageUrl={pc?.tokenImageUrl ?? null}
                viewerUserId={user.id}
                cascadeIndex={index}
                zIndex={SHEET_Z_BASE + (focusOrder[pcPlanId] ?? index)}
                focused={focusedPcPlanId === pcPlanId}
                poppedOut={poppedOutPcPlanIds.includes(pcPlanId)}
                restoreRequest={restoreTicks[pcPlanId] ?? 0}
                pcUpdatedEvent={pcUpdatedEvent}
                onFocus={raisePc}
                onClose={closePc}
                onPopOut={openPopOut}
                onFocusPopOut={focusPopOut}
                onError={setError}
              />
            );
          })
          : null}
      </div>

      <DiceCanvas />
      <DiceTray />
      <DiceLogTray />
    </>
  );
}
