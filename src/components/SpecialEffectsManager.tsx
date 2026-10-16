import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Upload,
  Wand2,
  Cloud,
  Check,
  Trash2,
  RefreshCw,
  Plus,
  Crosshair,
  Layers,
  Flame,
  Droplets,
  Wind,
  Skull,
  Eye,
  Zap,
  Info,
  Loader2,
  Sliders
} from 'lucide-react';
import { CustomSpecialEffect } from '../types';
import {
  uploadSpecialEffectImage,
  saveSpecialEffectToFirestore,
  fetchSpecialEffectsFromFirestore,
  deleteSpecialEffectFromFirestore
} from '../lib/firebase';
import { generateEffectImage } from '../services/aiService';
import { toast } from 'sonner';

interface SpecialEffectsManagerProps {
  onEquipEffect?: (effect: CustomSpecialEffect) => void;
  onQuickPlaceEffect?: (effect: CustomSpecialEffect) => void;
  activeEquippedEffectId?: string | null;
  gridSize?: number;
}

interface PresetTemplate {
  name: string;
  shape: 'circle' | 'cone' | 'line';
  defaultSize: number;
  color: string;
  blendMode: 'screen' | 'lighter' | 'normal';
  style: string;
  icon: any;
  defaultPrompt: string;
}

const PRESET_TEMPLATES: PresetTemplate[] = [
  {
    name: 'Fireball',
    shape: 'circle',
    defaultSize: 20,
    color: 'rgba(239, 68, 68, 0.4)',
    blendMode: 'lighter',
    style: 'Explosive fiery magma blast',
    icon: Flame,
    defaultPrompt: 'Violent fiery explosion, roaring flame vortex, molten embers and searing orange blast'
  },
  {
    name: 'Spirit Guardians',
    shape: 'circle',
    defaultSize: 15,
    color: 'rgba(250, 204, 21, 0.4)',
    blendMode: 'screen',
    style: 'Luminous celestial guardians',
    icon: Sparkles,
    defaultPrompt: 'Swirling luminous celestial spirits, golden ethereal radiant aura, glowing holy runes'
  },
  {
    name: 'Darkness',
    shape: 'circle',
    defaultSize: 15,
    color: 'rgba(24, 24, 27, 0.8)',
    blendMode: 'normal',
    style: 'Deep void shadow dome',
    icon: Skull,
    defaultPrompt: 'Pitch-black shadowy void, swirling obsidian dark energy, shadowy ethereal tendrils'
  },
  {
    name: 'Poison Cloud',
    shape: 'circle',
    defaultSize: 20,
    color: 'rgba(34, 197, 94, 0.4)',
    blendMode: 'screen',
    style: 'Toxic noxious haze',
    icon: Skull,
    defaultPrompt: 'Dense noxious toxic green gas, swirling venomous vapor, glowing radioactive particles'
  },
  {
    name: 'Fog Cloud',
    shape: 'circle',
    defaultSize: 20,
    color: 'rgba(203, 213, 225, 0.5)',
    blendMode: 'screen',
    style: 'Dense rolling mist',
    icon: Wind,
    defaultPrompt: 'Dense thick swirling white fog, rolling misty cloud, atmospheric vapors'
  },
  {
    name: 'Lightning Strike',
    shape: 'line',
    defaultSize: 60,
    color: 'rgba(59, 130, 246, 0.4)',
    blendMode: 'lighter',
    style: 'Surging electric beam',
    icon: Zap,
    defaultPrompt: 'Fierce crackling electric lightning beam, azure blue plasma arc, sparking electric discharge'
  },
  {
    name: 'Dragon Breath',
    shape: 'cone',
    defaultSize: 30,
    color: 'rgba(249, 115, 22, 0.4)',
    blendMode: 'lighter',
    style: 'Flaming conical jet',
    icon: Flame,
    defaultPrompt: 'Conical blast of dragon flame, billowing fiery jet, spreading sparks and blazing inferno'
  },
  {
    name: 'Arcane Portal',
    shape: 'circle',
    defaultSize: 10,
    color: 'rgba(168, 85, 247, 0.4)',
    blendMode: 'screen',
    style: 'Dimensional rift',
    icon: Eye,
    defaultPrompt: 'Swirling cosmic gateway, purple astral vortex, glowing mystic runes and starlight'
  }
];

export const SpecialEffectsManager: React.FC<SpecialEffectsManagerProps> = ({
  onEquipEffect,
  onQuickPlaceEffect,
  activeEquippedEffectId,
  gridSize = 50
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'library'>('create');
  const [savedEffects, setSavedEffects] = useState<CustomSpecialEffect[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);

  // Form State
  const [effectName, setEffectName] = useState('Fireball');
  const [shape, setShape] = useState<'circle' | 'cone' | 'line'>('circle');
  const [defaultSize, setDefaultSize] = useState<number>(20); // in feet
  const [color, setColor] = useState('rgba(239, 68, 68, 0.4)');
  const [isPersistent, setIsPersistent] = useState(true);
  const [blendMode, setBlendMode] = useState<'screen' | 'lighter' | 'normal'>('screen');
  const [customPrompt, setCustomPrompt] = useState(PRESET_TEMPLATES[0].defaultPrompt);
  const [styleTag, setStyleTag] = useState(PRESET_TEMPLATES[0].style);

  // Image State
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageSource, setImageSource] = useState<'upload' | 'gemini' | 'preset'>('preset');

  // Operation States
  const [isRenderingAI, setIsRenderingAI] = useState(false);
  const [isSavingFirebase, setIsSavingFirebase] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load saved effects from Firebase on mount
  const loadLibrary = async () => {
    setIsLoadingLibrary(true);
    try {
      const items = await fetchSpecialEffectsFromFirestore();
      setSavedEffects(items);
    } catch (e) {
      console.error('Error fetching custom special effects:', e);
    } finally {
      setIsLoadingLibrary(false);
    }
  };

  useEffect(() => {
    loadLibrary();
  }, []);

  // Preset Selection Handler
  const handleSelectPreset = (preset: PresetTemplate) => {
    setEffectName(preset.name);
    setShape(preset.shape);
    setDefaultSize(preset.defaultSize);
    setColor(preset.color);
    setBlendMode(preset.blendMode);
    setStyleTag(preset.style);
    setCustomPrompt(preset.defaultPrompt);
  };

  // File Upload Handler (User uploaded file)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, GIF, WebP, JPG).');
      return;
    }

    setImageFile(file);
    setImageSource('upload');

    // Create object URL for instant preview
    const objectUrl = URL.createObjectURL(file);
    setImageUrl(objectUrl);
    toast.success(`Loaded "${file.name}"! Click "Save to Firebase" to store.`);
  };

  // Gemini AI Render Handler
  const handleRenderWithGemini = async () => {
    if (!effectName.trim()) {
      toast.error('Please enter an effect name first.');
      return;
    }

    setIsRenderingAI(true);
    try {
      toast.info(`Rendering ${effectName} through Gemini AI...`);
      const res = await generateEffectImage({
        effectName,
        shape,
        style: styleTag,
        color,
        prompt: customPrompt
      });

      if (res.imageUrl) {
        setImageUrl(res.imageUrl);
        setImageFile(null);
        setImageSource('gemini');
        toast.success(`Successfully rendered ${effectName} with Gemini!`);
      } else {
        toast.error('No image returned from Gemini.');
      }
    } catch (err: any) {
      console.error('Gemini effect render error:', err);
      toast.error(err.message || 'Failed to render effect through Gemini.');
    } finally {
      setIsRenderingAI(false);
    }
  };

  // Save to Firebase Handler
  const handleSaveToFirebase = async () => {
    if (!effectName.trim()) {
      toast.error('Please provide an effect name.');
      return;
    }

    if (!imageUrl) {
      toast.error('Please upload an image or render one with Gemini before saving.');
      return;
    }

    setIsSavingFirebase(true);
    try {
      let finalHostedUrl = imageUrl;

      // If user uploaded a local file or has a base64 / blob URL, upload to Firebase Storage
      if (imageFile) {
        toast.info('Uploading asset to Firebase Storage...');
        finalHostedUrl = await uploadSpecialEffectImage(imageFile, effectName);
      } else if (imageUrl.startsWith('data:') || imageUrl.startsWith('blob:')) {
        toast.info('Uploading Gemini render to Firebase Storage...');
        const resp = await fetch(imageUrl);
        const blob = await resp.blob();
        finalHostedUrl = await uploadSpecialEffectImage(blob, effectName);
      }

      const effectId = `fx_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const newEffect: CustomSpecialEffect = {
        id: effectId,
        name: effectName.trim(),
        category: 'custom',
        shape,
        defaultSize,
        color,
        imageUrl: finalHostedUrl,
        thumbnailUrl: finalHostedUrl,
        isPersistent,
        blendMode,
        source: imageSource,
        prompt: customPrompt,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      await saveSpecialEffectToFirestore(newEffect);
      setImageUrl(finalHostedUrl);
      toast.success(`Saved "${effectName}" to Firebase!`);

      // Refresh saved library and switch to library view
      await loadLibrary();
      setActiveTab('library');
    } catch (err: any) {
      console.error('Firebase save error:', err);
      toast.error(err.message || 'Failed to save effect to Firebase.');
    } finally {
      setIsSavingFirebase(false);
    }
  };

  // Delete Handler
  const handleDeleteEffect = async (id: string, name: string) => {
    try {
      await deleteSpecialEffectFromFirestore(id);
      setSavedEffects(prev => prev.filter(e => e.id !== id));
      setDeleteConfirmId(null);
      toast.success(`Deleted "${name}".`);
    } catch (err: any) {
      console.error('Delete error:', err);
      toast.error('Failed to delete effect.');
    }
  };

  return (
    <div className="flex flex-col gap-3 text-zinc-200">
      {/* Tab Switcher */}
      <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800 gap-1">
        <button
          onClick={() => setActiveTab('create')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold font-mono transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'create'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
          }`}
        >
          <Wand2 className="w-3.5 h-3.5 shrink-0" />
          <span>Create & Render</span>
        </button>
        <button
          onClick={() => setActiveTab('library')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold font-mono transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'library'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
          }`}
        >
          <Layers className="w-3.5 h-3.5 shrink-0" />
          <span>Saved FX</span>
          {savedEffects.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-zinc-900 text-purple-300 border border-purple-500/30">
              {savedEffects.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: CREATE & RENDER */}
      {activeTab === 'create' && (
        <div className="flex flex-col gap-3">
          {/* Quick Preset Selector */}
          <div>
            <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 mb-1.5 block">
              1. Choose Preset Archetype
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {PRESET_TEMPLATES.map(p => {
                const IconComponent = p.icon;
                const isSelected = effectName === p.name;
                return (
                  <button
                    key={p.name}
                    onClick={() => handleSelectPreset(p)}
                    className={`p-1.5 rounded-lg border text-left transition-all flex flex-col items-center justify-center gap-1 ${
                      isSelected
                        ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                    }`}
                    title={p.style}
                  >
                    <IconComponent className="w-4 h-4 shrink-0" />
                    <span className="text-[9px] font-bold font-mono truncate w-full text-center">
                      {p.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Effect Parameters */}
          <div className="bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-800 flex flex-col gap-2.5">
            <div>
              <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block mb-1">
                Effect Name
              </label>
              <input
                type="text"
                value={effectName}
                onChange={e => setEffectName(e.target.value)}
                placeholder="e.g. Eldritch Nova, Hellfire Wall..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-purple-500 font-mono"
              />
            </div>

            {/* Shape & Size Controls */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block mb-1">
                  Shape
                </label>
                <div className="flex bg-zinc-950 p-0.5 rounded-lg border border-zinc-800">
                  {(['circle', 'cone', 'line'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setShape(s)}
                      className={`flex-1 py-1 rounded text-[10px] font-bold capitalize transition-all ${
                        shape === s
                          ? 'bg-purple-600 text-white'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {s === 'circle' ? '● Circle' : s === 'cone' ? '▲ Cone' : '━ Line'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block mb-1">
                  Radius / Size (ft)
                </label>
                <select
                  value={defaultSize}
                  onChange={e => setDefaultSize(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-purple-500 font-mono"
                >
                  <option value={5}>5 ft (1 sq)</option>
                  <option value={10}>10 ft (2 sq)</option>
                  <option value={15}>15 ft (3 sq)</option>
                  <option value={20}>20 ft (4 sq)</option>
                  <option value={30}>30 ft (6 sq)</option>
                  <option value={40}>40 ft (8 sq)</option>
                  <option value={60}>60 ft (12 sq)</option>
                  <option value={100}>100 ft (20 sq)</option>
                </select>
              </div>
            </div>

            {/* Color & Blend Mode */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block mb-1">
                  Color Tint
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={
                      color.startsWith('rgba')
                        ? '#ef4444' // fallback hex for html picker
                        : color
                    }
                    onChange={e => setColor(e.target.value)}
                    className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                  />
                  <div className="flex gap-1">
                    {[
                      'rgba(239, 68, 68, 0.4)', // Red
                      'rgba(59, 130, 246, 0.4)', // Blue
                      'rgba(34, 197, 94, 0.4)', // Green
                      'rgba(168, 85, 247, 0.4)', // Purple
                      'rgba(250, 204, 21, 0.4)' // Yellow
                    ].map(c => (
                      <button
                        key={c}
                        onClick={() => setColor(c)}
                        className={`w-4 h-4 rounded-full border ${
                          color === c ? 'border-white scale-110' : 'border-zinc-700'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block mb-1">
                  Blend Mode
                </label>
                <select
                  value={blendMode}
                  onChange={e => setBlendMode(e.target.value as any)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-purple-500 font-mono"
                >
                  <option value="screen">Screen (Glowing)</option>
                  <option value="lighter">Lighter / Add (Intense)</option>
                  <option value="normal">Normal (Opaque)</option>
                </select>
              </div>
            </div>
          </div>

          {/* 2. Image Source: Upload vs Gemini AI */}
          <div className="flex flex-col gap-2.5">
            <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
              2. Provide Asset: Upload or Gemini Render
            </label>

            {/* Gemini AI Render Section */}
            <div className="bg-purple-950/20 border border-purple-500/30 p-2.5 rounded-xl flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5 font-mono">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  Render through Gemini AI
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-900/60 text-purple-200">
                  gemini-3.1-flash-image
                </span>
              </div>

              <textarea
                value={customPrompt}
                onChange={e => setCustomPrompt(e.target.value)}
                placeholder="Describe magical effect, aura, runes, particle surge..."
                rows={2}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-200 focus:outline-none focus:border-purple-500 font-sans resize-none"
              />

              <button
                onClick={handleRenderWithGemini}
                disabled={isRenderingAI}
                className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold font-mono transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {isRenderingAI ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Channeling Gemini AI...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>Render Effect with Gemini</span>
                  </>
                )}
              </button>
            </div>

            {/* File Upload Section */}
            <div className="bg-zinc-900/80 border border-zinc-800 p-2.5 rounded-xl flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5 font-mono">
                  <Upload className="w-3.5 h-3.5 text-zinc-400" />
                  Upload Custom Image / GIF
                </span>
                <span className="text-[9px] font-mono text-zinc-500">
                  PNG, GIF, WebP
                </span>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/gif,image/webp,image/jpeg"
                onChange={handleFileChange}
                className="hidden"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold font-mono border border-zinc-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Browse File or Drag & Drop</span>
              </button>
            </div>
          </div>

          {/* 3. Live Preview Card & Save */}
          {imageUrl && (
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                  Live Preview
                </span>
                <span className="text-[10px] font-mono text-purple-400 font-bold">
                  {imageSource === 'gemini' ? 'Gemini AI Asset' : 'Uploaded Asset'}
                </span>
              </div>

              <div className="relative w-full h-32 bg-zinc-900 rounded-lg overflow-hidden flex items-center justify-center border border-zinc-800">
                {/* Background grid pattern simulation */}
                <div
                  className="absolute inset-0 opacity-15"
                  style={{
                    backgroundImage: 'radial-gradient(circle, #555 1px, transparent 1px)',
                    backgroundSize: '16px 16px'
                  }}
                />

                <img
                  src={imageUrl}
                  alt={effectName}
                  className="max-h-28 max-w-28 object-contain z-10 filter drop-shadow-md"
                  style={{
                    mixBlendMode: (blendMode === 'normal' ? 'normal' : blendMode === 'lighter' ? 'lighten' : blendMode) as any
                  }}
                />

                <div className="absolute bottom-1.5 left-2 z-20 flex gap-1">
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-black/70 font-mono text-zinc-300 font-bold">
                    {defaultSize} ft {shape}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-black/70 font-mono text-purple-300 font-bold">
                    {blendMode}
                  </span>
                </div>
              </div>

              {/* Action Buttons: Save & Equip */}
              <div className="flex gap-2">
                <button
                  onClick={handleSaveToFirebase}
                  disabled={isSavingFirebase}
                  className="flex-1 py-2 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-mono transition-all flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isSavingFirebase ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Cloud className="w-3.5 h-3.5" />
                      <span>Save to Firebase</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    const tempEffect: CustomSpecialEffect = {
                      id: `temp_${Date.now()}`,
                      name: effectName,
                      category: 'custom',
                      shape,
                      defaultSize,
                      color,
                      imageUrl,
                      isPersistent,
                      blendMode,
                      source: imageSource,
                      createdAt: Date.now()
                    };
                    if (onEquipEffect) onEquipEffect(tempEffect);
                    toast.success(`Equipped ${effectName}! Click anywhere on battlemap to place.`);
                  }}
                  className="py-2 px-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold font-mono transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                  title="Equip now and click on the map to place"
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  <span>Equip</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SAVED EFFECTS LIBRARY */}
      {activeTab === 'library' && (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
              Firebase Stored Special Effects ({savedEffects.length})
            </span>
            <button
              onClick={loadLibrary}
              disabled={isLoadingLibrary}
              className="p-1 rounded text-zinc-400 hover:text-zinc-200 transition-colors"
              title="Refresh from Firebase"
            >
              <RefreshCw className={`w-3 h-3 ${isLoadingLibrary ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {isLoadingLibrary ? (
            <div className="py-8 flex flex-col items-center justify-center gap-2 text-zinc-500">
              <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
              <span className="text-xs font-mono">Loading effects from Firebase...</span>
            </div>
          ) : savedEffects.length === 0 ? (
            <div className="p-6 text-center bg-zinc-950/60 rounded-xl border border-zinc-800 flex flex-col items-center justify-center gap-2">
              <Sparkles className="w-6 h-6 text-zinc-600" />
              <span className="text-xs text-zinc-400 font-mono">No custom effects saved yet.</span>
              <button
                onClick={() => setActiveTab('create')}
                className="mt-1 text-xs font-mono font-bold text-purple-400 hover:text-purple-300 underline"
              >
                Create or render your first effect →
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto pr-1">
              {savedEffects.map(effect => {
                const isEquipped = activeEquippedEffectId === effect.id;

                return (
                  <div
                    key={effect.id}
                    className={`p-2.5 rounded-xl border transition-all flex flex-col gap-2 ${
                      isEquipped
                        ? 'bg-purple-950/30 border-purple-500/60 shadow-sm'
                        : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {/* Thumbnail */}
                      <div className="w-12 h-12 rounded-lg bg-zinc-950 border border-zinc-800 shrink-0 overflow-hidden flex items-center justify-center p-0.5 relative">
                        <img
                          src={effect.imageUrl}
                          alt={effect.name}
                          className="w-full h-full object-contain"
                          style={{
                            mixBlendMode: (effect.blendMode === 'normal' ? 'normal' : effect.blendMode === 'lighter' ? 'lighten' : (effect.blendMode || 'screen')) as any
                          }}
                        />
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold font-mono text-zinc-200 truncate">
                            {effect.name}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold bg-zinc-800 text-zinc-400 uppercase">
                            {effect.shape}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-mono text-purple-400 font-bold">
                            {effect.defaultSize} ft
                          </span>
                          <span className="text-zinc-600">•</span>
                          <span className="text-[9px] font-mono text-zinc-500">
                            {effect.source === 'gemini' ? 'Gemini AI' : 'Uploaded'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 pt-1 border-t border-zinc-800/60">
                      <button
                        onClick={() => {
                          if (onEquipEffect) onEquipEffect(effect);
                          toast.success(`Equipped ${effect.name}! Click battlemap to place.`);
                        }}
                        className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-bold font-mono transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          isEquipped
                            ? 'bg-purple-500 text-zinc-950 shadow-sm'
                            : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                        }`}
                      >
                        <Crosshair className="w-3 h-3" />
                        <span>{isEquipped ? 'Equipped (Active)' : 'Equip on Map'}</span>
                      </button>

                      {onQuickPlaceEffect && (
                        <button
                          onClick={() => {
                            onQuickPlaceEffect(effect);
                            toast.success(`Dropped ${effect.name} at center of map!`);
                          }}
                          className="py-1 px-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-mono font-bold transition-all cursor-pointer"
                          title="Quick place at center of battlemap"
                        >
                          Quick Drop
                        </button>
                      )}

                      {/* Delete Button */}
                      {deleteConfirmId === effect.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDeleteEffect(effect.id, effect.name)}
                            className="p-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-mono font-bold"
                            title="Confirm Delete"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-[10px] font-mono"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(effect.id)}
                          className="p-1 rounded text-zinc-500 hover:text-rose-400 transition-colors"
                          title="Delete from Firebase"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default SpecialEffectsManager;
