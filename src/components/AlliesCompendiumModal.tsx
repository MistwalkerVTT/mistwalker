import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  Plus,
  Sparkles,
  Trash2,
  Edit2,
  Play,
  Shield,
  Heart,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Copy,
  ChevronRight,
  Move,
  Globe,
  Loader2,
  Image as ImageIcon
} from 'lucide-react';
import { Ally, AllyTrait, AllyAction, getSizeMultiplier } from '../types/ally';
import { DEFAULT_ALLIES } from '../data/defaultAllies';
import {
  subscribeToAllies,
  saveAlly,
  deleteAlly,
  uploadAndRegisterAsset
} from '../lib/firebase';
import { toast } from 'sonner';

interface AlliesCompendiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSpawnTokenOnMap: (tokenData: {
    name: string;
    avatarUrl: string;
    hp: number;
    ac: number;
    size: number;
    category?: 'ally';
    allyId?: string;
  }) => void;
  initialSearchQuery?: string;
}

export const AlliesCompendiumModal: React.FC<AlliesCompendiumModalProps> = ({
  isOpen,
  onClose,
  onSpawnTokenOnMap,
  initialSearchQuery = ''
}) => {
  const [allies, setAllies] = useState<Ally[]>(DEFAULT_ALLIES);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedAlly, setSelectedAlly] = useState<Ally | null>(DEFAULT_ALLIES[0] || null);

  // Form State for Create / Edit
  const [isEditing, setIsEditing] = useState(false);
  const [editingAlly, setEditingAlly] = useState<Partial<Ally>>({
    name: '',
    size: 'Medium',
    type: 'Beast',
    summonSource: 'Druid (Conjure Animals)',
    alignment: 'Unaligned',
    ac: 12,
    acNotes: '',
    hp: 20,
    hpFormula: '(3d8 + 6)',
    speed: '40 ft.',
    initiativeBonus: 2,
    str: 14,
    dex: 14,
    con: 14,
    int: 4,
    wis: 12,
    cha: 6,
    challenge: '1/4 (50 XP)',
    proficiencyBonus: 2,
    avatarUrl: 'https://www.dndbeyond.com/avatars/43939/948/638607435568755201.png',
    traits: [],
    actions: [],
    category: 'ally'
  });

  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [allyToDelete, setAllyToDelete] = useState<Ally | null>(null);

  // D&D Beyond Token Search / Pairing Modal state
  const [isDdbPickerOpen, setIsDdbPickerOpen] = useState(false);
  const [ddbPickerMode, setDdbPickerMode] = useState<'pair_statblock' | 'pair_form' | 'import_new'>('pair_statblock');
  const [ddbTargetAlly, setDdbTargetAlly] = useState<Ally | null>(null);
  const [ddbSearchQuery, setDdbSearchQuery] = useState('');
  const [ddbSearchResults, setDdbSearchResults] = useState<any[]>([]);
  const [isLoadingDdb, setIsLoadingDdb] = useState(false);
  const [ddbTypeFilter, setDdbTypeFilter] = useState('all');

  // Keep search query updated if initial changes
  useEffect(() => {
    if (initialSearchQuery) {
      setSearchQuery(initialSearchQuery);
    }
  }, [initialSearchQuery]);

  // Subscribe to real-time Firestore updates for allies
  useEffect(() => {
    const defaultAllyMap = new Map(DEFAULT_ALLIES.map(a => [a.allyId, a]));
    const unsubscribe = subscribeToAllies((firestoreAllies) => {
      if (firestoreAllies && firestoreAllies.length > 0) {
        // Upgrade any stale Unsplash or missing /uploads/ URLs to the official D&D Beyond token URLs
        const cleanedFirestoreAllies = firestoreAllies.map(fa => {
          const def = defaultAllyMap.get(fa.allyId);
          if (def && (!fa.avatarUrl || fa.avatarUrl.includes('images.unsplash.com') || fa.avatarUrl.startsWith('/uploads/'))) {
            return { ...fa, avatarUrl: def.avatarUrl };
          }
          return fa;
        });

        const firestoreIds = new Set(cleanedFirestoreAllies.map(a => a.allyId));
        const merged = [
          ...cleanedFirestoreAllies,
          ...DEFAULT_ALLIES.filter(a => !firestoreIds.has(a.allyId))
        ];
        setAllies(merged);
        if (!selectedAlly && merged.length > 0) {
          setSelectedAlly(merged[0]);
        }
      } else {
        setAllies(DEFAULT_ALLIES);
        if (!selectedAlly && DEFAULT_ALLIES.length > 0) {
          setSelectedAlly(DEFAULT_ALLIES[0]);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Search D&D Beyond Live / Local for monster tokens
  const searchDdbTokens = async (query: string, typeFilter: string = 'all') => {
    setIsLoadingDdb(true);
    try {
      let results: any[] = [];
      const cleanQ = query.trim();

      // 1. Try server live search endpoint
      try {
        const params = new URLSearchParams();
        if (cleanQ) params.set('q', cleanQ);
        params.set('limit', '36');
        if (typeFilter !== 'all') params.set('type', typeFilter);

        const res = await fetch(`/api/ddb/search?${params.toString()}`);
        if (res.ok) {
          const json = await res.json();
          results = json.monsters || [];
        }
      } catch (liveErr) {
        console.warn('Live DDB search failed, trying compendium fallback:', liveErr);
      }

      // 2. If results empty or live unavailable, query local compendium
      if (results.length === 0) {
        try {
          const res = await fetch('/data/dndbeyond_compendium.json');
          if (res.ok) {
            const comp: any[] = await res.json();
            results = comp.filter(m => {
              const matchesName = !cleanQ || m.name.toLowerCase().includes(cleanQ.toLowerCase()) || (m.type && m.type.toLowerCase().includes(cleanQ.toLowerCase()));
              const matchesType = typeFilter === 'all' || (m.type && m.type.toLowerCase().includes(typeFilter.toLowerCase()));
              return matchesName && matchesType;
            }).slice(0, 36);
          }
        } catch (compErr) {
          console.warn('Compendium fallback failed:', compErr);
        }
      }

      // Filter to only monsters with valid avatarUrl
      const valid = results.filter(m => m.avatarUrl || m.largeAvatarUrl);
      setDdbSearchResults(valid);
    } catch (err: any) {
      console.error('Error searching D&D Beyond tokens:', err);
      toast.error('Failed to search D&D Beyond tokens.');
    } finally {
      setIsLoadingDdb(false);
    }
  };

  const openDdbPickerForAlly = (ally: Ally) => {
    setDdbPickerMode('pair_statblock');
    setDdbTargetAlly(ally);
    const cleanName = ally.name.replace(/\s*\(Summoned\)/i, '').replace(/ Familiar/i, '').replace(/\\'/g, "'").trim();
    setDdbSearchQuery(cleanName);
    setIsDdbPickerOpen(true);
    searchDdbTokens(cleanName, 'all');
  };

  const openDdbPickerForForm = () => {
    setDdbPickerMode('pair_form');
    const cleanName = (editingAlly.name || '').replace(/\s*\(Summoned\)/i, '').replace(/ Familiar/i, '').trim();
    setDdbSearchQuery(cleanName || 'Wolf');
    setIsDdbPickerOpen(true);
    searchDdbTokens(cleanName || 'Wolf', 'all');
  };

  const openDdbPickerForImport = () => {
    setDdbPickerMode('import_new');
    setDdbTargetAlly(null);
    setDdbSearchQuery('Wolf');
    setIsDdbPickerOpen(true);
    searchDdbTokens('Wolf', 'all');
  };

  const handleSelectDdbToken = async (monster: any) => {
    const avatar = monster.largeAvatarUrl || monster.avatarUrl;
    if (!avatar) return;

    if (ddbPickerMode === 'pair_form') {
      setEditingAlly(prev => ({
        ...prev,
        avatarUrl: avatar
      }));
      toast.success(`Paired "${monster.name}" token art with form!`);
      setIsDdbPickerOpen(false);
    } else if (ddbPickerMode === 'pair_statblock' && ddbTargetAlly) {
      try {
        const updatedAlly: Ally = {
          ...ddbTargetAlly,
          avatarUrl: avatar,
          updatedAt: Date.now()
        };
        await saveAlly(updatedAlly);
        setSelectedAlly(updatedAlly);
        setAllies(prev => prev.map(a => a.allyId === updatedAlly.allyId ? updatedAlly : a));
        toast.success(`Paired "${monster.name}" token art with ${updatedAlly.name}!`);
        setIsDdbPickerOpen(false);
      } catch (err: any) {
        toast.error('Failed to save paired token art: ' + err.message);
      }
    } else if (ddbPickerMode === 'import_new') {
      await handleImportAsNewAlly(monster);
    }
  };

  const handleImportAsNewAlly = async (monster: any) => {
    const avatar = monster.largeAvatarUrl || monster.avatarUrl || 'https://www.dndbeyond.com/avatars/43939/948/638607435568755201.png';
    try {
      const newAlly: Ally = {
        allyId: `ally_ddb_${monster.monsterId ? monster.monsterId.replace('ddb_', '') : Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: monster.name,
        size: monster.size || 'Medium',
        type: monster.type || 'Beast',
        summonSource: `D&D Beyond (${monster.source || 'Monster Manual'})`,
        alignment: monster.alignment || 'Unaligned',
        ac: Number(monster.ac) || 10,
        acNotes: monster.acNotes || '',
        hp: Number(monster.hp) || 10,
        hpFormula: monster.hpFormula || '',
        speed: monster.speed || '30 ft.',
        initiativeBonus: Number(monster.initiativeBonus) || 0,
        str: Number(monster.str) || 10,
        dex: Number(monster.dex) || 10,
        con: Number(monster.con) || 10,
        int: Number(monster.int) || 10,
        wis: Number(monster.wis) || 10,
        cha: Number(monster.cha) || 10,
        savingThrows: monster.savingThrows || '',
        skills: monster.skills || '',
        damageResistances: monster.damageResistances || '',
        damageImmunities: monster.damageImmunities || '',
        conditionImmunities: monster.conditionImmunities || '',
        senses: monster.senses || '',
        languages: monster.languages || '—',
        challenge: monster.challenge || 'Custom',
        proficiencyBonus: Number(monster.proficiencyBonus) || 2,
        avatarUrl: avatar,
        traits: monster.traits || [],
        actions: monster.actions || [],
        reactions: monster.reactions || [],
        bonusActions: monster.bonusActions || [],
        description: `Imported summon from D&D Beyond: ${monster.name}.`,
        source: monster.source || 'D&D Beyond',
        category: 'ally',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      await saveAlly(newAlly);
      setAllies(prev => [newAlly, ...prev.filter(a => a.allyId !== newAlly.allyId)]);
      setSelectedAlly(newAlly);
      toast.success(`Imported "${newAlly.name}" as summon with D&D Beyond token art!`);
      setIsDdbPickerOpen(false);
    } catch (err: any) {
      toast.error('Failed to import summon: ' + err.message);
    }
  };

  if (!isOpen) return null;

  // Category tags for easy filtering
  const CATEGORIES = [
    { id: 'all', label: 'All Allies & Summons' },
    { id: 'druid', label: 'Druid Summons' },
    { id: 'familiar', label: 'Familiars' },
    { id: 'elemental', label: 'Elementals' },
    { id: 'construct', label: 'Spells & Constructs' },
    { id: 'steed', label: 'Steeds & Mounts' },
    { id: 'undead', label: 'Undead Summons' }
  ];

  // Filtering
  const filteredAllies = allies.filter(a => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q ||
      a.name.toLowerCase().includes(q) ||
      (a.summonSource && a.summonSource.toLowerCase().includes(q)) ||
      (a.type && a.type.toLowerCase().includes(q)) ||
      (a.challenge && a.challenge.toLowerCase().includes(q)) ||
      (a.description && a.description.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'druid') {
      return (a.summonSource && a.summonSource.toLowerCase().includes('druid')) ||
             (a.type && a.type.toLowerCase() === 'beast');
    }
    if (selectedCategory === 'familiar') {
      return (a.summonSource && a.summonSource.toLowerCase().includes('familiar')) ||
             (a.summonSource && a.summonSource.toLowerCase().includes('pact of the chain'));
    }
    if (selectedCategory === 'elemental') {
      return (a.type && a.type.toLowerCase().includes('elemental'));
    }
    if (selectedCategory === 'construct') {
      return (a.type && (a.type.toLowerCase().includes('construct') || a.type.toLowerCase().includes('force')));
    }
    if (selectedCategory === 'steed') {
      return (a.summonSource && a.summonSource.toLowerCase().includes('steed'));
    }
    if (selectedCategory === 'undead') {
      return (a.type && a.type.toLowerCase().includes('undead'));
    }

    return true;
  });

  // Spawn Handler
  const handleSpawnOnCanvas = (ally: Ally) => {
    const mult = getSizeMultiplier(ally.size);
    onSpawnTokenOnMap({
      name: ally.name,
      avatarUrl: ally.avatarUrl,
      hp: ally.hp,
      ac: ally.ac,
      size: mult,
      category: 'ally',
      allyId: ally.allyId
    });
    toast.success(`Spawned ${ally.name} onto the map!`, {
      description: `HP: ${ally.hp} • AC: ${ally.ac} • Size: ${mult}x${mult}`
    });
    onClose();
  };

  // Save handler for custom / edited ally
  const handleSaveAlly = async () => {
    if (!editingAlly.name?.trim()) {
      toast.error('Please enter a name for the ally/summon.');
      return;
    }

    try {
      const allyToSave: Ally = {
        allyId: editingAlly.allyId || `ally_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: editingAlly.name.trim(),
        size: editingAlly.size || 'Medium',
        type: editingAlly.type || 'Beast',
        summonSource: editingAlly.summonSource || 'Custom Summon',
        alignment: editingAlly.alignment || 'Unaligned',
        ac: Number(editingAlly.ac) || 10,
        acNotes: editingAlly.acNotes || '',
        hp: Number(editingAlly.hp) || 10,
        hpFormula: editingAlly.hpFormula || '',
        speed: editingAlly.speed || '30 ft.',
        initiativeBonus: Number(editingAlly.initiativeBonus) || 0,
        str: Number(editingAlly.str) || 10,
        dex: Number(editingAlly.dex) || 10,
        con: Number(editingAlly.con) || 10,
        int: Number(editingAlly.int) || 10,
        wis: Number(editingAlly.wis) || 10,
        cha: Number(editingAlly.cha) || 10,
        savingThrows: editingAlly.savingThrows || '',
        skills: editingAlly.skills || '',
        damageResistances: editingAlly.damageResistances || '',
        damageImmunities: editingAlly.damageImmunities || '',
        conditionImmunities: editingAlly.conditionImmunities || '',
        senses: editingAlly.senses || '',
        languages: editingAlly.languages || '—',
        challenge: editingAlly.challenge || 'Custom',
        proficiencyBonus: Number(editingAlly.proficiencyBonus) || 2,
        avatarUrl: editingAlly.avatarUrl || 'https://images.unsplash.com/photo-1564865878688-9a244444042a?auto=format&fit=crop&w=300&q=80',
        traits: editingAlly.traits || [],
        actions: editingAlly.actions || [],
        bonusActions: editingAlly.bonusActions || [],
        reactions: editingAlly.reactions || [],
        description: editingAlly.description || '',
        source: editingAlly.source || 'Custom Compendium',
        category: 'ally'
      };

      await saveAlly(allyToSave);
      toast.success(`Saved "${allyToSave.name}" to Allies Compendium!`);
      setSelectedAlly(allyToSave);
      setIsEditing(false);
    } catch (err: any) {
      console.error('Failed to save ally:', err);
      toast.error('Failed to save ally: ' + (err?.message || 'Unknown error'));
    }
  };

  // Duplicate an existing ally for quick scaling
  const handleDuplicateAlly = (ally: Ally) => {
    setEditingAlly({
      ...ally,
      allyId: `ally_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: `${ally.name} (Copy)`,
      category: 'ally'
    });
    setIsEditing(true);
    toast.info(`Duplicating "${ally.name}" - edit stats and save as new summon.`);
  };

  // Delete handler
  const handleConfirmDelete = async () => {
    if (!allyToDelete) return;
    try {
      await deleteAlly(allyToDelete.allyId);
      setAllies(curr => curr.filter(a => a.allyId !== allyToDelete.allyId));
      if (selectedAlly?.allyId === allyToDelete.allyId) {
        setSelectedAlly(null);
      }
      toast.success(`Removed "${allyToDelete.name}" from Compendium.`);
      setAllyToDelete(null);
    } catch (err: any) {
      console.error('Failed to delete ally:', err);
      toast.error('Failed to delete ally: ' + (err?.message || 'Unknown error'));
    }
  };

  // Avatar upload
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingImage(true);
      const uploaded = await uploadAndRegisterAsset(file, 'token');
      if (uploaded?.url) {
        setEditingAlly(prev => ({ ...prev, avatarUrl: uploaded.url }));
        toast.success('Token art uploaded!');
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      toast.error('Failed to upload image');
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Helper for ability modifier format
  const getMod = (score: number) => {
    const mod = Math.floor((score - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-6xl h-[92vh] max-h-[920px] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-zinc-100 relative">
        
        {/* Top Header Bar */}
        <div className="px-6 py-4 bg-zinc-900/90 border-b border-zinc-800/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/20 to-emerald-500/20 border border-amber-500/30 flex items-center justify-center shadow-inner">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white font-serif tracking-wide">
                  Allies & Summons Compendium
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-semibold">
                  Druid Summons • Familiars • Steeds
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Browse, customize, and spawn friendly summons, companions, wild shapes, and mounts onto the battlemap.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={openDdbPickerForImport}
              className="px-3.5 py-1.5 bg-gradient-to-r from-amber-700/80 to-amber-600/80 hover:from-amber-600 hover:to-amber-500 border border-amber-500/50 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5 transition-all cursor-pointer"
              title="Search D&D Beyond's bestiary to import summons and pair official tokens"
            >
              <Globe className="w-4 h-4 text-amber-300" />
              Import from D&D Beyond
            </button>

            <button
              onClick={() => {
                setEditingAlly({
                  name: '',
                  size: 'Medium',
                  type: 'Beast',
                  summonSource: 'Druid (Conjure Animals)',
                  alignment: 'Unaligned',
                  ac: 12,
                  acNotes: '',
                  hp: 20,
                  hpFormula: '(3d8 + 6)',
                  speed: '30 ft.',
                  initiativeBonus: 2,
                  str: 14, dex: 14, con: 14, int: 4, wis: 12, cha: 6,
                  challenge: '1/4 (50 XP)',
                  proficiencyBonus: 2,
                  avatarUrl: 'https://www.dndbeyond.com/avatars/43939/948/638607435568755201.png',
                  traits: [],
                  actions: [],
                  category: 'ally'
                });
                setIsEditing(true);
              }}
              className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-700/80 to-emerald-600/80 hover:from-emerald-600 hover:to-emerald-500 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5 transition-all cursor-pointer border border-emerald-500/40"
            >
              <Plus className="w-4 h-4" />
              New Ally / Summon
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Close Compendium"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Body Grid: Left List (4 Cols) + Right Statblock / Editor (8 Cols) */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden bg-zinc-950/60">
          
          {/* Left Panel: Catalog List & Search (4 Cols) */}
          <div className="md:col-span-4 border-r border-zinc-800/80 flex flex-col h-full bg-zinc-900/40 overflow-hidden">
            
            {/* Search Box & Category Filter */}
            <div className="p-3 border-b border-zinc-800/80 space-y-2 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search summons, druid beasts, familiars..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-700/80 rounded-xl text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] no-scrollbar">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-2.5 py-1 rounded-lg font-mono whitespace-nowrap transition-all ${
                      selectedCategory === cat.id
                        ? 'bg-amber-600 text-white font-bold shadow-sm'
                        : 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Allies List Scrollable */}
            <div className="flex-1 overflow-y-auto p-2 pr-3 space-y-2">
              {filteredAllies.length === 0 ? (
                <div className="p-6 text-center text-zinc-500 text-xs space-y-2">
                  <p>No allies or summons found matching "{searchQuery}".</p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('all');
                    }}
                    className="text-amber-400 underline font-mono cursor-pointer"
                  >
                    Reset Search & Filters
                  </button>
                </div>
              ) : (
                filteredAllies.map(a => {
                  const isSelected = selectedAlly?.allyId === a.allyId && !isEditing;
                  const mult = getSizeMultiplier(a.size);
                  return (
                    <div
                      key={a.allyId}
                      onClick={() => {
                        setSelectedAlly(a);
                        setIsEditing(false);
                      }}
                      draggable={true}
                      onDragStart={(e) => {
                        const tokenData = {
                          name: a.name,
                          url: a.avatarUrl,
                          size: mult,
                          hp: a.hp,
                          maxHp: a.hp,
                          currentHp: a.hp,
                          ac: a.ac,
                          isMonster: false,
                          isPlayer: false,
                          category: 'ally',
                          allyId: a.allyId
                        };
                        e.dataTransfer.setData('application/json', JSON.stringify(tokenData));
                        e.dataTransfer.setData('text/plain', a.name);
                        e.dataTransfer.effectAllowed = 'copy';
                      }}
                      className={`group p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between select-none ${
                        isSelected
                          ? 'bg-gradient-to-r from-amber-950/40 to-emerald-950/30 border-amber-500/60 shadow-lg'
                          : 'bg-zinc-900/60 hover:bg-zinc-800/80 border-zinc-800/80'
                      }`}
                      title={`${a.name} (${a.size} ${a.type})\n${a.summonSource}\nDrag onto battlemap or click to view statblock`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-11 h-11 rounded-xl overflow-hidden bg-zinc-950 border border-zinc-750 shrink-0 relative">
                          <img
                            src={a.avatarUrl}
                            alt={a.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = 'https://www.dndbeyond.com/avatars/43939/948/638607435568755201.png';
                            }}
                          />
                          {mult > 1 && (
                            <span className="absolute bottom-0 right-0 bg-amber-700 text-white text-[7px] font-bold px-1 rounded-tl">
                              {mult}x
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-zinc-100 truncate font-serif">
                            {a.name}
                          </h4>
                          <div className="text-[10px] font-mono text-amber-400/90 truncate font-semibold">
                            {a.summonSource}
                          </div>
                          <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-400 mt-0.5">
                            <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                              <Heart className="w-2.5 h-2.5 text-emerald-500 fill-emerald-500/30" /> {a.hp} HP
                            </span>
                            <span className="flex items-center gap-1 text-sky-400">
                              <Shield className="w-2.5 h-2.5 text-sky-400" /> AC {a.ac}
                            </span>
                            <span className="text-zinc-500">
                              {a.size}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSpawnOnCanvas(a);
                          }}
                          className="p-1.5 bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/40 text-emerald-300 hover:text-white rounded-lg transition-all cursor-pointer"
                          title="Spawn Token onto Map"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicateAlly(a);
                          }}
                          className="p-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-750 text-zinc-400 hover:text-zinc-200 rounded-lg transition-all cursor-pointer"
                          title="Duplicate & Customize Summon"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Panel: Statblock Display OR Form Editor (8 Cols) */}
          <div className="md:col-span-8 h-full flex flex-col overflow-y-auto p-6 bg-zinc-950">
            {isEditing ? (
              /* ================= EDIT / CREATE FORM ================= */
              <div className="space-y-6 max-w-2xl mx-auto w-full">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                  <h3 className="text-lg font-bold text-amber-400 font-serif flex items-center gap-2">
                    <Edit2 className="w-5 h-5" />
                    {editingAlly.allyId ? 'Customize Ally / Summon' : 'Add New Ally / Summon'}
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveAlly}
                      className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-950/40"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Save to Compendium
                    </button>
                  </div>
                </div>

                {/* Form fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-mono text-zinc-400 block mb-1">Name</label>
                    <input
                      type="text"
                      value={editingAlly.name || ''}
                      onChange={e => setEditingAlly({ ...editingAlly, name: e.target.value })}
                      placeholder="e.g. Dire Wolf, Wildfire Spirit"
                      className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-zinc-200"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-mono text-zinc-400 block mb-1">Summon Source</label>
                    <input
                      type="text"
                      value={editingAlly.summonSource || ''}
                      onChange={e => setEditingAlly({ ...editingAlly, summonSource: e.target.value })}
                      placeholder="e.g. Druid (Conjure Animals), Find Familiar"
                      className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-zinc-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-[11px] font-mono text-zinc-400 block mb-1">Size</label>
                    <select
                      value={editingAlly.size || 'Medium'}
                      onChange={e => setEditingAlly({ ...editingAlly, size: e.target.value as any })}
                      className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-zinc-200"
                    >
                      <option value="Tiny">Tiny (0.5x)</option>
                      <option value="Small">Small (0.8x)</option>
                      <option value="Medium">Medium (1x)</option>
                      <option value="Large">Large (2x)</option>
                      <option value="Huge">Huge (3x)</option>
                      <option value="Gargantuan">Gargantuan (4x)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-mono text-zinc-400 block mb-1">Type</label>
                    <input
                      type="text"
                      value={editingAlly.type || ''}
                      onChange={e => setEditingAlly({ ...editingAlly, type: e.target.value })}
                      placeholder="e.g. Beast, Fey, Elemental"
                      className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-zinc-200"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-mono text-zinc-400 block mb-1">Speed</label>
                    <input
                      type="text"
                      value={editingAlly.speed || ''}
                      onChange={e => setEditingAlly({ ...editingAlly, speed: e.target.value })}
                      placeholder="e.g. 40 ft., fly 60 ft."
                      className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-zinc-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-[11px] font-mono text-zinc-400 block mb-1">Hit Points (HP)</label>
                    <input
                      type="number"
                      value={editingAlly.hp || 10}
                      onChange={e => setEditingAlly({ ...editingAlly, hp: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-zinc-200"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-mono text-zinc-400 block mb-1">Armor Class (AC)</label>
                    <input
                      type="number"
                      value={editingAlly.ac || 10}
                      onChange={e => setEditingAlly({ ...editingAlly, ac: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-zinc-200"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-mono text-zinc-400 block mb-1">Challenge / Level</label>
                    <input
                      type="text"
                      value={editingAlly.challenge || ''}
                      onChange={e => setEditingAlly({ ...editingAlly, challenge: e.target.value })}
                      placeholder="e.g. 1 (200 XP)"
                      className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-zinc-200"
                    />
                  </div>
                </div>

                {/* Avatar / Token URL & Upload */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-mono text-zinc-400">Token Image URL</label>
                    <button
                      type="button"
                      onClick={openDdbPickerForForm}
                      className="text-[10px] font-mono text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      Find Art on D&D Beyond
                    </button>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-zinc-900 border border-zinc-700 shrink-0 relative">
                      <img
                        src={editingAlly.avatarUrl || 'https://www.dndbeyond.com/avatars/43939/948/638607435568755201.png'}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = 'https://www.dndbeyond.com/avatars/43939/948/638607435568755201.png';
                        }}
                      />
                    </div>
                    <input
                      type="text"
                      value={editingAlly.avatarUrl || ''}
                      onChange={e => setEditingAlly({ ...editingAlly, avatarUrl: e.target.value })}
                      placeholder="Paste image URL..."
                      className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-zinc-200"
                    />
                    <button
                      type="button"
                      onClick={openDdbPickerForForm}
                      className="px-3 py-2 bg-amber-600/20 hover:bg-amber-600 border border-amber-500/40 text-amber-300 hover:text-white rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                      title="Search D&D Beyond for official token art"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      D&D Beyond
                    </button>
                    <label className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-650 rounded-lg text-xs font-mono text-zinc-200 cursor-pointer">
                      {isUploadingImage ? 'Uploading...' : 'Upload File'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Ability Scores */}
                <div>
                  <label className="text-[11px] font-mono text-zinc-400 block mb-1">Ability Scores</label>
                  <div className="grid grid-cols-6 gap-2 text-center">
                    {(['str', 'dex', 'con', 'int', 'wis', 'cha'] as const).map(stat => (
                      <div key={stat} className="bg-zinc-900 p-2 rounded-lg border border-zinc-800">
                        <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase">{stat}</span>
                        <input
                          type="number"
                          value={editingAlly[stat] || 10}
                          onChange={e => setEditingAlly({ ...editingAlly, [stat]: Number(e.target.value) })}
                          className="w-full text-center bg-zinc-800 rounded mt-1 text-xs text-zinc-200 py-0.5"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="text-[11px] font-mono text-zinc-400 block mb-1">Description / Notes</label>
                  <textarea
                    rows={2}
                    value={editingAlly.description || ''}
                    onChange={e => setEditingAlly({ ...editingAlly, description: e.target.value })}
                    placeholder="Short description or tactical summoning tips..."
                    className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-zinc-200"
                  />
                </div>
              </div>
            ) : selectedAlly ? (
              /* ================= 5E AUTHENTIC STATBLOCK DISPLAY ================= */
              <div className="max-w-2xl mx-auto w-full space-y-4">
                
                {/* Top Action Bar for Selected Ally */}
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-amber-400 font-semibold px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      {selectedAlly.summonSource}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSpawnOnCanvas(selectedAlly)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      Spawn Token on Map
                    </button>

                    <button
                      onClick={() => {
                        setEditingAlly({ ...selectedAlly });
                        setIsEditing(true);
                      }}
                      className="p-2 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-750 rounded-xl transition-all cursor-pointer"
                      title="Edit this statblock"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDuplicateAlly(selectedAlly)}
                      className="p-2 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-750 rounded-xl transition-all cursor-pointer"
                      title="Duplicate this summon"
                    >
                      <Copy className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setAllyToDelete(selectedAlly)}
                      className="p-2 bg-zinc-850 hover:bg-red-600/30 text-zinc-400 hover:text-red-400 border border-zinc-750 rounded-xl transition-all cursor-pointer"
                      title="Delete from Compendium"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 5E Parchment Style Statblock Box */}
                <div className="bg-[#fdf1dc] text-[#58180d] p-6 rounded-2xl shadow-2xl border-4 border-[#c9b084] font-serif select-text">
                  
                  {/* Header */}
                  <div className="flex items-start justify-between border-b-2 border-[#822000] pb-2 mb-2">
                    <div>
                      <h2 className="text-2xl font-bold tracking-wide uppercase text-[#822000] font-serif">
                        {selectedAlly.name}
                      </h2>
                      <div className="italic text-xs text-[#58180d]">
                        {selectedAlly.size} {selectedAlly.type}, {selectedAlly.alignment}
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-[#822000] shadow-md bg-zinc-900 shrink-0 relative group">
                        <img
                          src={selectedAlly.avatarUrl}
                          alt={selectedAlly.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = 'https://www.dndbeyond.com/avatars/43939/948/638607435568755201.png';
                          }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => openDdbPickerForAlly(selectedAlly)}
                        className="px-2.5 py-1.5 bg-[#822000]/10 hover:bg-[#822000] border border-[#822000]/40 text-[#822000] hover:text-[#fdf1dc] rounded-lg text-[10px] font-sans font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                        title="Search D&D Beyond to pair a high-resolution token image"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-700 hover:text-amber-300" />
                        Pair DDB Art
                      </button>
                    </div>
                  </div>

                  {/* Core Combat Stats */}
                  <div className="text-xs space-y-1 font-sans border-b border-[#a38048]/50 pb-2 mb-2">
                    <div>
                      <strong className="text-[#822000]">Armor Class</strong> {selectedAlly.ac} {selectedAlly.acNotes || ''}
                    </div>
                    <div>
                      <strong className="text-[#822000]">Hit Points</strong> {selectedAlly.hp} {selectedAlly.hpFormula ? `(${selectedAlly.hpFormula})` : ''}
                    </div>
                    <div>
                      <strong className="text-[#822000]">Speed</strong> {selectedAlly.speed}
                    </div>
                  </div>

                  {/* Ability Scores Table */}
                  <div className="grid grid-cols-6 gap-1 text-center py-2 border-b-2 border-[#822000] mb-2 font-sans">
                    {(['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as const).map(stat => {
                      const val = selectedAlly[stat.toLowerCase() as keyof Ally] as number || 10;
                      return (
                        <div key={stat}>
                          <div className="font-bold text-[11px] text-[#822000]">{stat}</div>
                          <div className="text-xs">{val} ({getMod(val)})</div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Skills, Senses, Languages, CR */}
                  <div className="text-xs space-y-1 font-sans border-b border-[#a38048]/50 pb-2 mb-3">
                    {selectedAlly.savingThrows && (
                      <div><strong className="text-[#822000]">Saving Throws</strong> {selectedAlly.savingThrows}</div>
                    )}
                    {selectedAlly.skills && (
                      <div><strong className="text-[#822000]">Skills</strong> {selectedAlly.skills}</div>
                    )}
                    {selectedAlly.damageResistances && (
                      <div><strong className="text-[#822000]">Damage Resistances</strong> {selectedAlly.damageResistances}</div>
                    )}
                    {selectedAlly.damageImmunities && (
                      <div><strong className="text-[#822000]">Damage Immunities</strong> {selectedAlly.damageImmunities}</div>
                    )}
                    {selectedAlly.conditionImmunities && (
                      <div><strong className="text-[#822000]">Condition Immunities</strong> {selectedAlly.conditionImmunities}</div>
                    )}
                    {selectedAlly.senses && (
                      <div><strong className="text-[#822000]">Senses</strong> {selectedAlly.senses}</div>
                    )}
                    <div>
                      <strong className="text-[#822000]">Languages</strong> {selectedAlly.languages || '—'}
                    </div>
                    <div>
                      <strong className="text-[#822000]">Challenge</strong> {selectedAlly.challenge} (Proficiency Bonus +{selectedAlly.proficiencyBonus || 2})
                    </div>
                  </div>

                  {/* Traits */}
                  {selectedAlly.traits && selectedAlly.traits.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {selectedAlly.traits.map((tr, idx) => (
                        <div key={idx} className="text-xs leading-relaxed">
                          <em className="font-bold font-serif text-[#822000] text-sm not-italic">{tr.name}. </em>
                          <span className="font-sans whitespace-pre-line">{tr.description}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  {selectedAlly.actions && selectedAlly.actions.length > 0 && (
                    <div className="mt-3">
                      <h3 className="text-md font-bold text-[#822000] border-b border-[#822000] pb-0.5 mb-2 uppercase font-serif tracking-wide">
                        Actions
                      </h3>
                      <div className="space-y-2">
                        {selectedAlly.actions.map((act, idx) => (
                          <div key={idx} className="text-xs leading-relaxed">
                            <em className="font-bold font-serif text-[#822000] text-sm not-italic">{act.name}. </em>
                            <span className="font-sans whitespace-pre-line">{act.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Bonus Actions */}
                  {selectedAlly.bonusActions && selectedAlly.bonusActions.length > 0 && (
                    <div className="mt-3">
                      <h3 className="text-md font-bold text-[#822000] border-b border-[#822000] pb-0.5 mb-2 uppercase font-serif tracking-wide">
                        Bonus Actions
                      </h3>
                      <div className="space-y-2">
                        {selectedAlly.bonusActions.map((act, idx) => (
                          <div key={idx} className="text-xs leading-relaxed">
                            <em className="font-bold font-serif text-[#822000] text-sm not-italic">{act.name}. </em>
                            <span className="font-sans whitespace-pre-line">{act.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Reactions */}
                  {selectedAlly.reactions && selectedAlly.reactions.length > 0 && (
                    <div className="mt-3">
                      <h3 className="text-md font-bold text-[#822000] border-b border-[#822000] pb-0.5 mb-2 uppercase font-serif tracking-wide">
                        Reactions
                      </h3>
                      <div className="space-y-2">
                        {selectedAlly.reactions.map((act, idx) => (
                          <div key={idx} className="text-xs leading-relaxed">
                            <em className="font-bold font-serif text-[#822000] text-sm not-italic">{act.name}. </em>
                            <span className="font-sans whitespace-pre-line">{act.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Description Footer */}
                  {selectedAlly.description && (
                    <div className="mt-4 pt-3 border-t border-[#a38048]/40 text-xs italic text-[#58180d]/90 font-serif">
                      "{selectedAlly.description}"
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-zinc-500">
                <BookOpen className="w-12 h-12 mb-3 text-zinc-700" />
                <p className="text-sm font-mono">Select an ally or summon on the left or create a new one.</p>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Delete Confirmation Modal */}
      {allyToDelete && (
        <div
          className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setAllyToDelete(null)}
        >
          <div
            className="w-full max-w-md bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl p-6 flex flex-col gap-5 text-zinc-100 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center shrink-0 text-red-400 shadow-inner">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-zinc-100">
                  Delete Ally / Summon?
                </h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Are you sure you want to delete <span className="font-semibold text-amber-300">"{allyToDelete.name}"</span> from your Compendium?
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAllyToDelete(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-950/40 transition-all cursor-pointer"
              >
                Delete Ally
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= D&D BEYOND TOKEN PICKER MODAL ================= */}
      {isDdbPickerOpen && (
        <div
          className="fixed inset-0 z-[130] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 md:p-6 animate-in fade-in duration-200"
          onClick={() => setIsDdbPickerOpen(false)}
        >
          <div
            className="w-full max-w-4xl h-[86vh] max-h-[820px] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-zinc-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 bg-zinc-900/90 border-b border-zinc-800/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-serif tracking-wide flex items-center gap-2">
                    {ddbPickerMode === 'import_new' 
                      ? 'Import Summon from D&D Beyond' 
                      : `Pair Token Art from D&D Beyond ${ddbTargetAlly ? `for "${ddbTargetAlly.name}"` : ''}`}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Search official high-resolution D&D Beyond tokens, avatars, and monster statblocks.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsDdbPickerOpen(false)}
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Bar & Filters */}
            <div className="p-4 border-b border-zinc-800/80 bg-zinc-900/40 space-y-3 shrink-0">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={ddbSearchQuery}
                    onChange={(e) => setDdbSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        searchDdbTokens(ddbSearchQuery, ddbTypeFilter);
                      }
                    }}
                    placeholder="Search D&D Beyond (e.g. Wolf, Bear, Spider, Elemental, Pegasus, Imp, Skeleton)..."
                    className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-750 rounded-xl text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => searchDdbTokens(ddbSearchQuery, ddbTypeFilter)}
                  disabled={isLoadingDdb}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow"
                >
                  {isLoadingDdb ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                  Search
                </button>
              </div>

              {/* Quick Creature Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] no-scrollbar">
                <span className="text-[10px] font-mono text-zinc-500 uppercase font-semibold mr-1 shrink-0">Type:</span>
                {['all', 'Beast', 'Elemental', 'Fey', 'Fiend', 'Celestial', 'Dragon', 'Construct', 'Undead'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setDdbTypeFilter(t);
                      searchDdbTokens(ddbSearchQuery, t);
                    }}
                    className={`px-2.5 py-1 rounded-lg font-mono whitespace-nowrap transition-all cursor-pointer ${
                      ddbTypeFilter === t
                        ? 'bg-amber-600 text-white font-bold shadow'
                        : 'bg-zinc-850 hover:bg-zinc-750 text-zinc-400'
                    }`}
                  >
                    {t === 'all' ? 'All Types' : t}
                  </button>
                ))}
              </div>

              {/* Quick Preset Search Tags */}
              <div className="flex items-center gap-1.5 overflow-x-auto text-[10px] font-mono text-zinc-400 no-scrollbar">
                <span className="text-[10px] text-zinc-500 font-semibold mr-1 shrink-0">Popular Summons:</span>
                {['Dire Wolf', 'Brown Bear', 'Giant Spider', 'Giant Owl', 'Constrictor Snake', 'Elk', 'Pixie', 'Fire Elemental', 'Water Elemental', 'Imp', 'Warhorse', 'Flying Sword'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setDdbSearchQuery(preset);
                      searchDdbTokens(preset, ddbTypeFilter);
                    }}
                    className="px-2 py-0.5 rounded bg-zinc-800/80 hover:bg-amber-600/20 hover:text-amber-300 border border-zinc-700/60 whitespace-nowrap cursor-pointer transition-colors"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Results Grid */}
            <div className="flex-1 overflow-y-auto p-4 bg-zinc-950/80">
              {isLoadingDdb ? (
                <div className="h-64 flex flex-col items-center justify-center text-zinc-400 gap-3">
                  <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                  <p className="text-xs font-mono">Searching official D&D Beyond monster tokens...</p>
                </div>
              ) : ddbSearchResults.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-zinc-500 gap-2">
                  <ImageIcon className="w-10 h-10 text-zinc-600" />
                  <p className="text-sm font-semibold text-zinc-400">No D&D Beyond tokens found for "{ddbSearchQuery}".</p>
                  <p className="text-xs">Try searching for generic terms like "Wolf", "Bear", "Elemental", or "Familiar".</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {ddbSearchResults.map((monster) => {
                    const avatar = monster.largeAvatarUrl || monster.avatarUrl;
                    return (
                      <div
                        key={monster.monsterId || monster.id || Math.random()}
                        className="p-3 bg-zinc-900/80 hover:bg-zinc-850 border border-zinc-800 hover:border-amber-500/50 rounded-xl transition-all flex flex-col justify-between group shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-amber-500/40 shadow bg-zinc-950 shrink-0 group-hover:border-amber-400 transition-colors">
                            <img
                              src={avatar}
                              alt={monster.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = 'https://www.dndbeyond.com/avatars/43939/948/638607435568755201.png';
                              }}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-bold text-zinc-100 truncate font-serif group-hover:text-amber-300 transition-colors">
                              {monster.name}
                            </h4>
                            <div className="text-[10px] font-mono text-zinc-400 truncate">
                              {monster.size || 'Medium'} {monster.type || 'Creature'}
                            </div>
                            <div className="text-[10px] font-mono text-amber-400/90 font-semibold mt-0.5">
                              CR {monster.challenge || '—'} • HP {monster.hp || '—'}
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 pt-2 border-t border-zinc-800 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleSelectDdbToken(monster)}
                            className="flex-1 py-1.5 bg-amber-600/20 hover:bg-amber-600 border border-amber-500/40 text-amber-300 hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            {ddbPickerMode === 'import_new' ? 'Import Ally' : 'Pair Token Art'}
                          </button>

                          {ddbPickerMode !== 'import_new' && (
                            <button
                              type="button"
                              onClick={() => handleImportAsNewAlly(monster)}
                              className="px-2.5 py-1.5 bg-zinc-800 hover:bg-emerald-600/30 border border-zinc-700 hover:border-emerald-500 text-zinc-300 hover:text-emerald-300 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer"
                              title="Import as full new summon into Compendium"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
