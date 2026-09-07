"use client";

import {
  createCampaignMap,
  deleteCampaignMap,
  duplicateCampaignMap,
  importUvtt,
  placeNpcToken,
  placePartyTokens,
  renameCampaignMap,
  setLiveCampaignMap,
  updateCampaignMapGrid,
} from "@/actions/maps";
import type {
  CampaignMapListItem,
  CampaignMapView,
  MapDiagonalRule,
} from "@/lib/map/types";
import { useRef, useState, useTransition } from "react";

type MapScenesDrawerProps = {
  maps: CampaignMapListItem[];
  liveMapId: string | null;
  campaignId: string;
  onClose: () => void;
  onChanged: () => void;
  currentMap: CampaignMapView | null;
};

export function MapScenesDrawer({
  maps,
  liveMapId,
  campaignId,
  onClose,
  onChanged,
  currentMap,
}: MapScenesDrawerProps) {
  const [pending, startTransition] = useTransition();
  const [uploadName, setUploadName] = useState("");
  const [npcName, setNpcName] = useState("NPC");
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const uvttRef = useRef<HTMLInputElement>(null);
  const npcFileRef = useRef<HTMLInputElement>(null);

  const [gridSizePx, setGridSizePx] = useState(
    currentMap?.gridSizePx ?? 70,
  );
  const [gridOffsetX, setGridOffsetX] = useState(
    currentMap?.gridOffsetX ?? 0,
  );
  const [gridOffsetY, setGridOffsetY] = useState(
    currentMap?.gridOffsetY ?? 0,
  );
  const [scaleFeet, setScaleFeet] = useState(currentMap?.scaleFeet ?? 5);
  const [diagonalRule, setDiagonalRule] = useState<MapDiagonalRule>(
    currentMap?.diagonalRule ?? "5105",
  );

  function run(action: () => Promise<{ success: boolean; error?: string }>) {
    startTransition(async () => {
      setError(null);
      const r = await action();
      if (!r.success) {
        setError(r.error ?? "Action failed");
        return;
      }
      onChanged();
    });
  }

  function handleUpload(file: File | null) {
    if (!file) return;
    const formData = new FormData();
    formData.set("name", uploadName.trim() || file.name.replace(/\.[^.]+$/, ""));
    formData.set("file", file);
    run(() => createCampaignMap(campaignId, formData));
    setUploadName("");
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleUvtt(file: File | null) {
    if (!file) return;
    const formData = new FormData();
    formData.set("file", file);
    formData.set("name", file.name.replace(/\.[^.]+$/, ""));
    run(() => importUvtt(campaignId, formData));
    if (uvttRef.current) uvttRef.current.value = "";
  }

  function saveGrid() {
    if (!currentMap) return;
    run(() =>
      updateCampaignMapGrid(
        campaignId,
        currentMap.id,
        gridSizePx,
        gridOffsetX,
        gridOffsetY,
        scaleFeet,
        diagonalRule,
      ),
    );
  }

  return (
    <>
      <button
        type="button"
        className="campaign-drawer-backdrop"
        aria-label="Close maps"
        onClick={onClose}
      />
      <aside className="campaign-drawer map-scenes-drawer" aria-label="Map scenes">
        <header className="campaign-drawer-header">
          <div>
            <h2 className="campaign-drawer-title">Maps</h2>
            <p className="campaign-drawer-sub">
              Upload battlemaps, set one live, calibrate the grid.
            </p>
          </div>
          <button type="button" className="tool-btn tool-btn--ghost" onClick={onClose}>
            Close
          </button>
        </header>

        {error ? <p className="tool-error map-scenes-drawer-error">{error}</p> : null}

        <section className="map-scenes-drawer-section">
          <h3 className="map-scenes-drawer-heading">Upload scene</h3>
          <input
            type="text"
            className="pc-sheet-input"
            placeholder="Scene name"
            value={uploadName}
            onChange={(e) => setUploadName(e.target.value)}
            disabled={pending}
          />
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={pending}
            onChange={(e) => handleUpload(e.target.files?.[0] ?? null)}
          />
          <label className="map-scenes-drawer-uvtt">
            <span>UVTT import</span>
            <input
              ref={uvttRef}
              type="file"
              accept=".dd2vtt,.json,application/json"
              disabled={pending}
              onChange={(e) => handleUvtt(e.target.files?.[0] ?? null)}
            />
          </label>
        </section>

        <section className="map-scenes-drawer-section">
          <h3 className="map-scenes-drawer-heading">Scenes</h3>
          {maps.length === 0 ? (
            <p className="campaign-party-empty">No maps yet.</p>
          ) : (
            <ul className="map-scenes-drawer-list">
              {maps.map((m) => (
                <li key={m.id} className="map-scenes-drawer-item">
                  {renameId === m.id ? (
                    <div className="map-scenes-drawer-rename">
                      <input
                        type="text"
                        className="pc-sheet-input"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        disabled={pending}
                      />
                      <button
                        type="button"
                        className="tool-btn"
                        disabled={pending || !renameValue.trim()}
                        onClick={() =>
                          run(async () => {
                            const r = await renameCampaignMap(
                              campaignId,
                              m.id,
                              renameValue.trim(),
                            );
                            if (r.success) setRenameId(null);
                            return r;
                          })
                        }
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        className="tool-btn tool-btn--ghost"
                        onClick={() => setRenameId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="map-scenes-drawer-name">
                        {m.name}
                        {liveMapId === m.id ? " (live)" : ""}
                      </span>
                      <div className="map-scenes-drawer-actions">
                        {liveMapId !== m.id ? (
                          <button
                            type="button"
                            className="tool-btn"
                            disabled={pending}
                            onClick={() =>
                              run(() => setLiveCampaignMap(campaignId, m.id))
                            }
                          >
                            Set live
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="tool-btn tool-btn--ghost"
                            disabled={pending}
                            onClick={() =>
                              run(() => setLiveCampaignMap(campaignId, null))
                            }
                          >
                            Unset live
                          </button>
                        )}
                        <button
                          type="button"
                          className="tool-btn tool-btn--ghost"
                          disabled={pending}
                          onClick={() => {
                            setRenameId(m.id);
                            setRenameValue(m.name);
                          }}
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          className="tool-btn tool-btn--ghost"
                          disabled={pending}
                          onClick={() =>
                            run(() => duplicateCampaignMap(campaignId, m.id))
                          }
                        >
                          Duplicate
                        </button>
                        <button
                          type="button"
                          className="tool-btn tool-btn--danger"
                          disabled={pending}
                          onClick={() => {
                            if (!confirm(`Delete "${m.name}"?`)) return;
                            run(() => deleteCampaignMap(campaignId, m.id));
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {currentMap ? (
          <section className="map-scenes-drawer-section">
            <h3 className="map-scenes-drawer-heading">Grid settings</h3>
            <p className="map-scenes-drawer-hint">
              For current live map: {currentMap.name}. Or use calibrate on the board.
            </p>
            <div className="map-scenes-drawer-grid-fields">
              <label>
                <span>Cell size (px)</span>
                <input
                  type="number"
                  className="pc-sheet-input"
                  min={1}
                  value={gridSizePx}
                  onChange={(e) => setGridSizePx(Number(e.target.value))}
                  disabled={pending}
                />
              </label>
              <label>
                <span>Offset X</span>
                <input
                  type="number"
                  className="pc-sheet-input"
                  value={gridOffsetX}
                  onChange={(e) => setGridOffsetX(Number(e.target.value))}
                  disabled={pending}
                />
              </label>
              <label>
                <span>Offset Y</span>
                <input
                  type="number"
                  className="pc-sheet-input"
                  value={gridOffsetY}
                  onChange={(e) => setGridOffsetY(Number(e.target.value))}
                  disabled={pending}
                />
              </label>
              <label>
                <span>Feet per square</span>
                <input
                  type="number"
                  className="pc-sheet-input"
                  min={1}
                  value={scaleFeet}
                  onChange={(e) => setScaleFeet(Number(e.target.value))}
                  disabled={pending}
                />
              </label>
              <label>
                <span>Diagonal rule</span>
                <select
                  className="pc-sheet-input"
                  value={diagonalRule}
                  onChange={(e) =>
                    setDiagonalRule(e.target.value as MapDiagonalRule)
                  }
                  disabled={pending}
                >
                  <option value="5105">5-10-5</option>
                  <option value="555">5-5-5</option>
                  <option value="euclid">Euclidean</option>
                </select>
              </label>
            </div>
            <button
              type="button"
              className="tool-btn"
              disabled={pending}
              onClick={saveGrid}
            >
              Save grid
            </button>
            <button
              type="button"
              className="tool-btn tool-btn--ghost"
              disabled={pending}
              onClick={() =>
                run(() => placePartyTokens(campaignId, currentMap.id))
              }
            >
              Place party
            </button>
            <div className="map-scenes-npc">
              <label>
                <span>Place NPC</span>
                <input
                  type="text"
                  className="pc-sheet-input"
                  value={npcName}
                  onChange={(e) => setNpcName(e.target.value)}
                  disabled={pending}
                />
              </label>
              <input
                ref={npcFileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="map-scenes-file"
                disabled={pending}
              />
              <button
                type="button"
                className="tool-btn"
                disabled={pending}
                onClick={() => {
                  const formData = new FormData();
                  const file = npcFileRef.current?.files?.[0];
                  if (file) formData.set("file", file);
                  const x = Math.floor(currentMap.imageWidth / currentMap.gridSizePx / 2);
                  const y = Math.floor(currentMap.imageHeight / currentMap.gridSizePx / 2);
                  run(() =>
                    placeNpcToken(
                      campaignId,
                      currentMap.id,
                      npcName.trim() || "NPC",
                      x,
                      y,
                      formData,
                    ),
                  );
                  if (npcFileRef.current) npcFileRef.current.value = "";
                }}
              >
                Drop NPC at center
              </button>
            </div>
          </section>
        ) : null}
      </aside>
    </>
  );
}
