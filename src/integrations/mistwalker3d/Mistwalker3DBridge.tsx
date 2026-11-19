import React, { Suspense, useCallback } from 'react';
import { Box } from 'lucide-react';

declare const __MISTWALKER_3D_ENABLED__: boolean | undefined;

/**
 * True ONLY when MistWalker 3.0 is built/run with VITE_ENABLE_3D=true
 * and the sibling ../Mistwalker 3D module is present on disk.
 * Always false on Render production builds until explicitly enabled.
 */
export const isMistwalker3DEnabled: boolean =
  typeof __MISTWALKER_3D_ENABLED__ !== 'undefined' && Boolean(__MISTWALKER_3D_ENABLED__);

const LazyDungeon3DViewport = React.lazy(() =>
  import('@mistwalker/3d').then((m) => ({ default: m.Dungeon3DViewport }))
);

const LazyDungeon3DSandbox = React.lazy(() =>
  import('@mistwalker/3d').then((m) => ({ default: m.Dungeon3DSandbox }))
);

export interface Mistwalker3DViewportBridgeProps {
  sceneId: string;
  sceneTitle: string;
  mapUrl?: string;
  mapWidth?: number;
  mapHeight?: number;
  gridSize?: number;
  gridOffsetX?: number;
  gridOffsetY?: number;
  walls: any[];
  tokens: any[];
  roomAnnotations?: any[];
  boardAnimatedFeatures?: any[];
  scene3d?: any;
  activeCombatantId?: string | null;
  selectedTokenId?: string | null;
  panToolActive?: boolean;
  isDm: boolean;
  campaignMode?: 'creator' | 'run';
  activeEquippedAsset?: any;
  effects?: any[];
  isFogVisible?: boolean;
  reveals?: any[];
  polygonReveals?: number[][];
  visionConfig?: any;
  fogResetKey?: number;
  claimedTokenId?: string | null;
  // Host state setters (passed cleanly from App.tsx or PlayerView.tsx)
  setTokens: React.Dispatch<React.SetStateAction<any[]>>;
  setWalls: React.Dispatch<React.SetStateAction<any[]>>;
  setScene3d?: (next: any) => void;
  onSelectToken?: (id: string | null) => void;
  onSelectZone?: (zone: any) => void;
  onSaveScene?: () => void;
  onCastSpell?: (originPx: { x: number; y: number }, targetPx: { x: number; y: number }) => void;
  onToggleFog?: (vis: boolean) => void;
  onResetFog?: () => void;
  onAddReveal?: (rev: any) => void;
  onRemoveRevealsAt?: (px: number, py: number, rad: number) => void;
  onAddPolygonReveal?: (poly: number[]) => void;
  onVisionConfigChange?: (next: any) => void;
}

/**
 * Thin, self-contained adapter that bridges MistWalker 3.0 state into @mistwalker/3d.
 * Keeps App.tsx and PlayerView.tsx free of 3D boilerplate.
 */
export const Mistwalker3DViewportHost: React.FC<Mistwalker3DViewportBridgeProps> = ({
  setTokens,
  setWalls,
  setScene3d,
  isDm,
  ...rest
}) => {
  const handleMoveToken = useCallback(
    (id: string, px: number, py: number) => {
      setTokens((prev) => prev.map((t) => (t.id === id ? { ...t, x: px, y: py } : t)));
    },
    [setTokens]
  );

  const handleRotateToken = useCallback(
    (id: string, rot: number) => {
      setTokens((prev) => prev.map((t) => (t.id === id ? { ...t, rotationY: rot } : t)));
    },
    [setTokens]
  );

  const handleToggleDoor = useCallback(
    (wallId: string) => {
      setWalls((prev) =>
        prev.map((w) => {
          if (w.id !== wallId) return w;
          if (!isDm && w.doorState === 'locked') return w;
          const nextOpen = w.doorState !== 'open';
          return {
            ...w,
            doorState: nextOpen ? 'open' : 'closed',
            blocksLight: !nextOpen,
            blocksSight: !nextOpen,
            blocksMovement: !nextOpen,
          };
        })
      );
    },
    [setWalls, isDm]
  );

  if (!isMistwalker3DEnabled) return null;

  return (
    <div className="flex-1 w-full h-full min-w-0">
      <Suspense
        fallback={
          <div className="w-full h-full flex items-center justify-center bg-zinc-950 text-zinc-400 text-sm font-mono">
            Loading MistWalker 3D Viewport…
          </div>
        }
      >
        <LazyDungeon3DViewport
          {...rest}
          isDm={isDm}
          onMoveToken={handleMoveToken}
          onRotateToken={handleRotateToken}
          onToggleDoor={handleToggleDoor}
          onWallsChange={isDm ? setWalls : undefined}
          onScene3DChange={setScene3d}
        />
      </Suspense>
    </div>
  );
};

/**
 * Standalone 3D Sandbox launcher (?dungeon3d=1) wired with MistWalker 3.0's Firestore campaign loader.
 */
export const Mistwalker3DSandboxHost: React.FC = () => {
  const loadCampaigns = useCallback(async () => {
    const { getCampaignsList } = await import('../../lib/firebase');
    return getCampaignsList();
  }, []);

  if (!isMistwalker3DEnabled) return null;

  return (
    <Suspense
      fallback={
        <div className="w-screen h-screen flex items-center justify-center bg-zinc-950 text-zinc-400 text-sm font-mono">
          Loading MistWalker 3D Sandbox…
        </div>
      }
    >
      <LazyDungeon3DSandbox loadCampaigns={loadCampaigns} apiBase="/api/3d" />
    </Suspense>
  );
};

/**
 * Compact 2D / 3D switcher pill. Renders nothing when 3D add-on is disabled.
 */
export const Mistwalker3DModeToggle: React.FC<{
  renderMode: '2d' | '3d';
  onRenderModeChange: (mode: '2d' | '3d') => void;
  compact?: boolean;
  className?: string;
}> = ({ renderMode, onRenderModeChange, compact = false, className = '' }) => {
  if (!isMistwalker3DEnabled) return null;

  return (
    <div
      className={`flex items-center p-0.5 rounded-xl bg-zinc-900/90 border border-zinc-700/80 backdrop-blur shadow-xl ${className}`}
    >
      <button
        type="button"
        onClick={() => onRenderModeChange('2d')}
        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
          renderMode === '2d'
            ? 'bg-sky-600 text-white shadow'
            : 'text-zinc-400 hover:text-zinc-200'
        }`}
      >
        2D
      </button>
      <button
        type="button"
        id="btn-viewport-3d"
        onClick={() => onRenderModeChange('3d')}
        title="MistWalker 3D Add-On Viewport"
        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all ${
          renderMode === '3d'
            ? 'bg-purple-600 text-white shadow'
            : 'text-zinc-400 hover:text-zinc-200'
        }`}
      >
        <Box className="w-3 h-3" />
        <span>{compact ? '3D' : '3D Tabletop'}</span>
      </button>
    </div>
  );
};
