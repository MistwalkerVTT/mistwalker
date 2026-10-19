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
  Sliders,
  Volume2,
  Search,
  BookOpen,
  Shield,
  Sun,
  Snowflake,
  Moon
} from 'lucide-react';
import { CustomSpecialEffect } from '../types';
import {
  uploadSpecialEffectImage,
  saveSpecialEffectToFirestore,
  fetchSpecialEffectsFromFirestore,
  deleteSpecialEffectFromFirestore
} from '../lib/firebase';
import { generateEffectImage } from '../services/aiService';
import {
  SPECIAL_EFFECTS_DATABASE,
  SpecialEffectDefinition,
  SpellSchool
} from '../data/specialEffectsDatabase';
import { spellSoundEngine } from '../utils/spellSoundEngine';
import { toast } from 'sonner';

interface SpecialEffectsManagerProps {
  onEquipEffect?: (effect: CustomSpecialEffect) => void;
  onQuickPlaceEffect?: (effect: CustomSpecialEffect) => void;
  activeEquippedEffectId?: string | null;
  gridSize?: number;
}

export const SpecialEffectsManager: React.FC<SpecialEffectsManagerProps> = ({
  onEquipEffect,
  onQuickPlaceEffect,
  activeEquippedEffectId,
  gridSize = 50
}) => {
  const [activeTab, setActiveTab] = useState<'spells' | 'create' | 'library'>('spells');
  const [savedEffects, setSavedEffects] = useState<CustomSpecialEffect[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);

  // Spell Library State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSchool, setSelectedSchool] = useState<string>('all');
  const [previewingSound, setPreviewingSound] = useState<string | null>(null);

  // Form State for Custom FX
  const [effectName, setEffectName] = useState('Fireball');
  const [shape, setShape] = useState<'circle' | 'cone' | 'line'>('circle');
  const [defaultSize, setDefaultSize] = useState<number>(20);
  const [color, setColor] = useState('rgba(239, 68, 68, 0.4)');
  const [isPersistent, setIsPersistent] = useState(true);
  const [blendMode, setBlendMode] = useState<'screen' | 'lighter' | 'normal'>('screen');
  const [customPrompt, setCustomPrompt] = useState('Violent fiery explosion, roaring flame vortex, molten embers');
  const [styleTag, setStyleTag] = useState('Explosive fiery magma blast');

  // Image State for Custom FX
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

  const handlePlaySound = (spell: SpecialEffectDefinition, e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewingSound(spell.id);
    spellSoundEngine.play(spell.soundEffect);
    setTimeout(() => {
      setPreviewingSound(null);
    }, 700);
  };

  const handleCastSpellDefinition = (spell: SpecialEffectDefinition, mode: 'quick' | 'aim') => {
    const customFx: CustomSpecialEffect = {
      id: spell.id,
      name: spell.name,
      description: spell.description,
      category: 'spell',
      shape: spell.shape,
      defaultSize: spell.defaultSizeFt,
      color: spell.color,
      imageUrl: '', // Uses rich procedural shader rendering
      isPersistent: spell.isPersistent,
      blendMode: spell.blendMode,
      source: 'preset',
      createdAt: Date.now()
    };

    // Play spell sound effect on cast
    spellSoundEngine.play(spell.soundEffect);

    if (mode === 'quick' && onQuickPlaceEffect) {
      onQuickPlaceEffect(customFx);
      toast.success(`Cast ${spell.name}!`, {
        description: `${spell.defaultSizeFt}ft ${spell.shape} placed at map center.`
      });
    } else if (mode === 'aim' && onEquipEffect) {
      onEquipEffect(customFx);
      toast.info(`Aiming ${spell.name}`, {
        description: 'Click anywhere on the map to target and cast.'
      });
    }
  };

  // Filtered spells list
  const filteredSpells = SPECIAL_EFFECTS_DATABASE.filter(spell => {
    const matchesSchool = selectedSchool === 'all' || spell.school === selectedSchool;
    if (!matchesSchool) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      spell.name.toLowerCase().includes(q) ||
      spell.label.toLowerCase().includes(q) ||
      spell.description.toLowerCase().includes(q) ||
      spell.tags.some(t => t.includes(q))
    );
  });

  const SCHOOLS: { id: string; label: string }[] = [
    { id: 'all', label: 'All Schools' },
    { id: 'evocation', label: 'Evocation' },
    { id: 'conjuration', label: 'Conjuration' },
    { id: 'abjuration', label: 'Abjuration' },
    { id: 'necromancy', label: 'Necromancy' },
    { id: 'illusion', label: 'Illusion / Enchant' },
    { id: 'environmental', label: 'Hazards' }
  ];

  const renderIcon = (name: string, className: string = "w-4 h-4") => {
    switch (name) {
      case 'flame': return <Flame className={className} />;
      case 'zap': return <Zap className={className} />;
      case 'sun': return <Sun className={className} />;
      case 'snowflake': return <Snowflake className={className} />;
      case 'moon': return <Moon className={className} />;
      case 'cloud': return <Wind className={className} />;
      case 'droplets': return <Droplets className={className} />;
      case 'shield': return <Shield className={className} />;
      case 'skull': return <Skull className={className} />;
      case 'eye': return <Eye className={className} />;
      default: return <Sparkles className={className} />;
    }
  };

  // File Upload Handler for Custom FX
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, GIF, WebP, JPG).');
      return;
    }

    setImageFile(file);
    setImageSource('upload');
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

  // Save Custom FX to Firebase
  const handleSaveToFirebase = async () => {
    if (!effectName.trim()) {
      toast.error('Please provide an effect name.');
      return;
    }

    if (!imageUrl) {
      toast.error('Please upload an image or render one before saving.');
      return;
    }

    setIsSavingFirebase(true);
    try {
      let finalHostedUrl = imageUrl;

      if (imageFile) {
        toast.info('Uploading asset to Firebase Storage...');
        finalHostedUrl = await uploadSpecialEffectImage(imageFile, effectName);
      } else if (imageUrl.startsWith('data:') || imageUrl.startsWith('blob:')) {
        toast.info('Uploading asset to Firebase Storage...');
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
          onClick={() => setActiveTab('spells')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold font-mono transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'spells'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 shrink-0" />
          <span>Spell FX</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-zinc-900 text-purple-300 border border-purple-500/30">
            {SPECIAL_EFFECTS_DATABASE.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('create')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold font-mono transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'create'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
          }`}
        >
          <Wand2 className="w-3.5 h-3.5 shrink-0" />
          <span>Custom</span>
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
          <span>Saved</span>
          {savedEffects.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-zinc-900 text-purple-300 border border-purple-500/30">
              {savedEffects.length}
            </span>
          )}
        </button>
      </div>

      {/* ================================================================= */}
      {/* TAB 1: REBUILT OFFICIAL SPELL EFFECTS DATABASE                    */}
      {/* ================================================================= */}
      {activeTab === 'spells' && (
        <div className="flex flex-col gap-2.5">
          {/* Search & Filter Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search spells, auras, blast damage..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-purple-500 font-mono"
            />
          </div>

          {/* School Category Pills */}
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
            {SCHOOLS.map((school) => (
              <button
                key={school.id}
                onClick={() => setSelectedSchool(school.id)}
                className={`py-1 px-2.5 rounded-lg text-[10px] font-mono font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedSchool === school.id
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                }`}
              >
                {school.label}
              </button>
            ))}
          </div>

          {/* Spell Cards List */}
          <div className="flex flex-col gap-2 max-h-[460px] overflow-y-auto pr-1">
            {filteredSpells.map((spell) => {
              const isEquipped = activeEquippedEffectId === spell.id;
              const isSoundPlaying = previewingSound === spell.id;

              return (
                <div
                  key={spell.id}
                  className={`p-2.5 rounded-xl border transition-all ${
                    isEquipped
                      ? 'bg-purple-950/40 border-purple-500 ring-1 ring-purple-500/30'
                      : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                        {renderIcon(spell.iconName, "w-4 h-4 text-purple-400")}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold font-sans text-zinc-100 truncate">
                            {spell.name}
                          </span>
                          <span className={`text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded border ${spell.badgeColor}`}>
                            {spell.level === 0 ? 'Cantrip' : `Lvl ${spell.level}`} • {spell.defaultSizeFt}ft {spell.shape}
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-400 line-clamp-1 mt-0.5 font-sans">
                          {spell.description}
                        </p>
                      </div>
                    </div>

                    {/* Audio Preview Sound Button */}
                    <button
                      type="button"
                      onClick={(e) => handlePlaySound(spell, e)}
                      title="Test Audio FX"
                      className={`p-1.5 rounded-lg border transition-all shrink-0 cursor-pointer ${
                        isSoundPlaying
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 scale-105'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-amber-300 hover:border-zinc-700'
                      }`}
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Action Buttons: Quick Drop & Aim */}
                  <div className="flex gap-1.5 mt-2 pt-2 border-t border-zinc-800/60">
                    <button
                      type="button"
                      onClick={() => handleCastSpellDefinition(spell, 'quick')}
                      className="flex-1 py-1.5 px-2 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-zinc-200 text-[11px] font-mono font-semibold border border-zinc-700/80 transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3 text-emerald-400" />
                      <span>Quick Place</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCastSpellDefinition(spell, 'aim')}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-mono font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        isEquipped
                          ? 'bg-rose-600 hover:bg-rose-700 text-white'
                          : 'bg-purple-600 hover:bg-purple-500 text-white shadow-sm'
                      }`}
                    >
                      <Crosshair className="w-3 h-3" />
                      <span>{isEquipped ? 'Aiming...' : 'Aim on Map'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 2: CUSTOM EFFECT MAKER                                       */}
      {/* ================================================================= */}
      {activeTab === 'create' && (
        <div className="flex flex-col gap-3">
          {/* Custom Effect Form */}
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

            {/* Shape & Size */}
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

            {/* Color & Persistence */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block mb-1">
                  Color Tint
                </label>
                <input
                  type="text"
                  value={color}
                  onChange={e => setColor(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block mb-1">
                  Duration
                </label>
                <button
                  onClick={() => setIsPersistent(!isPersistent)}
                  className={`w-full py-1 px-2 rounded-lg text-xs font-mono font-bold transition-all border ${
                    isPersistent
                      ? 'bg-amber-950/40 border-amber-500/60 text-amber-300'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                  }`}
                >
                  {isPersistent ? 'Persistent AoE' : 'Instant Blast'}
                </button>
              </div>
            </div>

            {/* Custom Asset Upload */}
            <div className="pt-2 border-t border-zinc-800/70">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/gif,image/webp,image/jpeg"
                onChange={handleFileChange}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold font-mono border border-zinc-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Custom GIF / Image Asset</span>
              </button>
            </div>
          </div>

          {/* Live Preview Card & Save */}
          {imageUrl && (
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                  Live Preview
                </span>
                <span className="text-[10px] font-mono text-purple-400 font-bold">
                  {imageSource === 'gemini' ? 'Gemini AI' : 'Uploaded'}
                </span>
              </div>

              <div className="relative w-full h-28 bg-zinc-900 rounded-lg overflow-hidden flex items-center justify-center border border-zinc-800">
                <img
                  src={imageUrl}
                  alt={effectName}
                  className="max-h-24 max-w-24 object-contain filter drop-shadow-md"
                />
              </div>

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
                      <span>Save to Saved FX</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 3: SAVED CUSTOM FX (FIRESTORE)                                */}
      {/* ================================================================= */}
      {activeTab === 'library' && (
        <div className="flex flex-col gap-2">
          {isLoadingLibrary ? (
            <div className="py-8 flex flex-col items-center justify-center gap-2 text-zinc-500 text-xs font-mono">
              <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
              <span>Loading saved effects...</span>
            </div>
          ) : savedEffects.length === 0 ? (
            <div className="py-8 text-center text-zinc-500 text-xs font-mono">
              No saved custom effects found. Create one in the Custom tab!
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-[460px] overflow-y-auto pr-1">
              {savedEffects.map((effect) => {
                const isEquipped = activeEquippedEffectId === effect.id;

                return (
                  <div
                    key={effect.id}
                    className={`p-2.5 rounded-xl border transition-all ${
                      isEquipped
                        ? 'bg-purple-950/40 border-purple-500'
                        : 'bg-zinc-900/80 border-zinc-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        {effect.imageUrl ? (
                          <img
                            src={effect.imageUrl}
                            alt={effect.name}
                            className="w-7 h-7 rounded-lg object-contain bg-zinc-950 border border-zinc-800"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-purple-400" />
                          </div>
                        )}
                        <div>
                          <span className="text-xs font-bold text-zinc-100 block">
                            {effect.name}
                          </span>
                          <span className="text-[10px] font-mono text-zinc-400">
                            {effect.defaultSize}ft {effect.shape}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteEffect(effect.id, effect.name)}
                        className="p-1.5 text-zinc-500 hover:text-rose-400 rounded-lg hover:bg-rose-950/30 transition-colors cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex gap-1.5">
                      {onQuickPlaceEffect && (
                        <button
                          onClick={() => onQuickPlaceEffect(effect)}
                          className="flex-1 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-mono font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3 text-emerald-400" />
                          <span>Place</span>
                        </button>
                      )}

                      {onEquipEffect && (
                        <button
                          onClick={() => onEquipEffect(effect)}
                          className="flex-1 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-mono font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Crosshair className="w-3 h-3" />
                          <span>Aim</span>
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
