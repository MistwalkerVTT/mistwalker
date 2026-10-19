// src/effects/ui/CompendiumCustomFxModal.tsx
// Modal enabling DMs to attach custom WebM or image files to spells not in JB2A

import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Link,
  Sparkles,
  Play,
  Check,
  Film,
  Trash2,
  Info
} from 'lucide-react';
import { CustomSpellOverride, EffectParadigm, BlendMode } from '../types/effect';
import { JB2A_REGISTRY, findJb2aAsset } from '../db/jb2aRegistry';
import { synthesizeElementalTemplate } from '../db/templateFallbackMatrix';

interface CompendiumCustomFxModalProps {
  isOpen: boolean;
  onClose: () => void;
  spellName: string;
  spellId: string;
  campaignId: string;
  onSaveOverride: (override: CustomSpellOverride) => Promise<void>;
  currentOverride?: CustomSpellOverride | null;
}

export const CompendiumCustomFxModal: React.FC<CompendiumCustomFxModalProps> = ({
  isOpen,
  onClose,
  spellName,
  spellId,
  campaignId,
  onSaveOverride,
  currentOverride
}) => {
  const [sourceType, setSourceType] = useState<'upload' | 'url'>('upload');
  const [videoUrl, setVideoUrl] = useState(currentOverride?.videoUrl || '');
  const [imageUrl, setImageUrl] = useState(currentOverride?.imageUrl || '');
  const [paradigm, setParadigm] = useState<EffectParadigm>(currentOverride?.paradigm || 'point');
  const [defaultSizeFt, setDefaultSizeFt] = useState<number>(currentOverride?.defaultSizeFt || 20);
  const [blendMode, setBlendMode] = useState<BlendMode>(currentOverride?.blendMode || 'screen');
  const [isPersistent, setIsPersistent] = useState<boolean>(currentOverride?.isPersistent || false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewError, setPreviewError] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Resolve current active default if no custom override
  const defaultJb2a = findJb2aAsset(spellName) || synthesizeElementalTemplate({ spellName, shape: 'circle' });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    if (file.type.includes('video') || file.name.endsWith('.webm') || file.name.endsWith('.mp4')) {
      setVideoUrl(objectUrl);
      setImageUrl('');
    } else {
      setImageUrl(objectUrl);
      setVideoUrl('');
    }
    setPreviewError(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const override: CustomSpellOverride = {
        spellId,
        campaignId,
        name: spellName,
        videoUrl: videoUrl || undefined,
        imageUrl: imageUrl || undefined,
        paradigm,
        defaultSizeFt,
        blendMode,
        isPersistent,
        updatedAt: Date.now(),
        source: sourceType
      };
      await onSaveOverride(override);
      onClose();
    } catch (err) {
      console.error('Failed to save custom effect override:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-5 text-zinc-200 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <div>
              <h2 className="text-sm font-bold text-zinc-100">Attach Custom Spell FX</h2>
              <p className="text-xs text-zinc-400">{spellName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current State Info */}
        <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs flex items-center justify-between">
          <div>
            <span className="text-zinc-400">Current Default FX:</span>{' '}
            <span className="font-bold text-purple-300">{defaultJb2a.name}</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
            {defaultJb2a.shape} • {defaultJb2a.defaultSizeFt}ft
          </span>
        </div>

        {/* Source Switcher */}
        <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800 gap-1 text-xs font-mono font-bold">
          <button
            type="button"
            onClick={() => setSourceType('upload')}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              sourceType === 'upload' ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload File</span>
          </button>
          <button
            type="button"
            onClick={() => setSourceType('url')}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              sourceType === 'url' ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Link className="w-3.5 h-3.5" />
            <span>External URL</span>
          </button>
        </div>

        {/* Source Inputs */}
        {sourceType === 'upload' ? (
          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="video/webm,video/mp4,image/gif,image/webp,image/png"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-4 border-2 border-dashed border-zinc-700 hover:border-purple-500 rounded-xl flex flex-col items-center justify-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-900/40 hover:bg-zinc-900/70 transition-all cursor-pointer"
            >
              <Film className="w-6 h-6 text-purple-400" />
              <span>Click to select WebM (transparent alpha), GIF, or WebP</span>
              {(videoUrl || imageUrl) && (
                <span className="text-emerald-400 font-mono text-[10px]">✓ Asset loaded</span>
              )}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
              WebM or Image URL
            </label>
            <input
              type="url"
              value={videoUrl || imageUrl}
              onChange={e => {
                const val = e.target.value;
                if (val.endsWith('.webm') || val.endsWith('.mp4')) {
                  setVideoUrl(val);
                  setImageUrl('');
                } else {
                  setImageUrl(val);
                  setVideoUrl('');
                }
              }}
              placeholder="https://cdn.example.com/spells/custom_blast.webm"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-purple-500 font-mono"
            />
          </div>
        )}

        {/* Effect Parameters */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block mb-1">
              Template Shape
            </label>
            <select
              value={paradigm}
              onChange={e => setParadigm(e.target.value as EffectParadigm)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-purple-500 font-mono"
            >
              <option value="point">Point / Circle</option>
              <option value="cone">Cone</option>
              <option value="line">Line</option>
              <option value="projectile">Projectile / Ray</option>
              <option value="aura">Attached Token Aura</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block mb-1">
              Size (ft)
            </label>
            <select
              value={defaultSizeFt}
              onChange={e => setDefaultSizeFt(Number(e.target.value))}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-purple-500 font-mono"
            >
              <option value={5}>5 ft (1 sq)</option>
              <option value={10}>10 ft (2 sq)</option>
              <option value={15}>15 ft (3 sq)</option>
              <option value={20}>20 ft (4 sq)</option>
              <option value={30}>30 ft (6 sq)</option>
              <option value={60}>60 ft (12 sq)</option>
            </select>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex gap-2 pt-2 border-t border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-400 text-xs font-bold transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || (!videoUrl && !imageUrl)}
            className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save & Attach FX'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
