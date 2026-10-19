import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Trash2,
  Maximize2,
  Flame,
  Waves,
  Sparkles,
  Wind,
  Droplets,
  Shield,
  Sun,
  Moon,
  Zap,
  Minus,
  Plus,
  GripVertical,
  Copy,
  Layers,
  Eye
} from 'lucide-react';
import { AnimatedFeature } from '../types';
import { WATER_POLYGON_PRESETS, LAVA_POLYGON_PRESETS } from './AnimatedMapOverlay';

export type ContextMenuData = { type: 'feature'; feature: AnimatedFeature };

interface EffectContextMenuProps {
  data: ContextMenuData | null;
  position: { x: number; y: number } | null;
  onClose: () => void;
  onUpdateFeature?: (updated: AnimatedFeature) => void;
  onDeleteFeature?: (id: string) => void;
  onDuplicateFeature?: (feature: AnimatedFeature) => void;
  onStartStampingFeature?: (feature: AnimatedFeature) => void;
  gridSize?: number;
}

export const EffectContextMenu: React.FC<EffectContextMenuProps> = ({
  data,
  position,
  onClose,
  onUpdateFeature,
  onDeleteFeature,
  onDuplicateFeature,
  onStartStampingFeature,
  gridSize = 50
}) => {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; menuX: number; menuY: number }>({
    mouseX: 0,
    mouseY: 0,
    menuX: 0,
    menuY: 0
  });

  // Clamped position inside viewport
  useEffect(() => {
    if (!position) return;
    const menuWidth = 280;
    const menuHeight = 440;
    const padding = 12;
    const clampedX = Math.min(Math.max(padding, position.x), Math.max(padding, window.innerWidth - menuWidth - padding));
    const clampedY = Math.min(Math.max(padding, position.y), Math.max(padding, window.innerHeight - menuHeight - padding));
    setMenuPos({ x: clampedX, y: clampedY });
  }, [position?.x, position?.y]);

  const handleDragStart = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    isDraggingRef.current = true;
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      menuX: menuPos.x,
      menuY: menuPos.y
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (!isDraggingRef.current) return;
      const dx = moveEvent.clientX - dragStartRef.current.mouseX;
      const dy = moveEvent.clientY - dragStartRef.current.mouseY;
      const menuWidth = 280;
      const menuHeight = 440;
      const padding = 8;
      const newX = Math.min(Math.max(padding, dragStartRef.current.menuX + dx), window.innerWidth - menuWidth - padding);
      const newY = Math.min(Math.max(padding, dragStartRef.current.menuY + dy), window.innerHeight - menuHeight - padding);
      setMenuPos({ x: newX, y: newY });
    };

    const handlePointerUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  if (!data || !position) return null;

  const label = data.feature.type;
  const lowerLabel = label.toLowerCase();

  let Icon = Sparkles;
  let accentColor = 'text-cyan-400';
  let borderColor = 'border-cyan-500/40';

  if (lowerLabel.includes('fire') || lowerLabel.includes('lava')) {
    Icon = Flame;
    accentColor = 'text-orange-400';
    borderColor = 'border-orange-500/40';
  } else if (lowerLabel.includes('water') || lowerLabel.includes('river')) {
    Icon = Waves;
    accentColor = 'text-cyan-400';
    borderColor = 'border-cyan-500/40';
  } else if (lowerLabel.includes('torch')) {
    Icon = Flame;
    accentColor = 'text-amber-300';
    borderColor = 'border-amber-400/50';
  } else if (lowerLabel.includes('fog')) {
    Icon = Wind;
    accentColor = 'text-slate-300';
    borderColor = 'border-slate-500/40';
  } else if (lowerLabel.includes('poison') || lowerLabel.includes('toxic')) {
    Icon = Droplets;
    accentColor = 'text-lime-400';
    borderColor = 'border-lime-500/40';
  } else if (lowerLabel.includes('arcane')) {
    Icon = Zap;
    accentColor = 'text-purple-400';
    borderColor = 'border-purple-500/40';
  }

  const currentRadius = Math.round(data.feature.radius);
  const currentOpacity = Math.round((data.feature.opacity !== undefined ? data.feature.opacity : 1.0) * 100);

  const handleFeatureRadiusChange = (newRadius: number) => {
    if (!onUpdateFeature) return;
    const clamped = Math.max(4, Math.min(50, newRadius));
    onUpdateFeature({
      ...data.feature,
      radius: clamped
    });
  };

  const handleOpacityChange = (pct: number) => {
    const clamped = Math.max(10, Math.min(100, pct));
    const val = clamped / 100;
    if (onUpdateFeature) {
      onUpdateFeature({
        ...data.feature,
        opacity: val
      });
    }
  };

  return (
    <div
      ref={menuRef}
      style={{ left: `${menuPos.x}px`, top: `${menuPos.y}px` }}
      className={`fixed z-[999] w-[280px] max-h-[85vh] overflow-y-auto bg-zinc-950/95 border ${borderColor} rounded-2xl shadow-[0_0_35px_rgba(0,0,0,0.9)] backdrop-blur-xl p-3.5 flex flex-col gap-3 font-sans animate-in fade-in zoom-in-95 duration-150 select-none text-zinc-100`}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Draggable Header */}
      <div 
        onPointerDown={handleDragStart}
        className="flex items-center justify-between pb-2 border-b border-zinc-800/80 cursor-grab active:cursor-grabbing select-none group/hdr"
        title="Click and drag to move menu"
      >
        <div className="flex items-center gap-2 min-w-0 pointer-events-none">
          <GripVertical className="w-3.5 h-3.5 text-zinc-500 group-hover/hdr:text-zinc-300 transition-colors shrink-0" />
          <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-700/60 flex items-center justify-center shrink-0">
            <Icon className={`w-4 h-4 ${accentColor}`} />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold truncate text-zinc-100 capitalize">{label} Feature</h4>
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">
              {currentRadius}% Map Radius
            </span>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="p-1 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors shrink-0 cursor-pointer"
          title="Close menu"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Size / Scale Section */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-[11px] font-mono">
          <span className="text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 font-bold">
            <Maximize2 className="w-3 h-3 text-cyan-400" />
            Size / Radius
          </span>
          <span className="font-bold text-cyan-300">
            {currentRadius}%
          </span>
        </div>

        {/* Range Slider with +/- Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleFeatureRadiusChange(currentRadius - 2)}
            className="w-6 h-6 rounded bg-zinc-900 border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800 flex items-center justify-center text-zinc-300 hover:text-white transition-colors shrink-0 cursor-pointer"
            title="Decrease size"
          >
            <Minus className="w-3 h-3" />
          </button>

          <input
            type="range"
            min={4}
            max={45}
            step={1}
            value={currentRadius}
            onChange={(e) => handleFeatureRadiusChange(parseInt(e.target.value, 10))}
            className="flex-1 accent-cyan-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
          />

          <button
            onClick={() => handleFeatureRadiusChange(currentRadius + 2)}
            className="w-6 h-6 rounded bg-zinc-900 border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800 flex items-center justify-center text-zinc-300 hover:text-white transition-colors shrink-0 cursor-pointer"
            title="Increase size"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        {/* Quick Presets Pills */}
        <div className="grid grid-cols-4 gap-1 pt-1">
          {[8, 14, 20, 30].map((pct) => (
            <button
              key={pct}
              onClick={() => handleFeatureRadiusChange(pct)}
              className={`py-1 rounded text-[10px] font-mono font-bold transition-all border cursor-pointer ${
                currentRadius === pct
                  ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200'
                  : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
              }`}
            >
              {pct}%
            </button>
          ))}
        </div>
      </div>

      {/* Feature Extra Controls (Intensity, Speed) */}
      <div className="flex flex-col gap-2 pt-2 border-t border-zinc-850">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
            <span>Intensity</span>
            <span>{Math.round((data.feature.intensity || 1) * 100)}%</span>
          </div>
          <input
            type="range"
            min={0.3}
            max={2.0}
            step={0.1}
            value={data.feature.intensity || 1}
            onChange={(e) => {
              if (onUpdateFeature) {
                onUpdateFeature({
                  ...data.feature,
                  intensity: parseFloat(e.target.value)
                });
              }
            }}
            className="w-full accent-cyan-400 h-1 bg-zinc-800 rounded cursor-pointer"
          />
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
            <span>Animation Speed</span>
            <span>{((data.feature.speed ?? 1.0) * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min={0.2}
            max={2.5}
            step={0.1}
            value={data.feature.speed ?? 1.0}
            onChange={(e) => {
              if (onUpdateFeature) {
                onUpdateFeature({
                  ...data.feature,
                  speed: parseFloat(e.target.value)
                });
              }
            }}
            className="w-full accent-cyan-400 h-1 bg-zinc-800 rounded cursor-pointer"
          />
        </div>
      </div>

      {/* Opacity Control */}
      <div className="flex flex-col gap-1.5 pt-2 border-t border-zinc-850">
        <div className="flex items-center justify-between text-[11px] font-mono text-zinc-300">
          <div className="flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-cyan-400" />
            <span>Opacity</span>
          </div>
          <span className="font-bold text-cyan-300">{currentOpacity}%</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpacityChange(currentOpacity - 10)}
            className="w-6 h-6 rounded bg-zinc-900 border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800 flex items-center justify-center text-zinc-300 hover:text-white transition-colors shrink-0 cursor-pointer"
            title="Decrease opacity"
          >
            <Minus className="w-3 h-3" />
          </button>

          <input
            type="range"
            min={10}
            max={100}
            step={5}
            value={currentOpacity}
            onChange={(e) => handleOpacityChange(parseInt(e.target.value, 10))}
            className="flex-1 accent-cyan-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
          />

          <button
            onClick={() => handleOpacityChange(currentOpacity + 10)}
            className="w-6 h-6 rounded bg-zinc-900 border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800 flex items-center justify-center text-zinc-300 hover:text-white transition-colors shrink-0 cursor-pointer"
            title="Increase opacity"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-1 pt-0.5">
          {[25, 50, 75, 100].map((opVal) => (
            <button
              key={opVal}
              onClick={() => handleOpacityChange(opVal)}
              className={`py-1 rounded text-[10px] font-mono font-bold transition-all border cursor-pointer ${
                currentOpacity === opVal
                  ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200'
                  : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
              }`}
            >
              {opVal}%
            </button>
          ))}
        </div>
      </div>

      {/* Corridor Shape Presets for Water & Lava */}
      {(data.feature.type === 'water' || data.feature.type === 'lava') && (
        <div className="flex flex-col gap-1.5 pt-2 border-t border-zinc-850">
          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-300">
            <span>Shape Preset</span>
            <span className="text-[10px] text-zinc-400 capitalize">
              {data.feature.shapePreset
                ? data.feature.shapePreset.replace('_', ' ')
                : 'Default'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {data.feature.type === 'water'
              ? Object.entries(WATER_POLYGON_PRESETS).map(([key, preset]) => {
                  const isActive = data.feature.shapePreset === key || (!data.feature.shapePreset && key === 'winding_river');
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        if (onUpdateFeature) {
                          onUpdateFeature({
                            ...data.feature,
                            shapePreset: key,
                            polygonPoints: [...preset.points]
                          });
                        }
                      }}
                      className={`py-1 px-2 rounded-lg text-[10px] font-mono font-semibold transition-all border text-left truncate cursor-pointer ${
                        isActive
                          ? 'bg-cyan-950 border-cyan-400 text-cyan-200'
                          : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })
              : Object.entries(LAVA_POLYGON_PRESETS).map(([key, preset]) => {
                  const isActive = data.feature.shapePreset === key || (!data.feature.shapePreset && key === 'volcanic_chasm');
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        if (onUpdateFeature) {
                          onUpdateFeature({
                            ...data.feature,
                            shapePreset: key,
                            polygonPoints: [...preset.points]
                          });
                        }
                      }}
                      className={`py-1 px-2 rounded-lg text-[10px] font-mono font-semibold transition-all border text-left truncate cursor-pointer ${
                        isActive
                          ? 'bg-amber-950 border-amber-400 text-amber-200'
                          : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
          </div>
        </div>
      )}

      {/* Action Buttons: Duplicate, Stamp Multiples, Dismiss */}
      <div className="pt-2 border-t border-zinc-850 flex flex-col gap-1.5">
        <div className="grid grid-cols-2 gap-1.5">
          {onDuplicateFeature && (
            <button
              type="button"
              onClick={() => {
                onDuplicateFeature(data.feature);
              }}
              className="py-1.5 px-2 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-800/60 hover:border-cyan-400 text-cyan-300 hover:text-white text-[11px] font-bold font-mono transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
              title="Duplicate this modified feature"
            >
              <Copy className="w-3.5 h-3.5 text-cyan-400" />
              <span>Duplicate</span>
            </button>
          )}

          {onStartStampingFeature && (
            <button
              type="button"
              onClick={() => {
                onStartStampingFeature(data.feature);
                onClose();
              }}
              className="py-1.5 px-2 rounded-xl bg-amber-950/60 hover:bg-amber-900/80 border border-amber-800/60 hover:border-amber-400 text-amber-300 hover:text-white text-[11px] font-bold font-mono transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
              title="Click on the map to place multiple copies of this modified feature"
            >
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>Stamp More</span>
            </button>
          )}
        </div>

        {/* Delete / Dismiss Button */}
        {onDeleteFeature && (
          <button
            type="button"
            onClick={() => {
              onDeleteFeature(data.feature.id);
              onClose();
            }}
            className="w-full py-1.5 px-3 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-900/60 hover:border-red-500 text-red-400 hover:text-red-200 text-xs font-bold font-mono transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Remove Feature</span>
          </button>
        )}
      </div>
    </div>
  );
};
