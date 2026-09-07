"use client";

import type { MapTool } from "@/lib/map/types";
import {
  Circle,
  Compass,
  DoorOpen,
  Eraser,
  Eye,
  EyeOff,
  Hexagon,
  Lightbulb,
  Maximize2,
  MousePointer2,
  Move,
  Pencil,
  Ruler,
  Square,
  Fan,
  Grid3x3,
  Magnet,
  Radio,
} from "lucide-react";

type MapToolbarProps = {
  tool: MapTool;
  onToolChange: (tool: MapTool) => void;
  isDm: boolean;
  snap: boolean;
  onSnapChange: (v: boolean) => void;
  gridVisible: boolean;
  onGridVisibleChange: (v: boolean) => void;
  measureBroadcast: boolean;
  onMeasureBroadcastChange: (v: boolean) => void;
  onFitView: () => void;
  fogEnabled: boolean;
  losEnabled: boolean;
  lightingEnabled: boolean;
  onFogToggle: () => void;
  onLosToggle: () => void;
  onLightingToggle: () => void;
  daylight?: number;
  onDaylightChange?: (value: number) => void;
  onClearDrawings: () => void;
  onResetFog: () => void;
};

function ToolBtn({
  active,
  title,
  onClick,
  children,
}: {
  active?: boolean;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={`campaign-map-toolbar-btn${active ? " campaign-map-toolbar-btn--active" : ""}`}
      title={title}
      aria-pressed={active}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function ToggleBtn({
  active,
  title,
  onClick,
  children,
}: {
  active: boolean;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={`campaign-map-toolbar-toggle${active ? " campaign-map-toolbar-toggle--on" : ""}`}
      title={title}
      aria-pressed={active}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function MapToolbar({
  tool,
  onToolChange,
  isDm,
  snap,
  onSnapChange,
  gridVisible,
  onGridVisibleChange,
  measureBroadcast,
  onMeasureBroadcastChange,
  onFitView,
  fogEnabled,
  losEnabled,
  lightingEnabled,
  onFogToggle,
  onLosToggle,
  onLightingToggle,
  daylight = 1,
  onDaylightChange,
  onClearDrawings,
  onResetFog,
}: MapToolbarProps) {
  return (
    <div className="campaign-map-toolbar" role="toolbar" aria-label="Map tools">
      <ToolBtn
        active={tool === "select"}
        title="Select (click tokens)"
        onClick={() => onToolChange("select")}
      >
        <MousePointer2 size={16} aria-hidden />
      </ToolBtn>
      <ToolBtn
        active={tool === "pan"}
        title="Pan (Space or middle mouse)"
        onClick={() => onToolChange("pan")}
      >
        <Move size={16} aria-hidden />
      </ToolBtn>
      <ToolBtn
        active={tool === "ping"}
        title="Ping (Shift+click DM: center all views)"
        onClick={() => onToolChange("ping")}
      >
        <Radio size={16} aria-hidden />
      </ToolBtn>
      <ToolBtn
        active={tool === "measure"}
        title="Measure distance"
        onClick={() => onToolChange("measure")}
      >
        <Ruler size={16} aria-hidden />
      </ToolBtn>

      <span className="campaign-map-toolbar-sep" aria-hidden />
      <ToolBtn
        active={tool === "draw"}
        title="Draw freehand"
        onClick={() => onToolChange("draw")}
      >
        <Pencil size={16} aria-hidden />
      </ToolBtn>
      <ToolBtn
        active={tool === "aoeCircle"}
        title="Circle (size in feet)"
        onClick={() => onToolChange("aoeCircle")}
      >
        <Circle size={16} aria-hidden />
      </ToolBtn>
      <ToolBtn
        active={tool === "aoeSquare"}
        title="Square (size in feet)"
        onClick={() => onToolChange("aoeSquare")}
      >
        <Square size={16} aria-hidden />
      </ToolBtn>
      <ToolBtn
        active={tool === "aoeCone"}
        title="Cone 90° (size in feet)"
        onClick={() => onToolChange("aoeCone")}
      >
        <Fan size={16} aria-hidden />
      </ToolBtn>

      {isDm ? (
        <>
          <span className="campaign-map-toolbar-sep" aria-hidden />
          <ToolBtn
            active={tool === "calibrate"}
            title="Calibrate grid (two corners of one square)"
            onClick={() => onToolChange("calibrate")}
          >
            <Compass size={16} aria-hidden />
          </ToolBtn>
          <ToolBtn
            active={tool === "fogReveal"}
            title="Fog reveal (click and drag)"
            onClick={() => onToolChange("fogReveal")}
          >
            <Eye size={16} aria-hidden />
          </ToolBtn>
          <ToolBtn
            active={tool === "fogHide"}
            title="Fog hide (click and drag)"
            onClick={() => onToolChange("fogHide")}
          >
            <EyeOff size={16} aria-hidden />
          </ToolBtn>
          <ToolBtn
            active={tool === "wall"}
            title="Wall"
            onClick={() => onToolChange("wall")}
          >
            <Hexagon size={16} aria-hidden />
          </ToolBtn>
          <ToolBtn
            active={tool === "door"}
            title="Door"
            onClick={() => onToolChange("door")}
          >
            <DoorOpen size={16} aria-hidden />
          </ToolBtn>
          <ToolBtn
            active={tool === "light"}
            title="Place light"
            onClick={() => onToolChange("light")}
          >
            <Lightbulb size={16} aria-hidden />
          </ToolBtn>
        </>
      ) : null}

      <span className="campaign-map-toolbar-sep" aria-hidden />

      <ToggleBtn
        active={snap}
        title="Snap to grid"
        onClick={() => onSnapChange(!snap)}
      >
        <Magnet size={16} aria-hidden />
      </ToggleBtn>
      <ToggleBtn
        active={gridVisible}
        title="Show grid"
        onClick={() => onGridVisibleChange(!gridVisible)}
      >
        <Grid3x3 size={16} aria-hidden />
      </ToggleBtn>
      <ToggleBtn
        active={measureBroadcast}
        title="Broadcast measure to table"
        onClick={() => onMeasureBroadcastChange(!measureBroadcast)}
      >
        <Ruler size={14} aria-hidden />
        <span className="campaign-map-toolbar-toggle-label">Share</span>
      </ToggleBtn>
      <ToolBtn title="Fit map to view" onClick={onFitView}>
        <Maximize2 size={16} aria-hidden />
      </ToolBtn>

      {isDm ? (
        <>
          <span className="campaign-map-toolbar-sep" aria-hidden />
          <ToggleBtn
            active={fogEnabled}
            title="Toggle fog of war"
            onClick={onFogToggle}
          >
            Fog
          </ToggleBtn>
          <ToggleBtn
            active={losEnabled}
            title="Toggle line of sight"
            onClick={onLosToggle}
          >
            LOS
          </ToggleBtn>
          <ToggleBtn
            active={lightingEnabled}
            title="Toggle dynamic lighting"
            onClick={onLightingToggle}
          >
            Light
          </ToggleBtn>
          {lightingEnabled && onDaylightChange ? (
            <label className="campaign-map-toolbar-daylight" title="Ambient daylight">
              <span>Day</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={daylight}
                onChange={(e) => onDaylightChange(Number(e.target.value))}
              />
            </label>
          ) : null}
          <ToolBtn title="Clear all drawings" onClick={onClearDrawings}>
            <Eraser size={16} aria-hidden />
          </ToolBtn>
          <ToolBtn title="Reset fog regions" onClick={onResetFog}>
            Reset fog
          </ToolBtn>
        </>
      ) : null}
    </div>
  );
}
