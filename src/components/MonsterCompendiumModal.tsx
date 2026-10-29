import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Search,
  Plus,
  Sparkles,
  Upload,
  Trash2,
  Edit2,
  Play,
  Shield,
  Heart,
  Zap,
  BookOpen,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Copy,
  ChevronRight,
  Filter,
  Eye,
  Crosshair,
  UserCheck
} from 'lucide-react';
import { Monster, MonsterTrait, MonsterAction, getSizeMultiplier } from '../types/monster';
import { DEFAULT_MONSTERS } from '../data/defaultMonsters';
import {
  subscribeToMonsters,
  saveMonster,
  deleteMonster,
  uploadAndRegisterAsset
} from '../lib/firebase';
import { toast } from 'sonner';
import { DdbSyncModal } from './DdbSyncModal';

interface MonsterCompendiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSpawnTokenOnMap: (tokenData: {
    name: string;
    avatarUrl: string;
    hp: number;
    ac: number;
    size: number;
    customMonsterData?: Monster;
  }) => void;
  initialSearchQuery?: string;
}

export const MonsterCompendiumModal: React.FC<MonsterCompendiumModalProps> = ({
  isOpen,
  onClose,
  onSpawnTokenOnMap,
  initialSearchQuery = ''
}) => {
  const [monsters, setMonsters] = useState<Monster[]>(DEFAULT_MONSTERS);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedMonster, setSelectedMonster] = useState<Monster | null>(null);

  // Form State for Create / Edit
  const [isEditing, setIsEditing] = useState(false);
  const [isDdbSyncModalOpen, setIsDdbSyncModalOpen] = useState(false);
  const [ddbInitialSearch, setDdbInitialSearch] = useState('');
  const [editingMonster, setEditingMonster] = useState<Partial<Monster>>({

    name: '',
    size: 'Medium',
    type: 'Humanoid',
    alignment: 'Unaligned',
    ac: 10,
    acNotes: '',
    hp: 10,
    hpFormula: '(2d8 + 2)',
    speed: '30 ft.',
    initiativeBonus: 0,
    str: 10,
    dex: 10,
    con: 10,
    int: 10,
    wis: 10,
    cha: 10,
    challenge: '1 (200 XP)',
    proficiencyBonus: 2,
    traits: [],
    actions: []
  });

  // AI Digestion State
  const [isDigesting, setIsDigesting] = useState(false);
  const [digestionSuccess, setDigestionSuccess] = useState(false);
  const [statblockPreviewUrl, setStatblockPreviewUrl] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [monsterToDelete, setMonsterToDelete] = useState<Monster | null>(null);
  const [fullScreenStatblockUrl, setFullScreenStatblockUrl] = useState<string | null>(null);

  // Unblock Rosintar in localStorage if previously deleted
  useEffect(() => {
    try {
      const stored = localStorage.getItem('vtt_deleted_monster_ids');
      if (stored) {
        const parsed: string[] = JSON.parse(stored);
        const filtered = parsed.filter(id => id !== 'monster_rosintar' && !id.toLowerCase().includes('rosintar'));
        if (filtered.length !== parsed.length) {
          localStorage.setItem('vtt_deleted_monster_ids', JSON.stringify(filtered));
        }
      }
    } catch (e) {}
  }, []);

  const [deletedMonsterIds, setDeletedMonsterIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('vtt_deleted_monster_ids');
      if (stored) {
        const parsed: string[] = JSON.parse(stored);
        return new Set(parsed.filter(id => id !== 'monster_rosintar' && !id.toLowerCase().includes('rosintar')));
      }
      return new Set();
    } catch (e) {
      return new Set();
    }
  });

  // Subscribe to Firestore monsters
  useEffect(() => {
    if (!isOpen) return;
    const unsub = subscribeToMonsters((remoteMonsters) => {
      setMonsters(() => {
        let deletedSet = new Set<string>();
        try {
          const stored = localStorage.getItem('vtt_deleted_monster_ids');
          if (stored) {
            const parsed: string[] = JSON.parse(stored);
            deletedSet = new Set(parsed.filter(id => id !== 'monster_rosintar' && !id.toLowerCase().includes('rosintar')));
          }
        } catch (e) {}

        const remoteList = Array.isArray(remoteMonsters) ? remoteMonsters : [];
        const combined = [...remoteList];

        // Seed defaults if not in Firestore and not explicitly deleted
        for (const def of DEFAULT_MONSTERS) {
          if (!combined.some(m => m.monsterId === def.monsterId || m.name.toLowerCase() === def.name.toLowerCase())) {
            combined.push(def);
          }
        }

        // Filter out deleted IDs, ensuring Rosintar is always restored
        const finalFiltered = combined.filter(m => {
          if (m.name.toLowerCase() === 'rosintar' || m.monsterId === 'monster_rosintar') {
            return true;
          }
          return !deletedSet.has(m.monsterId);
        });

        // Ensure Rosintar is also persisted to Firestore if not already there
        const rosintarInRemote = remoteList.some(m => m.name.toLowerCase() === 'rosintar' || m.monsterId === 'monster_rosintar');
        if (!rosintarInRemote) {
          const rosintarDef = DEFAULT_MONSTERS.find(m => m.monsterId === 'monster_rosintar');
          if (rosintarDef) {
            saveMonster(rosintarDef).catch(() => {});
          }
        }

        return finalFiltered;
      });
    });
    return () => unsub();
  }, [isOpen]);

  // Initialize search and selected monster when opened with initial query
  useEffect(() => {
    if (isOpen) {
      if (initialSearchQuery) {
        setSearchQuery(initialSearchQuery);
      }
      setIsEditing(false);
    }
  }, [isOpen, initialSearchQuery]);

  // Sync selectedMonster when monsters list changes
  useEffect(() => {
    if (!isOpen) return;
    if (monsters.length === 0) {
      setSelectedMonster(null);
      return;
    }

    if (initialSearchQuery) {
      const q = initialSearchQuery.toLowerCase().trim();
      const matched = monsters.find(m =>
        m.name.toLowerCase() === q ||
        m.name.toLowerCase().includes(q) ||
        q.includes(m.name.toLowerCase())
      );
      if (matched) {
        setSelectedMonster(matched);
        return;
      }
    }

    if (selectedMonster && !monsters.some(m => m.monsterId === selectedMonster.monsterId)) {
      setSelectedMonster(monsters[0]);
    } else if (!selectedMonster) {
      setSelectedMonster(monsters[0]);
    }
  }, [isOpen, monsters, selectedMonster, initialSearchQuery]);

  if (!isOpen) return null;

  const isCustomMonster = (m: Monster): boolean => {
    if (m.isCustom === true || m.isRoomCustom === true) return true;
    if (m.source === 'Custom Compendium' || m.source === 'Room Zone Custom') return true;
    const isDefaultUnmodified = DEFAULT_MONSTERS.some(
      d => d.monsterId === m.monsterId && !m.updatedAt
    );
    return !isDefaultUnmodified && !m.source?.includes('SRD') && !m.source?.includes('D&D Beyond') && Boolean(m.updatedAt || m.createdAt);
  };

  const customMonstersCount = monsters.filter(isCustomMonster).length;

  // Filter logic
  const filteredMonsters = monsters.filter(m => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.challenge.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType =
      selectedType === 'all'
        ? true
        : selectedType === 'custom'
          ? isCustomMonster(m)
          : m.type.toLowerCase().includes(selectedType.toLowerCase());
    return matchesSearch && matchesType;
  }).sort((a, b) => {
    // Keep custom monsters pinned to the top when viewing 'all'
    if (selectedType === 'all') {
      const aCustom = isCustomMonster(a) ? 1 : 0;
      const bCustom = isCustomMonster(b) ? 1 : 0;
      if (aCustom !== bCustom) return bCustom - aCustom;
    }
    return a.name.localeCompare(b.name);
  });

  const getAbilityMod = (score: number) => {
    const mod = Math.floor((score - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  };

  // Convert size string to VTT grid tile size
  const getSizeMultiplier = (sizeStr: string): number => {
    const s = sizeStr.toLowerCase();
    if (s.includes('tiny') || s.includes('small') || s.includes('medium')) return 1;
    if (s.includes('large')) return 2;
    if (s.includes('huge')) return 3;
    if (s.includes('gargantuan')) return 4;
    return 1;
  };

  // Digest Statblock Screenshot via Gemini API
  const handleStatblockFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsDigesting(true);
    setDigestionSuccess(false);

    try {
      // 1. Convert to base64 or upload asset
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        setStatblockPreviewUrl(base64Data);

        // 2. Call backend /api/ai/parse-statblock
        const res = await fetch('/api/ai/parse-statblock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: base64Data,
            additionalNotes: 'Extract all fields accurately from this D&D stat-block.'
          })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Server responded with status ${res.status}`);
        }

        const data = await res.json();
        if (data.success && data.monster) {
          const parsed: Partial<Monster> = data.monster;
          setEditingMonster(prev => ({
            ...prev,
            name: parsed.name || prev.name || 'Digested Creature',
            size: parsed.size || prev.size || 'Medium',
            type: parsed.type || prev.type || 'Humanoid',
            alignment: parsed.alignment || prev.alignment || 'Unaligned',
            ac: typeof parsed.ac === 'number' ? parsed.ac : prev.ac || 10,
            acNotes: parsed.acNotes || prev.acNotes || '',
            hp: typeof parsed.hp === 'number' ? parsed.hp : prev.hp || 10,
            hpFormula: parsed.hpFormula || prev.hpFormula || '',
            speed: parsed.speed || prev.speed || '30 ft.',
            initiativeBonus: typeof parsed.initiativeBonus === 'number' ? parsed.initiativeBonus : prev.initiativeBonus || 0,
            str: typeof parsed.str === 'number' ? parsed.str : 10,
            dex: typeof parsed.dex === 'number' ? parsed.dex : 10,
            con: typeof parsed.con === 'number' ? parsed.con : 10,
            int: typeof parsed.int === 'number' ? parsed.int : 10,
            wis: typeof parsed.wis === 'number' ? parsed.wis : 10,
            cha: typeof parsed.cha === 'number' ? parsed.cha : 10,
            savingThrows: parsed.savingThrows || prev.savingThrows,
            skills: parsed.skills || prev.skills,
            damageResistances: parsed.damageResistances || prev.damageResistances,
            damageImmunities: parsed.damageImmunities || prev.damageImmunities,
            conditionImmunities: parsed.conditionImmunities || prev.conditionImmunities,
            senses: parsed.senses || prev.senses,
            languages: parsed.languages || prev.languages,
            challenge: parsed.challenge || prev.challenge || '1',
            proficiencyBonus: typeof parsed.proficiencyBonus === 'number' ? parsed.proficiencyBonus : 2,
            traits: Array.isArray(parsed.traits) ? parsed.traits : prev.traits || [],
            actions: Array.isArray(parsed.actions) ? parsed.actions : prev.actions || [],
            bonusActions: Array.isArray(parsed.bonusActions) ? parsed.bonusActions : prev.bonusActions || [],
            reactions: Array.isArray(parsed.reactions) ? parsed.reactions : prev.reactions || [],
            legendaryActions: Array.isArray(parsed.legendaryActions) ? parsed.legendaryActions : prev.legendaryActions || [],
            statblockImageUrl: base64Data
          }));

          setDigestionSuccess(true);
          toast.success(`Stat block digested! Extracted "${parsed.name || 'Monster'}" stats.`);
        } else {
          throw new Error('Could not parse stat block');
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error('Statblock digestion failed:', err);
      toast.error('AI Statblock digestion error: ' + (err.message || 'Failed to read image'));
    } finally {
      setIsDigesting(false);
    }
  };

  // Upload creature avatar/token image
  const handleAvatarFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const asset = await uploadAndRegisterAsset(file, 'token');
      if (isEditing) {
        setEditingMonster(prev => ({ ...prev, avatarUrl: asset.url }));
      } else if (selectedMonster) {
        const updated = { ...selectedMonster, avatarUrl: asset.url };
        await saveMonster(updated);
        setSelectedMonster(updated);
        setMonsters(prev => prev.map(m => m.monsterId === updated.monsterId ? updated : m));
      } else {
        setEditingMonster(prev => ({ ...prev, avatarUrl: asset.url }));
      }
      toast.success('Creature portrait uploaded successfully!');
    } catch (err: any) {
      console.error('Failed to upload creature portrait:', err);
      toast.error('Failed to upload image');
    } finally {
      setIsUploadingImage(false);
    }
    e.target.value = '';
  };

  // Save Monster
  const handleSaveMonster = async () => {
    if (!editingMonster.name || !editingMonster.name.trim()) {
      toast.error('Please enter a monster name');
      return;
    }

    const fullMonster: Monster = {
      monsterId: editingMonster.monsterId || `monster_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: editingMonster.name.trim(),
      size: (editingMonster.size as any) || 'Medium',
      type: editingMonster.type || 'Humanoid',
      alignment: editingMonster.alignment || 'Unaligned',
      ac: Number(editingMonster.ac) || 10,
      acNotes: editingMonster.acNotes || '',
      hp: Number(editingMonster.hp) || 10,
      hpFormula: editingMonster.hpFormula || '',
      speed: editingMonster.speed || '30 ft.',
      initiativeBonus: Number(editingMonster.initiativeBonus) || 0,
      str: Number(editingMonster.str) || 10,
      dex: Number(editingMonster.dex) || 10,
      con: Number(editingMonster.con) || 10,
      int: Number(editingMonster.int) || 10,
      wis: Number(editingMonster.wis) || 10,
      cha: Number(editingMonster.cha) || 10,
      savingThrows: editingMonster.savingThrows || '',
      skills: editingMonster.skills || '',
      damageResistances: editingMonster.damageResistances || '',
      damageImmunities: editingMonster.damageImmunities || '',
      conditionImmunities: editingMonster.conditionImmunities || '',
      senses: editingMonster.senses || '',
      languages: editingMonster.languages || '',
      challenge: editingMonster.challenge || '1',
      proficiencyBonus: Number(editingMonster.proficiencyBonus) || 2,
      avatarUrl: editingMonster.avatarUrl || '/uploads/file-1792077381663-439615846.png',
      statblockImageUrl: editingMonster.statblockImageUrl || '',
      traits: editingMonster.traits || [],
      actions: editingMonster.actions || [],
      bonusActions: editingMonster.bonusActions || [],
      reactions: editingMonster.reactions || [],
      legendaryActions: editingMonster.legendaryActions || [],
      source: 'Custom Compendium',
      isCustom: true,
      createdAt: editingMonster.createdAt || Date.now(),
      updatedAt: Date.now()
    };

    try {
      const saved = await saveMonster(fullMonster);
      setMonsters(prev => [saved, ...prev.filter(m => m.monsterId !== saved.monsterId)]);
      setSelectedMonster(saved);
      setIsEditing(false);
      toast.success(`Saved "${saved.name}" to Custom Monsters in Compendium!`);
    } catch (err: any) {
      console.error('Failed to save monster:', err);
      toast.error('Failed to save monster to Firebase');
    }
  };

  // Request deletion (opens "Are you sure?" confirmation popup)
  const handleRequestDelete = (monster: Monster, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setMonsterToDelete(monster);
  };

  // Confirmed Delete from Confirmation Dialog
  const handleConfirmDelete = async () => {
    if (!monsterToDelete) return;
    const target = monsterToDelete;
    const mId = target.monsterId;
    setMonsterToDelete(null);

    // 1. Immediately record in localStorage so subscription never brings it back
    let currentDeleted = new Set<string>();
    try {
      const stored = localStorage.getItem('vtt_deleted_monster_ids');
      if (stored) currentDeleted = new Set(JSON.parse(stored));
    } catch (err) {}

    currentDeleted.add(mId);
    try {
      localStorage.setItem('vtt_deleted_monster_ids', JSON.stringify(Array.from(currentDeleted)));
    } catch (err) {}

    // 2. Update local state immediately
    setMonsters(prev => {
      const nextList = prev.filter(m => m.monsterId !== mId);
      if (selectedMonster?.monsterId === mId) {
        setSelectedMonster(nextList.length > 0 ? nextList[0] : null);
      }
      return nextList;
    });

    // 3. Fire-and-forget deletion from Firestore
    deleteMonster(mId).catch((err) => {
      console.warn('Firestore delete notice:', err);
    });

    toast.success(`Deleted "${target.name}" from Compendium`);
  };

  // Spawn Token on Map
  const handleSpawnOnCanvas = (monster: Monster) => {
    onSpawnTokenOnMap({
      name: monster.name,
      avatarUrl: monster.avatarUrl || '/uploads/file-1792077381663-439615846.png',
      hp: monster.hp,
      ac: monster.ac,
      size: getSizeMultiplier(monster.size),
      customMonsterData: monster
    });
    toast.success(`Spawned "${monster.name}" token on battlemap!`);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-6xl h-[92vh] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-zinc-900/90 border-b border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-red-600/30 to-amber-600/30 border border-red-500/30 text-red-400">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-zinc-100 font-serif flex items-center gap-2">
                Monster Compendium & AI Digester
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {monsters.length} Creatures
                </span>
              </h2>
              <p className="text-xs text-zinc-400 font-mono">
                Store stats, upload statblock screenshots for AI digestion, and spawn tokens onto VTT canvas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsDdbSyncModalOpen(true)}
              className="px-3.5 py-2 bg-gradient-to-r from-red-950 via-slate-900 to-red-950 hover:from-red-900 hover:to-slate-800 text-amber-200 font-bold text-xs rounded-xl border border-red-700/60 shadow-lg flex items-center gap-2 transition-all cursor-pointer"
              title="Sync & Ingest official sourcebooks from D&D Beyond"
            >
              <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
              D&D Beyond Sync
            </button>
            <button
              onClick={() => {
                setEditingMonster({
                  name: '',
                  size: 'Medium',
                  type: 'Humanoid',
                  alignment: 'Unaligned',
                  ac: 12,
                  hp: 15,
                  speed: '30 ft.',
                  str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10,
                  traits: [], actions: []
                });
                setStatblockPreviewUrl(null);
                setDigestionSuccess(false);
                setIsEditing(true);
              }}
              className="px-4 py-2 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              New Creature
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Body Grid */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden bg-zinc-950/60">
          
          {/* Left Panel: Catalog List & Search (4 Cols) */}
          <div className="md:col-span-4 border-r border-zinc-800/80 flex flex-col h-full bg-zinc-900/40 overflow-hidden">
            {/* Search & Filters */}
            <div className="p-3 border-b border-zinc-800/80 space-y-2 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search monster name, CR, type..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-700/80 rounded-xl text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-red-500"
                />
              </div>

              {/* Type Filter Tags */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sidebar-scrollbar text-[11px]">
                <button
                  onClick={() => setSelectedType('all')}
                  className={`px-2.5 py-1 rounded-lg font-mono capitalize whitespace-nowrap transition-all cursor-pointer ${
                    selectedType === 'all'
                      ? 'bg-red-600 text-white font-bold'
                      : 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400'
                  }`}
                >
                  All ({monsters.length})
                </button>
                <button
                  onClick={() => setSelectedType('custom')}
                  className={`px-2.5 py-1 rounded-lg font-mono whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer ${
                    selectedType === 'custom'
                      ? 'bg-amber-500 text-zinc-950 font-bold shadow-md shadow-amber-500/20'
                      : 'bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 border border-amber-500/30 font-semibold'
                  }`}
                  title="Show your Custom & Edited Creatures"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Custom ({customMonstersCount})</span>
                </button>
                {['Fey', 'Humanoid', 'Dragon', 'Undead', 'Monstrosity', 'Fiend'].map(type => (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className={`px-2.5 py-1 rounded-lg font-mono capitalize whitespace-nowrap transition-all cursor-pointer ${
                      selectedType === type
                        ? 'bg-red-600 text-white font-bold'
                        : 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Monster List Scrollable */}
            <div className="flex-1 overflow-y-auto p-2 pr-3 space-y-2 sidebar-scrollbar" style={{ scrollbarWidth: 'thin', scrollbarColor: '#3f3f46 transparent' }}>
              {filteredMonsters.length === 0 ? (
                <div className="p-6 text-center text-zinc-500 text-xs space-y-3">
                  <p>No creatures found matching "{searchQuery}".</p>
                  <button
                    type="button"
                    onClick={() => {
                      setDdbInitialSearch(searchQuery.trim());
                      setIsDdbSyncModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/60 text-amber-300 border border-red-800/60 text-[11px] font-semibold transition-all shadow-md cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                    Search D&D Beyond (6,000+ Creatures)
                  </button>
                </div>
              ) : (

                filteredMonsters.map((m, idx) => {
                  const isSelected = selectedMonster?.monsterId === m.monsterId && !isEditing;
                  const custom = isCustomMonster(m);
                  const prevCustom = idx > 0 ? isCustomMonster(filteredMonsters[idx - 1]) : false;
                  const showCustomHeader = selectedType === 'all' && custom && idx === 0;
                  const showStandardHeader = selectedType === 'all' && !custom && prevCustom;

                  return (
                    <React.Fragment key={m.monsterId}>
                      {showCustomHeader && (
                        <div className="px-2 pt-1 pb-1.5 flex items-center justify-between text-[10px] font-mono uppercase tracking-wider font-bold text-amber-300 border-b border-amber-500/20">
                          <span className="flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3 text-amber-400" />
                            Custom & Edited Monsters ({customMonstersCount})
                          </span>
                        </div>
                      )}
                      {showStandardHeader && (
                        <div className="px-2 pt-2.5 pb-1.5 flex items-center justify-between text-[10px] font-mono uppercase tracking-wider font-bold text-zinc-400 border-b border-zinc-800">
                          <span>Compendium & Sourcebook Creatures</span>
                        </div>
                      )}
                      <div
                        onClick={() => {
                          setSelectedMonster(m);
                          setIsEditing(false);
                        }}
                        draggable={true}
                        onDragStart={(e) => {
                          const tokenData = {
                            name: m.name,
                            url: m.avatarUrl || '/uploads/file-1792077381663-439615846.png',
                            avatarUrl: m.avatarUrl || '/uploads/file-1792077381663-439615846.png',
                            size: getSizeMultiplier(m.size),
                            hp: m.hp,
                            maxHp: m.hp,
                            currentHp: m.hp,
                            ac: m.ac,
                            isMonster: true,
                            category: 'monster',
                            monsterId: m.monsterId,
                            customMonsterData: m
                          };
                          e.dataTransfer.setData('application/json', JSON.stringify(tokenData));
                          e.dataTransfer.setData('text/plain', m.name);
                          e.dataTransfer.effectAllowed = 'copy';
                        }}
                        className={`group p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between select-none ${
                          isSelected
                            ? 'bg-gradient-to-r from-red-950/40 to-amber-950/20 border-red-500/60 shadow-lg'
                            : custom
                              ? 'bg-amber-950/15 hover:bg-amber-950/25 border-amber-500/30'
                              : 'bg-zinc-900/60 hover:bg-zinc-800/80 border-zinc-800/80'
                        }`}
                        title={`Drag onto battlemap or click to select`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800 shrink-0 relative">
                            <img
                              src={m.avatarUrl || '/uploads/file-1792077381663-439615846.png'}
                              alt={m.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <h4 className="text-sm font-bold text-zinc-200 truncate font-serif">
                                {m.name}
                              </h4>
                              {custom && (
                                <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-mono font-bold uppercase shrink-0">
                                  Custom
                                </span>
                              )}
                            </div>
                          <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400 mt-0.5">
                            <span className="text-amber-400 font-semibold">{m.size} {m.type}</span>
                            <span>•</span>
                            <span className="text-zinc-400">CR {m.challenge}</span>
                          </div>
                          <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-500 mt-1">
                            <span className="flex items-center gap-1 text-red-400">
                              <Heart className="w-3 h-3 text-red-500 fill-red-500/30" /> {m.hp}
                            </span>
                            <span className="flex items-center gap-1 text-sky-400">
                              <Shield className="w-3 h-3 text-sky-500" /> {m.ac}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons: Spawn Token & Quick Delete */}
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSpawnOnCanvas(m);
                          }}
                          className="p-2 bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/40 text-emerald-300 hover:text-white rounded-lg transition-all cursor-pointer"
                          title="Spawn Token onto VTT Canvas"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                        </button>

                        <button
                          onClick={(e) => handleRequestDelete(m, e)}
                          className="p-2 bg-zinc-800 hover:bg-red-600/30 border border-zinc-700/80 hover:border-red-500/50 text-zinc-400 hover:text-red-400 rounded-lg transition-all cursor-pointer"
                          title="Delete creature from compendium"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    </React.Fragment>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Panel: Statblock Display OR Form Editor (8 Cols) */}
          <div className="md:col-span-8 h-full flex flex-col overflow-y-auto p-6 sidebar-scrollbar bg-zinc-950">
            {isEditing ? (
              /* ================= EDIT / CREATE FORM ================= */
              <div className="space-y-6 max-w-3xl mx-auto w-full">
                
                {/* Banner Header */}
                <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                  <h3 className="text-lg font-bold text-amber-400 font-serif flex items-center gap-2">
                    <Edit2 className="w-5 h-5" />
                    {editingMonster.monsterId ? 'Edit Creature Stat Block' : 'Add New Creature'}
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveMonster}
                      className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-950/40"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Save Creature
                    </button>
                  </div>
                </div>

                {/* AI Vision Statblock Screenshot Digester Box */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-950/30 to-red-950/30 border border-amber-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                      <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                      Digest Stat-block Screenshot with Gemini Vision AI
                    </div>
                    {digestionSuccess && (
                      <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Digested
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400">
                    Upload or take a screenshot of a D&D monster stat block (e.g. Beyond20, Monster Manual, homebrew). Gemini AI will extract all stats, traits, saving throws, and attack actions directly into this form!
                  </p>

                  <div className="flex flex-wrap items-center gap-4 pt-2">
                    <label className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 font-mono text-xs rounded-xl flex items-center gap-2 cursor-pointer transition-all">
                      {isDigesting ? <Loader2 className="w-4 h-4 animate-spin text-amber-400" /> : <Upload className="w-4 h-4 text-amber-400" />}
                      {isDigesting ? 'Extracting Stats with AI...' : 'Upload Statblock Screenshot'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleStatblockFileUpload}
                        className="hidden"
                        disabled={isDigesting}
                      />
                    </label>

                    {statblockPreviewUrl && (
                      <div className="flex items-center gap-2">
                        <img
                          src={statblockPreviewUrl}
                          alt="Statblock screenshot"
                          className="w-12 h-12 object-cover rounded-lg border border-amber-500/40"
                        />
                        <span className="text-[11px] font-mono text-zinc-400">Screenshot Attached</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Basic Details Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-mono text-zinc-400 uppercase font-bold mb-1">Creature Name</label>
                    <input
                      type="text"
                      value={editingMonster.name || ''}
                      onChange={e => setEditingMonster({ ...editingMonster, name: e.target.value })}
                      placeholder="e.g. Deadbark Dryad"
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-zinc-100 font-serif focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-zinc-400 uppercase font-bold mb-1">Size</label>
                    <select
                      value={editingMonster.size || 'Medium'}
                      onChange={e => setEditingMonster({ ...editingMonster, size: e.target.value as any })}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-zinc-100 focus:border-amber-500 focus:outline-none"
                    >
                      <option value="Tiny">Tiny (1 tile)</option>
                      <option value="Small">Small (1 tile)</option>
                      <option value="Medium">Medium (1 tile)</option>
                      <option value="Large">Large (2x2 tiles)</option>
                      <option value="Huge">Huge (3x3 tiles)</option>
                      <option value="Gargantuan">Gargantuan (4x4 tiles)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-zinc-400 uppercase font-bold mb-1">Type & Subtype</label>
                    <input
                      type="text"
                      value={editingMonster.type || ''}
                      onChange={e => setEditingMonster({ ...editingMonster, type: e.target.value })}
                      placeholder="e.g. Fey, Undead, Dragon"
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-zinc-100 focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-zinc-400 uppercase font-bold mb-1">Alignment</label>
                    <input
                      type="text"
                      value={editingMonster.alignment || ''}
                      onChange={e => setEditingMonster({ ...editingMonster, alignment: e.target.value })}
                      placeholder="e.g. Typically Chaotic Evil"
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-zinc-100 focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-zinc-400 uppercase font-bold mb-1">Armor Class (AC)</label>
                    <input
                      type="number"
                      value={editingMonster.ac || 10}
                      onChange={e => setEditingMonster({ ...editingMonster, ac: parseInt(e.target.value) || 10 })}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-zinc-100 focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-zinc-400 uppercase font-bold mb-1">Hit Points (HP)</label>
                    <input
                      type="number"
                      value={editingMonster.hp || 10}
                      onChange={e => setEditingMonster({ ...editingMonster, hp: parseInt(e.target.value) || 10 })}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-zinc-100 focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-zinc-400 uppercase font-bold mb-1">Speed</label>
                    <input
                      type="text"
                      value={editingMonster.speed || '30 ft.'}
                      onChange={e => setEditingMonster({ ...editingMonster, speed: e.target.value })}
                      placeholder="e.g. 30 ft., fly 60 ft."
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-zinc-100 focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-zinc-400 uppercase font-bold mb-1">Challenge Rating (CR)</label>
                    <input
                      type="text"
                      value={editingMonster.challenge || '1'}
                      onChange={e => setEditingMonster({ ...editingMonster, challenge: e.target.value })}
                      placeholder="e.g. 13 (10,000 XP)"
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-zinc-100 focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div className="col-span-1 sm:col-span-2 md:col-span-3 p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-black border border-amber-500/40 shrink-0">
                        <img
                          src={editingMonster.avatarUrl || '/uploads/file-1792077381663-439615846.png'}
                          alt="Token Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-mono text-amber-400 uppercase font-bold">Token & Creature Artwork</label>
                        <p className="text-[11px] text-zinc-400">Upload a custom token image or avatar for this creature</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 font-mono text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer transition-all">
                        {isUploadingImage ? <Loader2 className="w-4 h-4 animate-spin text-amber-400" /> : <Upload className="w-4 h-4 text-amber-400" />}
                        <span>{isUploadingImage ? 'Uploading...' : 'Upload Token Image'}</span>
                        <input type="file" accept="image/*" onChange={handleAvatarFileUpload} className="hidden" disabled={isUploadingImage} />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Ability Scores Grid */}
                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 uppercase font-bold mb-2">Ability Scores</label>
                  <div className="grid grid-cols-6 gap-2 text-center">
                    {(['str', 'dex', 'con', 'int', 'wis', 'cha'] as const).map(stat => (
                      <div key={stat} className="p-2 rounded-xl bg-zinc-900 border border-zinc-800">
                        <span className="text-[10px] font-mono uppercase font-bold text-amber-400 block mb-1">{stat}</span>
                        <input
                          type="number"
                          value={editingMonster[stat] || 10}
                          onChange={e => setEditingMonster({ ...editingMonster, [stat]: parseInt(e.target.value) || 10 })}
                          className="w-full text-center bg-zinc-950 border border-zinc-700 rounded-lg py-1 text-xs text-zinc-100 font-bold focus:outline-none"
                        />
                        <span className="text-[10px] font-mono text-zinc-500 mt-1 block">
                          {getAbilityMod(editingMonster[stat] || 10)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Resistances & Senses */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-mono text-zinc-400 uppercase font-bold mb-1">Saving Throws</label>
                    <input
                      type="text"
                      value={editingMonster.savingThrows || ''}
                      onChange={e => setEditingMonster({ ...editingMonster, savingThrows: e.target.value })}
                      placeholder="e.g. CON +9, CHA +9"
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-zinc-100 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-zinc-400 uppercase font-bold mb-1">Skills</label>
                    <input
                      type="text"
                      value={editingMonster.skills || ''}
                      onChange={e => setEditingMonster({ ...editingMonster, skills: e.target.value })}
                      placeholder="e.g. Perception +8, Stealth +8"
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-zinc-100 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-zinc-400 uppercase font-bold mb-1">Damage Resistances / Immunities</label>
                    <input
                      type="text"
                      value={editingMonster.damageResistances || ''}
                      onChange={e => setEditingMonster({ ...editingMonster, damageResistances: e.target.value })}
                      placeholder="e.g. Bludgeoning, Piercing"
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-zinc-100 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-zinc-400 uppercase font-bold mb-1">Senses & Languages</label>
                    <input
                      type="text"
                      value={editingMonster.senses || ''}
                      onChange={e => setEditingMonster({ ...editingMonster, senses: e.target.value })}
                      placeholder="e.g. Darkvision 60 ft., Passive Perception 18"
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-zinc-100 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Traits Editor */}
                <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-mono text-amber-400 uppercase font-bold">
                      Special Traits & Passive Features ({(editingMonster.traits || []).length})
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setEditingMonster({
                          ...editingMonster,
                          traits: [...(editingMonster.traits || []), { name: '', description: '' }]
                        })
                      }
                      className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Trait
                    </button>
                  </div>
                  {(editingMonster.traits || []).map((trait, tIdx) => (
                    <div key={tIdx} className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          value={trait.name || ''}
                          onChange={(e) => {
                            const next = [...(editingMonster.traits || [])];
                            next[tIdx] = { ...next[tIdx], name: e.target.value };
                            setEditingMonster({ ...editingMonster, traits: next });
                          }}
                          placeholder="Trait Name (e.g. Pack Tactics, Magic Resistance)"
                          className="flex-1 px-2.5 py-1.5 bg-zinc-900 border border-zinc-750 rounded-lg text-xs font-bold text-amber-200 focus:outline-none focus:border-amber-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const next = (editingMonster.traits || []).filter((_, i) => i !== tIdx);
                            setEditingMonster({ ...editingMonster, traits: next });
                          }}
                          className="p-1.5 text-zinc-500 hover:text-red-400 rounded-lg cursor-pointer"
                          title="Remove Trait"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <textarea
                        rows={2}
                        value={trait.description || ''}
                        onChange={(e) => {
                          const next = [...(editingMonster.traits || [])];
                          next[tIdx] = { ...next[tIdx], description: e.target.value };
                          setEditingMonster({ ...editingMonster, traits: next });
                        }}
                        placeholder="Trait description..."
                        className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-750 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  ))}
                </div>

                {/* Actions Editor */}
                <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-mono text-red-400 uppercase font-bold">
                      Combat Actions & Attacks ({(editingMonster.actions || []).length})
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setEditingMonster({
                          ...editingMonster,
                          actions: [
                            ...(editingMonster.actions || []),
                            { name: '', type: 'attack', attackBonus: 4, damage: '1d8 + 2 slashing', reachRange: 'reach 5 ft.', description: '' }
                          ]
                        })
                      }
                      className="px-2.5 py-1 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 text-xs font-mono font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Action
                    </button>
                  </div>
                  {(editingMonster.actions || []).map((act, aIdx) => (
                    <div key={aIdx} className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                        <input
                          type="text"
                          value={act.name || ''}
                          onChange={(e) => {
                            const next = [...(editingMonster.actions || [])];
                            next[aIdx] = { ...next[aIdx], name: e.target.value };
                            setEditingMonster({ ...editingMonster, actions: next });
                          }}
                          placeholder="Action Name (e.g. Longsword, Bite)"
                          className="sm:col-span-5 px-2.5 py-1.5 bg-zinc-900 border border-zinc-750 rounded-lg text-xs font-bold text-red-300 focus:outline-none focus:border-red-500"
                        />
                        <input
                          type="number"
                          value={act.attackBonus ?? ''}
                          onChange={(e) => {
                            const next = [...(editingMonster.actions || [])];
                            next[aIdx] = { ...next[aIdx], attackBonus: e.target.value === '' ? undefined : parseInt(e.target.value, 10) };
                            setEditingMonster({ ...editingMonster, actions: next });
                          }}
                          placeholder="Hit + (e.g. 5)"
                          className="sm:col-span-2 px-2 py-1.5 bg-zinc-900 border border-zinc-750 rounded-lg text-xs font-mono text-zinc-200 focus:outline-none focus:border-red-500"
                          title="Attack Hit Bonus"
                        />
                        <input
                          type="text"
                          value={act.damage || ''}
                          onChange={(e) => {
                            const next = [...(editingMonster.actions || [])];
                            next[aIdx] = { ...next[aIdx], damage: e.target.value };
                            setEditingMonster({ ...editingMonster, actions: next });
                          }}
                          placeholder="Damage (e.g. 2d6 + 3 slashing)"
                          className="sm:col-span-4 px-2.5 py-1.5 bg-zinc-900 border border-zinc-750 rounded-lg text-xs font-mono text-zinc-200 focus:outline-none focus:border-red-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const next = (editingMonster.actions || []).filter((_, i) => i !== aIdx);
                            setEditingMonster({ ...editingMonster, actions: next });
                          }}
                          className="sm:col-span-1 p-1.5 text-zinc-500 hover:text-red-400 rounded-lg flex justify-center cursor-pointer"
                          title="Remove Action"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <textarea
                        rows={2}
                        value={act.description || ''}
                        onChange={(e) => {
                          const next = [...(editingMonster.actions || [])];
                          next[aIdx] = { ...next[aIdx], description: e.target.value };
                          setEditingMonster({ ...editingMonster, actions: next });
                        }}
                        placeholder="Action description (e.g. Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 10 (2d6 + 3) slashing damage.)"
                        className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-750 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-red-500"
                      />
                    </div>
                  ))}
                </div>

              </div>
            ) : selectedMonster ? (
              /* ================= STAT BLOCK DISPLAY ================= */
              <div className="max-w-3xl mx-auto w-full space-y-6">
                
                {/* Top Action Bar */}
                <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleSpawnOnCanvas(selectedMonster)}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-950/50 flex items-center gap-2 cursor-pointer transition-all transform active:scale-95"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      Spawn Token on Battlemap
                    </button>
                    <button
                      onClick={() => {
                        setEditingMonster(selectedMonster);
                        setIsEditing(true);
                      }}
                      className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs rounded-xl flex items-center gap-2 cursor-pointer transition-all"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Edit Stats
                    </button>

                    {/* Quick Upload Token Artwork */}
                    <label className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-amber-300 hover:text-amber-200 font-bold text-xs rounded-xl flex items-center gap-2 cursor-pointer transition-all shadow-sm">
                      {isUploadingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" /> : <Upload className="w-3.5 h-3.5 text-amber-400" />}
                      <span>{isUploadingImage ? 'Uploading Token...' : 'Upload Token Image'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarFileUpload}
                        className="hidden"
                        disabled={isUploadingImage}
                      />
                    </label>
                  </div>

                  <button
                    onClick={(e) => handleRequestDelete(selectedMonster, e)}
                    className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer"
                    title="Delete Creature"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Authentic D&D 5e Parchment Stat Block Container */}
                <div className="bg-[#f2e6cb] text-zinc-900 rounded-2xl p-6 sm:p-8 border-2 border-[#a38048] shadow-2xl relative font-serif select-text">
                  
                  {/* Top Header */}
                  <div className="border-b-2 border-[#822000] pb-2 mb-2 flex items-start justify-between gap-4">
                    <div>
                      <h1 className="text-2xl sm:text-3xl font-extrabold text-[#822000] tracking-tight uppercase">
                        {selectedMonster.name}
                      </h1>
                      <p className="text-xs italic font-sans text-zinc-700">
                        {selectedMonster.size} {selectedMonster.type}, {selectedMonster.alignment}
                      </p>
                    </div>

                    {selectedMonster.avatarUrl && (
                      <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-[#a38048] shadow shrink-0">
                        <img
                          src={selectedMonster.avatarUrl}
                          alt={selectedMonster.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>

                  {/* Red Divider Line */}
                  <div className="h-0.5 bg-[#822000] my-2" />

                  {/* Core Stats Section */}
                  <div className="space-y-1 text-sm font-sans text-[#822000]">
                    <div>
                      <strong className="text-zinc-900">Armor Class</strong> {selectedMonster.ac} {selectedMonster.acNotes}
                    </div>
                    <div>
                      <strong className="text-zinc-900">Hit Points</strong> {selectedMonster.hp} {selectedMonster.hpFormula}
                    </div>
                    <div>
                      <strong className="text-zinc-900">Speed</strong> {selectedMonster.speed}
                    </div>
                  </div>

                  {/* Red Divider Line */}
                  <div className="h-0.5 bg-[#822000] my-2" />

                  {/* Ability Scores Table */}
                  <div className="grid grid-cols-6 gap-1 text-center font-sans my-3 py-1 bg-[#e8d7b3] rounded-lg border border-[#cbba93]">
                    {[
                      { label: 'STR', score: selectedMonster.str },
                      { label: 'DEX', score: selectedMonster.dex },
                      { label: 'CON', score: selectedMonster.con },
                      { label: 'INT', score: selectedMonster.int },
                      { label: 'WIS', score: selectedMonster.wis },
                      { label: 'CHA', score: selectedMonster.cha },
                    ].map(st => (
                      <div key={st.label} className="p-1">
                        <span className="block text-[11px] font-bold text-[#822000]">{st.label}</span>
                        <span className="text-xs font-semibold text-zinc-900">
                          {st.score} ({getAbilityMod(st.score)})
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Red Divider Line */}
                  <div className="h-0.5 bg-[#822000] my-2" />

                  {/* Secondary Attributes */}
                  <div className="space-y-1 text-xs font-sans text-zinc-800">
                    {selectedMonster.savingThrows && (
                      <div><strong className="text-[#822000]">Saving Throws</strong> {selectedMonster.savingThrows}</div>
                    )}
                    {selectedMonster.skills && (
                      <div><strong className="text-[#822000]">Skills</strong> {selectedMonster.skills}</div>
                    )}
                    {selectedMonster.damageResistances && (
                      <div><strong className="text-[#822000]">Damage Resistances</strong> {selectedMonster.damageResistances}</div>
                    )}
                    {selectedMonster.damageImmunities && (
                      <div><strong className="text-[#822000]">Damage Immunities</strong> {selectedMonster.damageImmunities}</div>
                    )}
                    {selectedMonster.conditionImmunities && (
                      <div><strong className="text-[#822000]">Condition Immunities</strong> {selectedMonster.conditionImmunities}</div>
                    )}
                    {selectedMonster.senses && (
                      <div><strong className="text-[#822000]">Senses</strong> {selectedMonster.senses}</div>
                    )}
                    {selectedMonster.languages && (
                      <div><strong className="text-[#822000]">Languages</strong> {selectedMonster.languages}</div>
                    )}
                    <div>
                      <strong className="text-[#822000]">Challenge</strong> {selectedMonster.challenge} (Proficiency Bonus +{selectedMonster.proficiencyBonus || 2})
                    </div>
                  </div>

                  {/* Red Divider Line */}
                  <div className="h-0.5 bg-[#822000] my-3" />

                  {/* Traits */}
                  {selectedMonster.traits && selectedMonster.traits.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {selectedMonster.traits.map((tr, idx) => (
                        <div key={idx} className="text-xs leading-relaxed">
                          <em className="font-bold font-serif text-[#822000] text-sm not-italic">{tr.name}. </em>
                          <span className="font-sans whitespace-pre-line">{tr.description}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Actions Section Header */}
                  {selectedMonster.actions && selectedMonster.actions.length > 0 && (
                    <div className="mt-4">
                      <h3 className="text-lg font-bold text-[#822000] border-b border-[#822000] pb-0.5 mb-2 uppercase font-serif tracking-wide">
                        Actions
                      </h3>
                      <div className="space-y-2.5">
                        {selectedMonster.actions.map((act, idx) => (
                          <div key={idx} className="text-xs leading-relaxed">
                            <em className="font-bold font-serif text-[#822000] text-sm not-italic">{act.name}. </em>
                            <span className="font-sans whitespace-pre-line">{act.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Raw Screenshot reference if attached */}
                  {selectedMonster.statblockImageUrl && (
                    <div className="mt-6 pt-4 border-t border-[#a38048]/40">
                      <span className="text-[10px] font-mono font-bold text-zinc-600 block mb-2 uppercase">
                        Original Digested Stat-block Screenshot (Click to enlarge)
                      </span>
                      <img
                        src={selectedMonster.statblockImageUrl}
                        alt="Original screenshot"
                        onClick={() => setFullScreenStatblockUrl(selectedMonster.statblockImageUrl || null)}
                        className="max-h-60 rounded-xl border border-[#a38048] object-contain shadow cursor-pointer hover:opacity-95 hover:scale-[1.01] transition-all"
                        title="Click to view full size"
                      />
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-zinc-500">
                <BookOpen className="w-12 h-12 mb-3 text-zinc-700" />
                <p className="text-sm font-mono">Select a creature on the left or create a new one.</p>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* "Are you sure?" Delete Monster Confirmation Dialog */}
      {monsterToDelete && (
        <div 
          className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setMonsterToDelete(null)}
        >
          <div 
            className="w-full max-w-md bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl p-6 flex flex-col gap-5 text-zinc-100 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center shrink-0 text-red-400 shadow-inner shadow-red-500/10">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                  Delete Creature?
                </h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Are you sure you want to delete <span className="font-semibold text-amber-300">"{monsterToDelete.name}"</span> from your Monster Manual?
                </p>
              </div>
            </div>

            {/* Creature Info Preview */}
            <div className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-400 flex items-center gap-3">
              {monsterToDelete.avatarUrl ? (
                <img
                  src={monsterToDelete.avatarUrl}
                  alt={monsterToDelete.name}
                  className="w-11 h-11 rounded-lg object-cover border border-zinc-700 shrink-0"
                />
              ) : (
                <div className="w-11 h-11 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-500 shrink-0 font-bold text-base">
                  {monsterToDelete.name.charAt(0)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-bold text-zinc-200 truncate text-sm">{monsterToDelete.name}</div>
                <div className="text-[11px] text-zinc-500 font-mono">
                  {monsterToDelete.size} {monsterToDelete.type} • CR {monsterToDelete.challenge} • HP {monsterToDelete.hp} • AC {monsterToDelete.ac}
                </div>
              </div>
            </div>

            <p className="text-[11px] text-zinc-500 italic">
              This action will remove the creature from your compendium listings.
            </p>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-zinc-800/80">
              <button
                type="button"
                onClick={() => setMonsterToDelete(null)}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/30 flex items-center gap-1.5 transition-all cursor-pointer hover:scale-105 active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Yes, Delete Creature
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-size Statblock Screenshot Modal Popup */}
      {fullScreenStatblockUrl && (
        <div 
          className="fixed inset-0 z-[150] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setFullScreenStatblockUrl(null)}
        >
          <div 
            className="relative max-w-5xl max-h-[90vh] bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl p-4 flex flex-col items-center overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between pb-3 border-b border-zinc-800 mb-3">
              <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                Original Digested Stat-block Screenshot
              </span>
              <button
                type="button"
                onClick={() => setFullScreenStatblockUrl(null)}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <img
              src={fullScreenStatblockUrl}
              alt="Full size statblock screenshot"
              className="max-w-full max-h-[80vh] object-contain rounded-xl border border-zinc-700 shadow-inner"
            />
          </div>
        </div>
      )}

      {/* D&D Beyond Sync Modal */}
      <DdbSyncModal
        isOpen={isDdbSyncModalOpen}
        onClose={() => {
          setIsDdbSyncModalOpen(false);
          setDdbInitialSearch('');
        }}
        initialSearchQuery={ddbInitialSearch}
        initialTab="live_search"
        onMonsterImportedToCompendium={(newMonster) => {
          setMonsters(prev => {
            if (prev.some(m => m.monsterId === newMonster.monsterId)) return prev;
            return [newMonster, ...prev];
          });
          setSelectedMonster(newMonster);
        }}
      />

    </div>
  );
};
