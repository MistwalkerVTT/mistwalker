import React from 'react';
import {
  Shield,
  Eye,
  EyeOff,
  DoorClosed,
  DoorOpen,
  Square,
  Sparkles,
  Trash2,
  Lock,
  Unlock,
  Magnet,
  Layers,
  Compass,
  Maximize2,
  Pentagon,
  Check,
  X,
  Eraser,
  Scissors
} from 'lucide-react';
import { WallSegment, WallType, DoorState, VisionConfig, CampaignMode, RoomAnnotation, isMonsterToken } from '../types';

interface WallEditorToolbarProps {
  tool: string;
  setTool: (tool: string) => void;
  walls: WallSegment[];
  selectedWallId: string | null;
  onSelectWall: (id: string | null) => void;
  onDeleteWall: (id: string) => void;
  onSplitWall?: (id: string, splitPoint?: { x: number; y: number }) => void;
  onClearWalls: () => void;
  activeWallType: WallType;
  setActiveWallType: (type: WallType) => void;
  activeDoorState: DoorState;
  setActiveDoorState: (state: DoorState) => void;
  snapToGrid: boolean;
  setSnapToGrid: (snap: boolean) => void;
  visionConfig: VisionConfig;
  setVisionConfig: React.Dispatch<React.SetStateAction<VisionConfig>>;
  onGenerateRoomWalls?: () => void;
  selectedToken?: any | null;
  onUpdateTokenVision?: (tokenId: string, updates: { visionRadius?: number; visionAngle?: number }) => void;
  campaignMode?: CampaignMode;
  onModeChange?: (mode: CampaignMode) => void;
  currentZonePolygonPoints?: number[];
  onCompleteZonePolygon?: () => void;
  onCancelZonePolygon?: () => void;
  roomAnnotations?: RoomAnnotation[];
  onOpenZoneDetails?: (zone: RoomAnnotation) => void;
  onOpenZoneSidePanel?: () => void;
}

export const WallEditorToolbar: React.FC<WallEditorToolbarProps> = ({
  tool,
  setTool,
  walls,
  selectedWallId,
  onSelectWall,
  onDeleteWall,
  onSplitWall,
  onClearWalls,
  activeWallType,
  setActiveWallType,
  activeDoorState,
  setActiveDoorState,
  snapToGrid,
  setSnapToGrid,
  visionConfig,
  setVisionConfig,
  onGenerateRoomWalls,
  selectedToken,
  onUpdateTokenVision,
  campaignMode = 'creator',
  onModeChange,
  currentZonePolygonPoints = [],
  onCompleteZonePolygon,
  onCancelZonePolygon,
  roomAnnotations = [],
  onOpenZoneDetails,
  onOpenZoneSidePanel
}) => {
  const selectedWall = walls.find((w) => w.id === selectedWallId);
  const isZoneToolActive = tool === 'zone' || tool === 'hotspot' || tool === 'polygon_zone';

  return (
    <div className="flex flex-col gap-2.5 bg-zinc-950/95 backdrop-blur-md border border-zinc-800 rounded-2xl p-3 shadow-2xl text-xs text-zinc-200 min-w-[300px]">
      {/* Campaign Mode Switcher in Creator Toolbar */}
      {onModeChange && (
        <div className="flex items-center justify-between bg-zinc-900/90 p-1.5 rounded-xl border border-zinc-800">
          <span className="text-[10px] font-mono text-zinc-400 pl-1 uppercase font-bold">Active Mode:</span>
          <div className="flex items-center gap-1">
            <button
              id="btn-creator-toolbar-mode-creator"
              onClick={() => onModeChange('creator')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[10px] font-mono border transition-all ${
                campaignMode === 'creator'
                  ? 'bg-amber-500 border-amber-400 text-zinc-950 shadow-sm'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
              }`}
              title="Creator Mode: Draw lines & doors, edit room geometry"
            >
              🔨 Creator
            </button>
            <button
              id="btn-creator-toolbar-mode-run"
              onClick={() => onModeChange('run')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[10px] font-mono border transition-all ${
                campaignMode === 'run'
                  ? 'bg-emerald-600 border-emerald-400 text-white shadow-sm'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
              }`}
              title="Run Campaign: Hide wall lines, click doors to open"
            >
              ⚔️ Run Campaign
            </button>
          </div>
        </div>
      )}

      {/* DISTINCT TOOL PICKER: WALLS VS ROOM POLYGONS */}
      <div className="flex flex-col gap-1.5 bg-zinc-900/90 p-2 rounded-xl border border-zinc-800">
        <span className="text-[10px] font-mono text-zinc-400 uppercase font-bold tracking-wider flex items-center justify-between">
          <span>Map Creator Tools:</span>
          <span className="text-[9px] text-zinc-500 font-normal">Choose active tool</span>
        </span>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            id="btn-creator-pick-wall-tool"
            onClick={() => setTool(tool === 'wall' ? 'select' : 'wall')}
            className={`py-2 px-2.5 rounded-xl font-bold font-mono text-xs flex items-center justify-center gap-2 border transition-all cursor-pointer ${
              tool === 'wall'
                ? 'bg-blue-600 border-blue-400 text-white shadow-md shadow-blue-600/30'
                : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-750'
            }`}
            title="Wall Tool: Draw solid lines, doors, and windows that block vision and movement (FOV)"
          >
            <Layers className="w-4 h-4" />
            <span>Draw Walls</span>
          </button>

          <button
            id="btn-creator-pick-zone-tool"
            onClick={() => setTool(isZoneToolActive ? 'select' : 'zone')}
            className={`py-2 px-2.5 rounded-xl font-bold font-mono text-xs flex items-center justify-center gap-2 border transition-all cursor-pointer ${
              isZoneToolActive
                ? 'bg-amber-500 border-amber-400 text-zinc-950 shadow-md shadow-amber-500/30'
                : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-750'
            }`}
            title="Room Polygon Tool: Click on canvas to outline room polygons and attach DM boxed text, notes & PDF citations"
          >
            <Pentagon className="w-4 h-4" />
            <span>Draw Room Zone</span>
          </button>
        </div>
      </div>

      {/* Dedicated Polygon Room Zone Controls */}
      {isZoneToolActive && (
        <div className="flex flex-col gap-2.5 bg-amber-950/20 border border-amber-500/40 p-2.5 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold font-mono text-amber-300 text-xs">
              <Pentagon className="w-4 h-4 text-amber-400" />
              <span>Room Polygon Tool (Active)</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40">
              {currentZonePolygonPoints && currentZonePolygonPoints.length > 0
                ? `${currentZonePolygonPoints.length / 2} points placed`
                : 'Click map to place points'}
            </span>
          </div>

          <p className="text-[10px] text-zinc-300 leading-normal">
            Click canvas to outline room corners. Double-click or click back to starting dot to close and set boxed text.
          </p>

          <div className="flex items-center gap-1.5">
            {currentZonePolygonPoints && currentZonePolygonPoints.length >= 6 ? (
              <button
                id="btn-complete-zone-polygon"
                onClick={onCompleteZonePolygon}
                className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs font-mono flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/40 transition-all cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save & Label Room</span>
              </button>
            ) : (
              <div className="flex-1 py-1.5 px-2 rounded-lg bg-zinc-900 text-zinc-400 font-mono text-[10px] text-center border border-zinc-800">
                Place ≥ 3 corners on map
              </div>
            )}

            {currentZonePolygonPoints && currentZonePolygonPoints.length > 0 && (
              <button
                id="btn-cancel-zone-polygon"
                onClick={onCancelZonePolygon}
                className="py-1.5 px-2.5 rounded-lg bg-zinc-800 hover:bg-red-950/50 text-zinc-400 hover:text-red-300 border border-zinc-700 text-xs font-mono transition-colors cursor-pointer"
                title="Cancel active polygon (Esc)"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {roomAnnotations && roomAnnotations.length > 0 && (
            <div className="pt-2 border-t border-amber-500/20 flex items-center justify-between">
              <span className="text-[10px] font-mono text-zinc-400">
                {roomAnnotations.length} {roomAnnotations.length === 1 ? 'room' : 'rooms'} saved
              </span>
              {onOpenZoneSidePanel && (
                <button
                  id="btn-open-zones-drawer"
                  onClick={onOpenZoneSidePanel}
                  className="text-[10px] font-mono text-amber-400 hover:underline flex items-center gap-1 cursor-pointer font-bold"
                >
                  <span>View All Zones →</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Wall Placement Tool Trigger & FOV Controls (Shown when wall tool active or when not drawing zones) */}
      {!isZoneToolActive && (
        <>
          {/* Header & Dynamic Lighting Master Toggle */}
          <div className="flex items-center justify-between border-t border-zinc-800/80 pt-2 pb-0.5">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-400" />
              <span className="font-bold font-mono uppercase tracking-wider text-zinc-100 text-[11px]">
                Dynamic Lighting & Walls
              </span>
            </div>
            <button
              onClick={() =>
                setVisionConfig((prev) => ({ ...prev, enabled: !prev.enabled }))
              }
              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all border flex items-center gap-1.5 ${
                visionConfig.enabled
                  ? 'bg-blue-500/20 border-blue-500/50 text-blue-300 shadow-[0_0_8px_rgba(59,130,246,0.3)]'
                  : 'bg-zinc-800/80 border-zinc-700 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {visionConfig.enabled ? <Eye className="w-3.5 h-3.5 text-blue-400" /> : <EyeOff className="w-3.5 h-3.5 text-zinc-500" />}
              {visionConfig.enabled ? 'FOV ACTIVE' : 'FOV DISABLED'}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <button
              id="btn-creator-draw-wall-toggle"
              onClick={() => setTool(tool === 'wall' ? 'select' : 'wall')}
              className={`py-2 px-2 rounded-xl font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer text-xs ${
                tool === 'wall'
                  ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-600/30'
                  : 'bg-zinc-800/90 border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-750'
              }`}
              title="Draw walls, doors, and windows"
            >
              <Layers className="w-3.5 h-3.5 shrink-0" />
              <span>Draw</span>
            </button>

            <button
              id="btn-creator-erase-wall-toggle"
              onClick={() => setTool(tool === 'erase_wall' ? 'select' : 'erase_wall')}
              className={`py-2 px-2 rounded-xl font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer text-xs ${
                tool === 'erase_wall'
                  ? 'bg-red-600 border-red-400 text-white shadow-lg shadow-red-600/30 font-extrabold animate-pulse'
                  : 'bg-zinc-800/90 border-zinc-700 text-zinc-300 hover:text-red-300 hover:bg-red-950/40'
              }`}
              title="Erase individual wall sections: click wall or drag across walls to cut"
            >
              <Eraser className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <span>Erase</span>
            </button>

            <button
              id="btn-creator-split-wall-toggle"
              onClick={() => setTool(tool === 'split_wall' ? 'select' : 'split_wall')}
              className={`py-2 px-2 rounded-xl font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer text-xs ${
                tool === 'split_wall'
                  ? 'bg-amber-600 border-amber-400 text-white shadow-lg shadow-amber-600/30 font-extrabold'
                  : 'bg-zinc-800/90 border-zinc-700 text-zinc-300 hover:text-amber-300 hover:bg-amber-950/40'
              }`}
              title="Split wall segment into two sections"
            >
              <Scissors className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Split</span>
            </button>
          </div>

          <div className="flex items-center justify-between px-2 py-1 bg-zinc-900/60 rounded-lg border border-zinc-800 text-[10px] font-mono">
            <span className="text-zinc-400 flex items-center gap-1.5">
              <Magnet className="w-3 h-3 text-emerald-400" />
              <span>Grid Snapping</span>
            </span>
            <button
              onClick={() => setSnapToGrid(!snapToGrid)}
              className={`px-2 py-0.5 rounded text-[9px] font-bold border transition-all ${
                snapToGrid
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-zinc-300'
              }`}
              title={snapToGrid ? 'Grid Snapping Enabled' : 'Grid Snapping Disabled'}
            >
              {snapToGrid ? 'ON' : 'OFF'}
            </button>
          </div>
        </>
      )}

      {/* Wall Type Selection */}
      {tool === 'wall' && (
        <div className="flex flex-col gap-2 bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800">
          <span className="text-[10px] font-mono text-zinc-400 uppercase">Segment Type</span>
          <div className="grid grid-cols-4 gap-1">
            <button
              onClick={() => setActiveWallType('normal')}
              className={`py-1.5 px-1 rounded-lg font-mono text-[10px] font-bold border transition-all ${
                activeWallType === 'normal'
                  ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                  : 'bg-zinc-800 border-zinc-700/60 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Solid
            </button>
            <button
              onClick={() => setActiveWallType('door')}
              className={`py-1.5 px-1 rounded-lg font-mono text-[10px] font-bold border transition-all flex items-center justify-center gap-0.5 ${
                activeWallType === 'door'
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                  : 'bg-zinc-800 border-zinc-700/60 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <DoorClosed className="w-3 h-3" /> Door
            </button>
            <button
              onClick={() => setActiveWallType('secret_door')}
              className={`py-1.5 px-1 rounded-lg font-mono text-[10px] font-bold border transition-all flex items-center justify-center gap-0.5 ${
                activeWallType === 'secret_door'
                  ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                  : 'bg-zinc-800 border-zinc-700/60 text-zinc-400 hover:text-zinc-200'
              }`}
              title="Secret Door: Appears as a solid wall to players until opened"
            >
              <EyeOff className="w-3 h-3 text-purple-400" /> Secret
            </button>
            <button
              onClick={() => setActiveWallType('window')}
              className={`py-1.5 px-1 rounded-lg font-mono text-[10px] font-bold border transition-all ${
                activeWallType === 'window'
                  ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                  : 'bg-zinc-800 border-zinc-700/60 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Window
            </button>
          </div>

          {(activeWallType === 'door' || activeWallType === 'secret_door') && (
            <div className="flex items-center gap-1 mt-1">
              <span className="text-[9px] font-mono text-zinc-400 uppercase mr-1">
                {activeWallType === 'secret_door' ? 'Secret:' : 'Door:'}
              </span>
              <button
                onClick={() => setActiveDoorState('closed')}
                className={`flex-1 py-1 rounded text-[9px] font-mono border ${
                  activeDoorState === 'closed'
                    ? activeWallType === 'secret_door'
                      ? 'bg-purple-500/30 border-purple-400 text-purple-300 font-bold'
                      : 'bg-amber-500/30 border-amber-400 text-amber-300 font-bold'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                }`}
              >
                Closed
              </button>
              <button
                onClick={() => setActiveDoorState('open')}
                className={`flex-1 py-1 rounded text-[9px] font-mono border ${
                  activeDoorState === 'open'
                    ? 'bg-emerald-500/30 border-emerald-400 text-emerald-300 font-bold'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                }`}
              >
                Open
              </button>
              <button
                onClick={() => setActiveDoorState('locked')}
                className={`flex-1 py-1 rounded text-[9px] font-mono border ${
                  activeDoorState === 'locked'
                    ? 'bg-red-500/30 border-red-400 text-red-300 font-bold'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                }`}
              >
                Locked
              </button>
            </div>
          )}

          <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
            • Click & drag or click two points on canvas to place.
            • Right-click cancels current segment.
          </div>
        </div>
      )}

      {/* Selected Wall Actions */}
      {selectedWall && (
        <div className="flex items-center justify-between bg-pink-950/30 border border-pink-500/40 p-2 rounded-xl">
          <span className="text-[10px] font-mono text-pink-300 font-bold">
            Wall Selected ({selectedWall.wallType === 'secret_door' ? 'secret door' : (selectedWall.wallType || 'normal')})
          </span>
          <div className="flex items-center gap-1.5">
            {(selectedWall.wallType === 'door' || selectedWall.wallType === 'secret_door') && (
              <button
                onClick={() => {
                  const next: DoorState =
                    selectedWall.doorState === 'open' ? 'closed' : 'open';
                  setActiveDoorState(next);
                }}
                className={`p-1 rounded bg-zinc-800 hover:bg-zinc-700 ${selectedWall.wallType === 'secret_door' ? 'text-purple-300' : 'text-amber-300'}`}
                title={`Toggle ${selectedWall.wallType === 'secret_door' ? 'Secret Door' : 'Door'} State`}
              >
                {selectedWall.doorState === 'open' ? (
                  <DoorOpen className="w-3.5 h-3.5" />
                ) : (
                  <DoorClosed className="w-3.5 h-3.5" />
                )}
              </button>
            )}
            {onSplitWall && (
              <button
                onClick={() => onSplitWall(selectedWall.id)}
                className="p-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-[10px] font-bold flex items-center gap-1"
                title="Split this wall section into two"
              >
                <Scissors className="w-3 h-3" /> Split
              </button>
            )}
            <button
              onClick={() => onDeleteWall(selectedWall.id)}
              className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 text-[10px] font-bold flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" /> Delete
            </button>
          </div>
        </div>
      )}

      {/* Vision & Fog Toggles */}
      <div className="flex flex-col gap-1.5 pt-2 border-t border-zinc-800">
        <span className="text-[10px] font-mono text-zinc-400 uppercase">FOV Options</span>

        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() =>
              setVisionConfig((prev) => ({
                ...prev,
                explorationMemory: !prev.explorationMemory
              }))
            }
            className={`p-1.5 rounded-lg text-[10px] font-mono border text-left transition-all ${
              visionConfig.explorationMemory
                ? 'bg-blue-500/20 border-blue-500/50 text-blue-300 font-bold'
                : 'bg-zinc-850 border-zinc-750 text-zinc-400'
            }`}
          >
            Exploration Memory: {visionConfig.explorationMemory ? 'ON' : 'OFF'}
          </button>

          <button
            onClick={() =>
              setVisionConfig((prev) => ({
                ...prev,
                dmPreviewMode: !prev.dmPreviewMode
              }))
            }
            className={`p-1.5 rounded-lg text-[10px] font-mono border text-left transition-all ${
              visionConfig.dmPreviewMode
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold'
                : 'bg-zinc-850 border-zinc-750 text-zinc-400'
            }`}
            title="Preview dark fog & field of view exactly as players see it"
          >
            DM Preview: {visionConfig.dmPreviewMode ? 'PLAYER FOV' : 'NORMAL'}
          </button>
        </div>

        <button
          onClick={() =>
            setVisionConfig((prev) => ({
              ...prev,
              showDoorBadges: !prev.showDoorBadges
            }))
          }
          className={`p-1.5 rounded-lg text-[10px] font-mono border text-left transition-all flex items-center justify-between ${
            visionConfig.showDoorBadges
              ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold'
              : 'bg-zinc-850 border-zinc-750 text-zinc-400'
          }`}
          title="Toggle the descriptive 'DOOR' status circle badges on drawn doors (defaults to off)"
        >
          <span>Door "Door" Badges:</span>
          <span>{visionConfig.showDoorBadges ? 'SHOWN' : 'HIDDEN'}</span>
        </button>
      </div>

      {/* Selected Token Vision Configuration (Strictly Hidden for Monster tokens) */}
      {selectedToken &&
        onUpdateTokenVision &&
        !isMonsterToken(selectedToken) &&
        selectedToken.isMonster !== true &&
        selectedToken.category !== 'monster' &&
        selectedToken.isPlayer !== false && (
        <div className="flex flex-col gap-1.5 bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-zinc-300 font-bold">
              Vision: {selectedToken.name}
            </span>
            <span className="text-[10px] font-mono text-blue-400">
              {selectedToken.visionRadius || 60} ft
            </span>
          </div>

          <div className="flex items-center gap-1">
            {[30, 60, 90, 120].map((ft) => (
              <button
                key={ft}
                onClick={() => onUpdateTokenVision(selectedToken.id, { visionRadius: ft })}
                className={`flex-1 py-1 rounded text-[9px] font-mono border ${
                  (selectedToken.visionRadius || 60) === ft
                    ? 'bg-blue-500/30 border-blue-400 text-blue-300 font-bold'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {ft}ft
              </button>
            ))}
          </div>

          {/* Cone Angle */}
          <div className="flex items-center gap-1 mt-1">
            <span className="text-[9px] font-mono text-zinc-400">Angle:</span>
            {[360, 90, 60].map((deg) => (
              <button
                key={deg}
                onClick={() => onUpdateTokenVision(selectedToken.id, { visionAngle: deg })}
                className={`flex-1 py-0.5 rounded text-[9px] font-mono border ${
                  (selectedToken.visionAngle ?? 360) === deg
                    ? 'bg-amber-500/30 border-amber-400 text-amber-300 font-bold'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                }`}
              >
                {deg === 360 ? '360°' : `${deg}° Cone`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Wall Management Summary & Presets */}
      <div className="flex items-center justify-between pt-1 border-t border-zinc-800 text-[10px] font-mono text-zinc-400">
        <span>{walls.length} Total Walls</span>
        <div className="flex items-center gap-2">
          {onGenerateRoomWalls && (
            <button
              onClick={onGenerateRoomWalls}
              className="text-blue-400 hover:text-blue-300 underline"
            >
              + Preset Room
            </button>
          )}
          {walls.length > 0 && (
            <button
              onClick={onClearWalls}
              className="text-red-400 hover:text-red-300 flex items-center gap-1"
            >
              <Trash2 className="w-2.5 h-2.5" /> Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
