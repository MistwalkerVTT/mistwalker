import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Users,
  Plus,
  Trash2,
  Copy,
  Move,
  Heart,
  Shield,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid,
  Check,
  X,
  Sparkles,
  ArrowDownToLine,
  Sliders
} from 'lucide-react';
import { SceneToken } from '../lib/firebase';
import { isMonsterToken } from '../types';

export const PRESET_MONSTERS = [
  { name: 'Cult Fanatic', avatarUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=150&q=80', hp: 33, ac: 13, size: 1 },
  { name: 'Skeleton Archer', avatarUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=150&q=80', hp: 13, ac: 13, size: 1 },
  { name: 'Bone Golem', avatarUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=150&q=80', hp: 133, ac: 16, size: 2 },
  { name: 'Goblin Skirmisher', avatarUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=150&q=80', hp: 7, ac: 15, size: 1 },
  { name: 'Young Red Dragon', avatarUrl: 'https://images.unsplash.com/photo-1577493340887-b7bdef550155?auto=format&fit=crop&w=150&q=80', hp: 178, ac: 18, size: 3 },
  { name: 'Zombie', avatarUrl: 'https://images.unsplash.com/photo-1564349683136-77e08dba1ef7?auto=format&fit=crop&w=150&q=80', hp: 22, ac: 8, size: 1 },
  { name: 'Mimic', avatarUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=150&q=80', hp: 58, ac: 12, size: 1 },
  { name: 'Bandit Captain', avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80', hp: 65, ac: 15, size: 1 },
];

export const PRESET_PARTY = [
  { name: 'Varrak', avatarUrl: 'https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/Varrak.png/:/rs=w:1440,h:1440', hp: 45, ac: 15, size: 1 },
  { name: 'Brannoc', avatarUrl: 'https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/Brannoc.png/:/rs=w:1440,h:1440', hp: 38, ac: 18, size: 1 },
  { name: 'Aziza', avatarUrl: 'https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/Aziza.png/:/rs=w:1440,h:1440', hp: 24, ac: 13, size: 1 },
  { name: 'Noctua', avatarUrl: 'https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/Noctua.png/:/rs=w:1440,h:1440', hp: 32, ac: 16, size: 1 },
  { name: 'Rowan', avatarUrl: 'https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/Rowan.png/:/rs=w:1440,h:1440', hp: 28, ac: 15, size: 1 },
  { name: 'Stavros', avatarUrl: 'https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/DwarfStavros.jpg/:/rs=w:1440,h:1440', hp: 35, ac: 17, size: 1 },
];

interface SceneTokenPlacementCanvasProps {
  mapUrl: string;
  tokens: SceneToken[];
  onUpdateTokens: (newTokens: SceneToken[]) => void;
  gridSize?: number;
  onUpdateGridSize?: (size: number) => void;
  onImportCanvasTokens?: () => void;
  hasCanvasTokens?: boolean;
}

export const SceneTokenPlacementCanvas: React.FC<SceneTokenPlacementCanvasProps> = ({
  mapUrl,
  tokens,
  onUpdateTokens,
  gridSize = 50,
  onUpdateGridSize,
  onImportCanvasTokens,
  hasCanvasTokens = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapImageRef = useRef<HTMLImageElement>(null);

  // Viewport scale & pan
  const [zoom, setZoom] = useState<number>(1);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);

  // Placement mode
  const [placingTemplate, setPlacingTemplate] = useState<{
    name: string;
    avatarUrl: string;
    hp: number;
    ac: number;
    size: number;
  } | null>(null);

  // Active tab in token palette
  const [tokenTab, setTokenTab] = useState<'monsters' | 'party' | 'custom'>('monsters');

  // Custom token form
  const [customName, setCustomName] = useState<string>('Goblin Shaman');
  const [customAvatar, setCustomAvatar] = useState<string>('https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=150&q=80');
  const [customHp, setCustomHp] = useState<number>(25);
  const [customAc, setCustomAc] = useState<number>(13);
  const [customSize, setCustomSize] = useState<number>(1);
  const [confirmClear, setConfirmClear] = useState<boolean>(false);

  // Dragging state
  const [draggingTokenId, setDraggingTokenId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Currently selected token object
  const selectedToken = tokens.find(t => t.id === selectedTokenId) || null;

  // Handle map click for token placement
  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mapImageRef.current || !containerRef.current) return;
    
    // Ignore if clicking on a token directly (prevent placing under existing token)
    if ((e.target as HTMLElement).closest('[data-token-id]')) {
      return;
    }

    if (placingTemplate) {
      const rect = mapImageRef.current.getBoundingClientRect();
      const clickX = (e.clientX - rect.left) / zoom;
      const clickY = (e.clientY - rect.top) / zoom;

      // Snap to grid
      const snappedX = Math.max(0, Math.floor(clickX / gridSize) * gridSize);
      const snappedY = Math.max(0, Math.floor(clickY / gridSize) * gridSize);

      const isMonster = isMonsterToken({ name: placingTemplate.name, category: (placingTemplate as any).category });
      const newToken: SceneToken = {
        id: `tok-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        name: placingTemplate.name,
        avatarUrl: placingTemplate.avatarUrl,
        x: snappedX,
        y: snappedY,
        hp: placingTemplate.hp,
        ac: placingTemplate.ac,
        size: placingTemplate.size || 1,
        isPlayer: !isMonster,
        isMonster: isMonster,
        category: isMonster ? 'monster' : 'character',
        visionEnabled: !isMonster,
        visionRadius: isMonster ? 0 : 60
      };

      onUpdateTokens([...tokens, newToken]);
      setSelectedTokenId(newToken.id);
    } else {
      setSelectedTokenId(null);
    }
  };

  // Drag start handler for placed token
  const handleTokenMouseDown = (e: React.MouseEvent, token: SceneToken) => {
    e.stopPropagation();
    setSelectedTokenId(token.id);

    if (!mapImageRef.current) return;
    const rect = mapImageRef.current.getBoundingClientRect();
    const tokenPixelX = token.x * zoom;
    const tokenPixelY = token.y * zoom;
    
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    setDragOffset({
      x: clickX - tokenPixelX,
      y: clickY - tokenPixelY
    });
    setDraggingTokenId(token.id);
  };

  const [localTokens, setLocalTokens] = useState<SceneToken[]>(tokens);
  
  // Sync localTokens with props
  useEffect(() => {
      if (!draggingTokenId) setLocalTokens(tokens);
  }, [tokens, draggingTokenId]);

  // Mouse move handler during drag
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!draggingTokenId || !mapImageRef.current) return;

    const rect = mapImageRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - dragOffset.x;
    const mouseY = e.clientY - rect.top - dragOffset.y;

    const unzoomedX = mouseX / zoom;
    const unzoomedY = mouseY / zoom;

    // Snap to grid
    const snappedX = Math.max(0, Math.round(unzoomedX / gridSize) * gridSize);
    const snappedY = Math.max(0, Math.round(unzoomedY / gridSize) * gridSize);
    
    setLocalTokens(prev => 
      prev.map(t => t.id === draggingTokenId ? { ...t, x: snappedX, y: snappedY } : t)
    );
  }, [draggingTokenId, dragOffset, zoom, gridSize]);

  // Mouse up handler
  const handleMouseUp = useCallback(() => {
    if (draggingTokenId) {
      onUpdateTokens(localTokens);
      setDraggingTokenId(null);
    }
  }, [draggingTokenId, localTokens, onUpdateTokens]);

  useEffect(() => {
    if (draggingTokenId) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggingTokenId, handleMouseMove, handleMouseUp]);

  // Token operations
  const handleUpdateSelectedToken = (updates: Partial<SceneToken>) => {
    if (!selectedTokenId) return;
    onUpdateTokens(
      tokens.map(t => t.id === selectedTokenId ? { ...t, ...updates } : t)
    );
  };

  const handleDeleteSelectedToken = () => {
    if (!selectedTokenId) return;
    onUpdateTokens(tokens.filter(t => t.id !== selectedTokenId));
    setSelectedTokenId(null);
  };

  const handleDuplicateSelectedToken = () => {
    if (!selectedToken) return;
    const copy: SceneToken = {
      ...selectedToken,
      id: `tok-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      name: `${selectedToken.name} (Copy)`,
      x: selectedToken.x + gridSize,
      y: selectedToken.y + gridSize
    };
    onUpdateTokens([...tokens, copy]);
    setSelectedTokenId(copy.id);
  };

  const handleClearAllTokens = () => {
    if (tokens.length === 0) return;
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3500);
      return;
    }
    setConfirmClear(false);
    onUpdateTokens([]);
    setSelectedTokenId(null);
  };

  return (
    <div className="space-y-4">
      {/* Placement Mode Status Banner */}
      {placingTemplate ? (
        <div className="p-3 bg-amber-500/20 border border-amber-500/40 rounded-xl flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-3">
            <img
              src={placingTemplate.avatarUrl}
              alt={placingTemplate.name}
              className="w-7 h-7 rounded-full border border-amber-400 object-cover"
            />
            <div>
              <div className="text-xs font-bold text-amber-300">
                Click anywhere on the map to place <span className="underline">{placingTemplate.name}</span>
              </div>
              <div className="text-[10px] text-amber-400/80 font-mono">
                HP: {placingTemplate.hp} | AC: {placingTemplate.ac} | Size: {placingTemplate.size}x{placingTemplate.size}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setPlacingTemplate(null)}
            className="px-2.5 py-1 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg text-xs font-mono flex items-center gap-1 transition-all"
          >
            <X className="w-3.5 h-3.5" />
            Done Placing
          </button>
        </div>
      ) : null}

      {/* Main Canvas Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-900/80 p-3 rounded-xl border border-zinc-800 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="text-zinc-400 font-bold flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-blue-400" />
            Tokens on Map ({tokens.length})
          </span>

          <div className="h-4 w-px bg-zinc-800 mx-1" />

          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-zinc-950 rounded-lg p-0.5 border border-zinc-800">
            <button
              type="button"
              onClick={() => setZoom(prev => Math.max(0.4, prev - 0.15))}
              className="p-1 hover:text-white text-zinc-400 transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] px-1 text-zinc-300 min-w-[36px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom(prev => Math.min(2.0, prev + 0.15))}
              className="p-1 hover:text-white text-zinc-400 transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoom(1)}
              className="px-1.5 py-0.5 text-[9px] text-zinc-500 hover:text-zinc-300 border-l border-zinc-800"
              title="Reset Zoom"
            >
              100%
            </button>
          </div>

          {/* Grid toggle */}
          <button
            type="button"
            onClick={() => setShowGrid(!showGrid)}
            className={`px-2.5 py-1 rounded-lg border text-[11px] flex items-center gap-1.5 transition-all ${
              showGrid
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            Grid ({gridSize}px)
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {hasCanvasTokens && onImportCanvasTokens && (
            <button
              type="button"
              onClick={onImportCanvasTokens}
              className="px-2.5 py-1 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all"
              title="Import all tokens currently arranged on the live VTT canvas into this scene"
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
              Import Live Canvas Tokens
            </button>
          )}

          {tokens.length > 0 && (
            <button
              type="button"
              onClick={handleClearAllTokens}
              className={`px-2.5 py-1 border rounded-lg text-xs transition-all ${
                confirmClear
                  ? 'bg-red-600 border-red-500 text-white font-bold animate-pulse'
                  : 'bg-red-500/10 hover:bg-red-500/20 border-red-500/30 text-red-400'
              }`}
            >
              {confirmClear ? 'Confirm Clear All?' : 'Clear Tokens'}
            </button>
          )}
        </div>
      </div>

      {/* Interactive Map Canvas Container */}
      <div
        ref={containerRef}
        onClick={handleMapClick}
        className={`relative w-full h-[420px] bg-zinc-950 rounded-2xl border border-zinc-800 overflow-auto sidebar-scrollbar select-none ${
          placingTemplate ? 'cursor-crosshair' : 'cursor-default'
        }`}
      >
        {mapUrl ? (
          <div
            className="relative inline-block"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
              transition: draggingTokenId ? 'none' : 'transform 0.1s ease-out'
            }}
          >
            {/* The Battlemap Image */}
            <img
              ref={mapImageRef}
              src={mapUrl}
              alt="Scene Battlemap"
              className="max-w-none block pointer-events-none"
              referrerPolicy="no-referrer"
              draggable={false}
            />

            {/* SVG Grid Overlay */}
            {showGrid && (
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <pattern
                    id="canvas-grid-pattern"
                    width={gridSize}
                    height={gridSize}
                    patternUnits="userSpaceOnUse"
                  >
                    <path
                      d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
                      fill="none"
                      stroke="rgba(255, 255, 255, 0.22)"
                      strokeWidth="1"
                    />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#canvas-grid-pattern)" />
              </svg>
            )}

            {/* Tokens Placed on Map */}
            {localTokens.map((token) => {
              const isSelected = token.id === selectedTokenId;
              const tokenSizePixels = (token.size || 1) * gridSize;

              return (
                <div
                  key={token.id}
                  data-token-id={token.id}
                  onMouseDown={(e) => handleTokenMouseDown(e, token)}
                  className={`absolute cursor-move transition-shadow z-20 group ${
                    isSelected ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-zinc-950' : ''
                  }`}
                  style={{
                    left: `${token.x}px`,
                    top: `${token.y}px`,
                    width: `${tokenSizePixels}px`,
                    height: `${tokenSizePixels}px`,
                  }}
                >
                  {/* Token Avatar Circle */}
                  <div className="relative w-full h-full rounded-full overflow-hidden shadow-lg border-2 border-zinc-200 bg-zinc-900 group-hover:border-amber-400">
                    <img
                      src={token.avatarUrl || 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=150&q=80'}
                      alt={token.name}
                      className="w-full h-full object-cover pointer-events-none"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  {/* Token Name & Stats Floating Tag */}
                  <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap px-1.5 py-0.5 rounded bg-zinc-950/90 border border-zinc-700 text-[10px] font-mono text-zinc-200 shadow flex items-center gap-1.5 pointer-events-none">
                    <span className="font-bold truncate max-w-[90px]">{token.name}</span>
                    {token.hp !== undefined && (
                      <span className="text-red-400 font-bold flex items-center gap-0.5">
                        <Heart className="w-2.5 h-2.5 fill-red-400" /> {token.hp}
                      </span>
                    )}
                    {token.ac !== undefined && (
                      <span className="text-blue-400 flex items-center gap-0.5">
                        <Shield className="w-2.5 h-2.5" /> {token.ac}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 p-8 text-center">
            <p className="text-sm font-bold font-mono text-zinc-400 mb-1">No Map Loaded</p>
            <p className="text-xs text-zinc-600 max-w-sm">
              Select a battlemap from presets above, upload a battlemap, or enter a map URL to start placing tokens.
            </p>
          </div>
        )}
      </div>

      {/* Selected Token Inspector Card */}
      {selectedToken && (
        <div className="p-4 bg-zinc-900/90 border border-amber-500/40 rounded-xl space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img
                src={selectedToken.avatarUrl}
                alt={selectedToken.name}
                className="w-7 h-7 rounded-full border border-amber-400 object-cover"
              />
              <span className="text-xs font-bold font-mono text-amber-300">
                Editing Placed Token: {selectedToken.name}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDuplicateSelectedToken}
                className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-mono flex items-center gap-1"
                title="Duplicate Token"
              >
                <Copy className="w-3 h-3" /> Duplicate
              </button>
              <button
                type="button"
                onClick={handleDeleteSelectedToken}
                className="px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-xs font-mono flex items-center gap-1"
                title="Remove from Scene"
              >
                <Trash2 className="w-3 h-3" /> Delete
              </button>
              <button
                type="button"
                onClick={() => setSelectedTokenId(null)}
                className="p-1 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div>
              <label className="text-[10px] text-zinc-400 block mb-1">Name</label>
              <input
                type="text"
                value={selectedToken.name}
                onChange={(e) => handleUpdateSelectedToken({ name: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-[10px] text-zinc-400 block mb-1">Hit Points (HP)</label>
              <input
                type="number"
                value={selectedToken.hp ?? ''}
                onChange={(e) => handleUpdateSelectedToken({ hp: parseInt(e.target.value) || 0 })}
                className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-[10px] text-zinc-400 block mb-1">Armor Class (AC)</label>
              <input
                type="number"
                value={selectedToken.ac ?? ''}
                onChange={(e) => handleUpdateSelectedToken({ ac: parseInt(e.target.value) || 0 })}
                className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-[10px] text-zinc-400 block mb-1">Grid Size (1x1, 2x2, 3x3)</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => handleUpdateSelectedToken({ size: sz })}
                    className={`flex-1 py-1.5 rounded-lg border text-center font-bold ${
                      (selectedToken.size || 1) === sz
                        ? 'bg-amber-500 text-zinc-950 border-amber-400'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {sz}x{sz}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Token Placement Palette / Tray */}
      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-bold font-mono text-zinc-200">
              Place Tokens onto Battlemap
            </h4>
          </div>

          {/* Palette Tabs */}
          <div className="flex items-center gap-1 bg-zinc-950 p-0.5 rounded-xl border border-zinc-800 text-xs font-mono">
            <button
              type="button"
              onClick={() => setTokenTab('monsters')}
              className={`px-3 py-1 rounded-lg transition-all ${
                tokenTab === 'monsters'
                  ? 'bg-amber-500 text-zinc-950 font-bold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Monsters & NPCs
            </button>
            <button
              type="button"
              onClick={() => setTokenTab('party')}
              className={`px-3 py-1 rounded-lg transition-all ${
                tokenTab === 'party'
                  ? 'bg-blue-500 text-white font-bold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Party Heroes
            </button>
            <button
              type="button"
              onClick={() => setTokenTab('custom')}
              className={`px-3 py-1 rounded-lg transition-all ${
                tokenTab === 'custom'
                  ? 'bg-emerald-500 text-zinc-950 font-bold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Custom Token
            </button>
          </div>
        </div>

        {/* Tab 1: Monsters */}
        {tokenTab === 'monsters' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {PRESET_MONSTERS.map((mon) => {
              const isPlacingThis = placingTemplate?.name === mon.name;
              return (
                <button
                  key={mon.name}
                  type="button"
                  onClick={() => setPlacingTemplate(isPlacingThis ? null : mon)}
                  className={`p-2 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                    isPlacingThis
                      ? 'bg-amber-500/20 border-amber-400 ring-2 ring-amber-400/40'
                      : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/60'
                  }`}
                >
                  <img
                    src={mon.avatarUrl}
                    alt={mon.name}
                    className="w-9 h-9 rounded-full object-cover border border-zinc-700 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-zinc-200 truncate">{mon.name}</div>
                    <div className="text-[10px] font-mono text-zinc-400">
                      {mon.hp} HP • {mon.ac} AC • {mon.size}x{mon.size}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Tab 2: Party Heroes */}
        {tokenTab === 'party' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {PRESET_PARTY.map((hero) => {
              const isPlacingThis = placingTemplate?.name === hero.name;
              return (
                <button
                  key={hero.name}
                  type="button"
                  onClick={() => setPlacingTemplate(isPlacingThis ? null : hero)}
                  className={`p-2 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                    isPlacingThis
                      ? 'bg-blue-500/20 border-blue-400 ring-2 ring-blue-400/40'
                      : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/60'
                  }`}
                >
                  <img
                    src={hero.avatarUrl}
                    alt={hero.name}
                    className="w-9 h-9 rounded-full object-cover border border-zinc-700 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-zinc-200 truncate">{hero.name}</div>
                    <div className="text-[10px] font-mono text-zinc-400">
                      {hero.hp} HP • {hero.ac} AC
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Tab 3: Custom Token Creator */}
        {tokenTab === 'custom' && (
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
            <div>
              <label className="text-[10px] font-mono text-zinc-400 block mb-1">Name</label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-[10px] font-mono text-zinc-400 block mb-1">Avatar Image URL</label>
              <input
                type="text"
                value={customAvatar}
                onChange={(e) => setCustomAvatar(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[10px] font-mono text-zinc-400 block mb-1">HP</label>
                <input
                  type="number"
                  value={customHp}
                  onChange={(e) => setCustomHp(parseInt(e.target.value) || 0)}
                  className="w-full px-2 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white"
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] font-mono text-zinc-400 block mb-1">AC</label>
                <input
                  type="number"
                  value={customAc}
                  onChange={(e) => setCustomAc(parseInt(e.target.value) || 0)}
                  className="w-full px-2 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setPlacingTemplate({
                  name: customName,
                  avatarUrl: customAvatar,
                  hp: customHp,
                  ac: customAc,
                  size: customSize
                });
              }}
              className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              Place Custom
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
