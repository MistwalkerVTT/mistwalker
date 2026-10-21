import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Search,
  Plus,
  Shield,
  Heart,
  Zap,
  BookOpen,
  FileText,
  Trash2,
  Edit2,
  Play,
  Upload,
  CheckCircle2,
  ExternalLink,
  Award,
  Sparkles,
  RefreshCw,
  Eye,
  Crosshair,
  Coins,
  Scroll,
  Swords,
  User,
  Activity,
  ChevronRight,
  Flame,
  Info,
  Layers,
  Radio
} from 'lucide-react';
import { DdbSyncModal } from './DdbSyncModal';
import {
  Character,
  CharacterAction,
  CharacterBonusAction,
  CharacterReaction,
  CharacterSpecialFeature,
  CharacterSkill,
  CharacterEquipmentItem
} from '../types/character';
import { DEFAULT_CHARACTERS, getCharacterTokenUrl, CHARACTER_TOKEN_IMAGES } from '../data/defaultCharacters';
import {
  subscribeToCharacters,
  saveCharacter,
  deleteCharacter,
  uploadAndRegisterAsset
} from '../lib/firebase';
import { toast } from 'sonner';

interface CharacterCompendiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSpawnTokenOnMap: (tokenData: {
    name: string;
    avatarUrl: string;
    hp: number;
    maxHp: number;
    currentHp: number;
    ac: number;
    size: number;
  }) => void;
  initialSearchQuery?: string;
  availableTokens?: { name: string; url: string; category?: string }[];
}

export const CharacterCompendiumModal: React.FC<CharacterCompendiumModalProps> = ({
  isOpen,
  onClose,
  onSpawnTokenOnMap,
  initialSearchQuery = ''
}) => {
  const [characters, setCharacters] = useState<Character[]>(DEFAULT_CHARACTERS);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [activeTab, setActiveTab] = useState<'combat' | 'features' | 'skills' | 'equipment' | 'roleplay' | 'spells' | 'pdf'>('combat');
  const [isDdbSyncOpen, setIsDdbSyncOpen] = useState(false);

  // Form State for Create / Edit
  const [isEditing, setIsEditing] = useState(false);
  const [editingChar, setEditingChar] = useState<Partial<Character>>({
    name: '',
    race: 'Human',
    classLevel: 'Fighter 1',
    background: 'Soldier',
    alignment: 'Neutral Good',
    ac: 15,
    hp: 30,
    maxHp: 30,
    tempHp: 0,
    speed: '30 ft.',
    avatarUrl: 'https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/Varrak.png/:/rs=w:1440,h:1440',
    stats: { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 10 },
    features: [],
    spells: [],
    notes: ''
  });

  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [isDigestingPdf, setIsDigestingPdf] = useState(false);
  const [digestionStatus, setDigestionStatus] = useState<string>('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [charToDelete, setCharToDelete] = useState<Character | null>(null);
  const [pdfViewerUrl, setPdfViewerUrl] = useState<string | null>(null);
  const [recentDigestSummary, setRecentDigestSummary] = useState<any | null>(null);
  const [isSyncingAllCampaigns, setIsSyncingAllCampaigns] = useState(false);

  const handleSyncAllCampaigns = async () => {
    setIsSyncingAllCampaigns(true);
    try {
      const res = await fetch('/api/ddb/campaigns/sync-all', { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const chars = data.characters || [];
      let savedCount = 0;

      for (const d of chars) {
        const dId = String(d.id);
        const fullChar: Character = {
          id: `char_ddb_${dId}`,
          ddbCharacterId: dId,
          name: d.name,
          race: d.race || 'Humanoid',
          classLevel: d.classLevel || 'Hero',
          alignment: 'Neutral',
          avatarUrl: d.avatarUrl || getCharacterTokenUrl(d.name),
          ac: d.ac || 10,
          hp: d.currentHp,
          maxHp: d.maxHp,
          tempHp: d.tempHp || 0,
          speed: d.speed || '30 ft.',
          stats: d.stats || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
          features: [],
          spells: [],
          notes: `Imported from D&D Beyond Campaign (Player: ${d.playerName || 'Player'}). Direct URL: ${d.readonlyUrl || ''}`,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        await saveCharacter(fullChar).catch(() => {});
        savedCount++;
      }

      toast.success(`Synced ${savedCount} heroes from D&D Beyond campaigns into your Compendium!`);
    } catch (err: any) {
      console.error('Failed to sync all D&D Beyond campaigns:', err);
      toast.error('Failed to sync campaigns from D&D Beyond');
    } finally {
      setIsSyncingAllCampaigns(false);
    }
  };

  // Sync with Firestore characters
  useEffect(() => {
    if (!isOpen) return;
    const unsubscribe = subscribeToCharacters(
      (list) => {
        if (list && list.length > 0) {
          const updatedList = list.map(c => ({
            ...c,
            avatarUrl: getCharacterTokenUrl(c.name, c.avatarUrl)
          }));
          const existingIds = new Set(updatedList.map(c => c.id));
          const missingDefaults = DEFAULT_CHARACTERS.filter(d => !existingIds.has(d.id));
          const merged = [...updatedList, ...missingDefaults];
          setCharacters(merged);
          
          if (!selectedCharacter && merged.length > 0) {
            setSelectedCharacter(merged[0]);
          } else if (selectedCharacter) {
            const updatedSelected = merged.find(c => c.id === selectedCharacter.id);
            if (updatedSelected) setSelectedCharacter(updatedSelected);
          }
        } else {
          setCharacters(DEFAULT_CHARACTERS);
          if (!selectedCharacter && DEFAULT_CHARACTERS.length > 0) {
            setSelectedCharacter(DEFAULT_CHARACTERS[0]);
          }
        }
      },
      (err) => {
        console.warn('Using default characters due to fetch error:', err);
        setCharacters(DEFAULT_CHARACTERS);
        if (!selectedCharacter && DEFAULT_CHARACTERS.length > 0) {
          setSelectedCharacter(DEFAULT_CHARACTERS[0]);
        }
      }
    );
    return () => unsubscribe();
  }, [isOpen]);

  useEffect(() => {
    if (initialSearchQuery) {
      setSearchQuery(initialSearchQuery);
      const found = characters.find(c => c.name.toLowerCase().includes(initialSearchQuery.toLowerCase()));
      if (found) setSelectedCharacter(found);
    }
  }, [initialSearchQuery, characters]);

  if (!isOpen) return null;

  const filteredCharacters = characters.filter(c => {
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.race.toLowerCase().includes(q) ||
      c.classLevel.toLowerCase().includes(q) ||
      (c.background && c.background.toLowerCase().includes(q)) ||
      (c.notes && c.notes.toLowerCase().includes(q))
    );
  });

  const getMod = (val: number) => {
    const m = Math.floor((val - 10) / 2);
    return m >= 0 ? `+${m}` : `${m}`;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChar.name) {
      toast.error('Character name is required');
      return;
    }

    try {
      const saved = await saveCharacter({
        id: editingChar.id || `char_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: editingChar.name,
        race: editingChar.race || 'Human',
        classLevel: editingChar.classLevel || 'Adventurer 1',
        background: editingChar.background || undefined,
        alignment: editingChar.alignment || 'Neutral',
        avatarUrl: getCharacterTokenUrl(editingChar.name, editingChar.avatarUrl),
        pdfUrl: editingChar.pdfUrl || undefined,
        pdfName: editingChar.pdfName || undefined,
        ac: Number(editingChar.ac) || 10,
        hp: Number(editingChar.hp) || 20,
        maxHp: Number(editingChar.maxHp) || Number(editingChar.hp) || 20,
        tempHp: Number(editingChar.tempHp) || 0,
        hitDice: editingChar.hitDice || undefined,
        speed: editingChar.speed || '30 ft.',
        initiativeBonus: editingChar.initiativeBonus !== undefined ? Number(editingChar.initiativeBonus) : undefined,
        proficiencyBonus: editingChar.proficiencyBonus !== undefined ? Number(editingChar.proficiencyBonus) : undefined,
        passivePerception: editingChar.passivePerception !== undefined ? Number(editingChar.passivePerception) : undefined,
        passiveInsight: editingChar.passiveInsight !== undefined ? Number(editingChar.passiveInsight) : undefined,
        passiveInvestigation: editingChar.passiveInvestigation !== undefined ? Number(editingChar.passiveInvestigation) : undefined,
        stats: editingChar.stats || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
        savingThrows: editingChar.savingThrows || undefined,
        savingThrowModifiers: editingChar.savingThrowModifiers || undefined,
        skillsList: editingChar.skillsList || undefined,
        defenses: editingChar.defenses || undefined,
        proficiencies: editingChar.proficiencies || undefined,
        actions: editingChar.actions || undefined,
        bonusActions: editingChar.bonusActions || undefined,
        reactions: editingChar.reactions || undefined,
        specialFeatures: editingChar.specialFeatures || undefined,
        equipment: editingChar.equipment || undefined,
        currency: editingChar.currency || undefined,
        roleplay: editingChar.roleplay || undefined,
        spellcasting: editingChar.spellcasting || undefined,
        features: editingChar.features || [],
        spells: editingChar.spells || [],
        notes: editingChar.notes || ''
      });

      toast.success(`Saved "${saved.name}" to Character Compendium!`);
      setIsEditing(false);
      setSelectedCharacter(saved);
    } catch (err) {
      console.error(err);
      toast.error('Failed to save character');
    }
  };

  const handleDelete = async (char: Character) => {
    try {
      await deleteCharacter(char.id);
      toast.success(`Deleted "${char.name}" from compendium`);
      setCharToDelete(null);
      if (selectedCharacter?.id === char.id) {
        setSelectedCharacter(null);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete character');
    }
  };

  const digestPdfDocument = async (pdfPayload: string, filename: string, targetCharId?: string) => {
    setIsDigestingPdf(true);
    setDigestionStatus('AI is analyzing all pages of character sheet PDF...');
    try {
      const parseRes = await fetch('/api/ai/parse-character-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdf: pdfPayload })
      });

      if (!parseRes.ok) {
        const errJson = await parseRes.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to parse PDF character sheet');
      }

      const { character: extracted } = await parseRes.json();
      if (!extracted) {
        throw new Error('No character statistics returned from AI parser');
      }

      const tokenPortrait = getCharacterTokenUrl(extracted.name || filename.replace(/\.pdf$/i, ''));

      const mergedData: Partial<Character> = {
        name: extracted.name || filename.replace(/\.pdf$/i, ''),
        race: extracted.race || 'Human',
        classLevel: extracted.classLevel || 'Adventurer 1',
        background: extracted.background || 'Soldier',
        alignment: extracted.alignment || 'Neutral',
        avatarUrl: tokenPortrait,
        ac: extracted.ac !== undefined ? Number(extracted.ac) : 10,
        hp: extracted.hp !== undefined ? Number(extracted.hp) : 25,
        maxHp: extracted.maxHp !== undefined ? Number(extracted.maxHp) : (extracted.hp !== undefined ? Number(extracted.hp) : 25),
        tempHp: extracted.tempHp !== undefined ? Number(extracted.tempHp) : 0,
        hitDice: extracted.hitDice || undefined,
        speed: extracted.speed || '30 ft.',
        initiativeBonus: extracted.initiativeBonus !== undefined ? Number(extracted.initiativeBonus) : undefined,
        proficiencyBonus: extracted.proficiencyBonus !== undefined ? Number(extracted.proficiencyBonus) : undefined,
        passivePerception: extracted.passivePerception !== undefined ? Number(extracted.passivePerception) : undefined,
        passiveInsight: extracted.passiveInsight !== undefined ? Number(extracted.passiveInsight) : undefined,
        passiveInvestigation: extracted.passiveInvestigation !== undefined ? Number(extracted.passiveInvestigation) : undefined,
        stats: extracted.stats || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
        savingThrows: extracted.savingThrows || undefined,
        savingThrowModifiers: extracted.savingThrowModifiers || undefined,
        skillsList: extracted.skillsList || undefined,
        defenses: extracted.defenses || undefined,
        proficiencies: extracted.proficiencies || undefined,
        actions: extracted.actions || undefined,
        bonusActions: extracted.bonusActions || undefined,
        reactions: extracted.reactions || undefined,
        specialFeatures: extracted.specialFeatures || undefined,
        equipment: extracted.equipment || undefined,
        currency: extracted.currency || undefined,
        roleplay: extracted.roleplay || undefined,
        spellcasting: extracted.spellcasting || undefined,
        features: Array.isArray(extracted.features) && extracted.features.length > 0 ? extracted.features : [],
        spells: Array.isArray(extracted.spells) ? extracted.spells : [],
        notes: extracted.notes || ''
      };

      if (isEditing) {
        setEditingChar(prev => ({
          ...prev,
          ...mergedData,
          pdfUrl: prev.pdfUrl,
          pdfName: prev.pdfName || filename
        }));
      } else if (targetCharId) {
        const fullToSave: Character = {
          id: targetCharId,
          name: mergedData.name || 'Hero',
          race: mergedData.race || 'Human',
          classLevel: mergedData.classLevel || 'Adventurer 1',
          background: mergedData.background,
          alignment: mergedData.alignment || 'Neutral',
          avatarUrl: tokenPortrait,
          ac: mergedData.ac || 10,
          hp: mergedData.hp || 20,
          maxHp: mergedData.maxHp || 20,
          tempHp: mergedData.tempHp || 0,
          hitDice: mergedData.hitDice,
          speed: mergedData.speed || '30 ft.',
          initiativeBonus: mergedData.initiativeBonus,
          proficiencyBonus: mergedData.proficiencyBonus,
          passivePerception: mergedData.passivePerception,
          passiveInsight: mergedData.passiveInsight,
          passiveInvestigation: mergedData.passiveInvestigation,
          stats: mergedData.stats || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
          savingThrows: mergedData.savingThrows,
          savingThrowModifiers: mergedData.savingThrowModifiers,
          skillsList: mergedData.skillsList,
          defenses: mergedData.defenses,
          proficiencies: mergedData.proficiencies,
          actions: mergedData.actions,
          bonusActions: mergedData.bonusActions,
          reactions: mergedData.reactions,
          specialFeatures: mergedData.specialFeatures,
          equipment: mergedData.equipment,
          currency: mergedData.currency,
          roleplay: mergedData.roleplay,
          spellcasting: mergedData.spellcasting,
          features: mergedData.features || [],
          spells: mergedData.spells || [],
          notes: mergedData.notes || '',
          pdfUrl: selectedCharacter?.pdfUrl,
          pdfName: selectedCharacter?.pdfName || filename
        };
        const saved = await saveCharacter(fullToSave);
        setSelectedCharacter(saved);
      }

      setRecentDigestSummary({
        name: extracted.name,
        classLevel: extracted.classLevel,
        hp: extracted.hp,
        ac: extracted.ac,
        speed: extracted.speed,
        actionsCount: (extracted.actions?.length || 0) + (extracted.bonusActions?.length || 0),
        defensesCount: (extracted.defenses?.resistances?.length || 0) + (extracted.defenses?.immunities?.length || 0)
      });

      toast.success(`AI digested "${extracted.name}"! HP ${extracted.hp}, AC ${extracted.ac}, ${extracted.classLevel} abilities & defenses updated.`);
    } catch (err: any) {
      console.error('[CharacterCompendium] Digestion error:', err);
      toast.error(err.message || 'AI PDF digestion failed. You can still input statistics manually.');
    } finally {
      setIsDigestingPdf(false);
      setDigestionStatus('');
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Please upload a valid PDF document for character statistics.');
      return;
    }

    setIsUploadingPdf(true);
    setDigestionStatus('Uploading PDF file...');
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        const res = await fetch('/api/upload-base64', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64, filename: file.name, type: 'pdf' })
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.url) {
            setEditingChar(prev => ({
              ...prev,
              pdfUrl: data.url,
              pdfName: file.name
            }));
            toast.success(`PDF "${file.name}" attached! Starting AI review & stats digestion...`);
            // Automatically digest PDF with Gemini!
            await digestPdfDocument(base64, file.name);
          }
        } else {
          toast.error('Failed to upload PDF');
        }
        setIsUploadingPdf(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      toast.error('Error uploading PDF file');
      setIsUploadingPdf(false);
      setIsDigestingPdf(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetChar?: Character) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    try {
      const charName = targetChar?.name || editingChar.name || file.name.replace(/\.[^/.]+$/, "");
      const tokenName = `${charName} Token`;

      // Upload and register in Firestore uploadedAssets (so it appears in Saved Custom Tokens!)
      const asset = await uploadAndRegisterAsset(file, 'token', {
        customName: tokenName,
        tokenSize: 1
      });

      const newAvatarUrl = asset.url;

      // Update form state if open
      setEditingChar(prev => ({
        ...prev,
        avatarUrl: newAvatarUrl
      }));

      // If directly uploading for a selected character in the inspection view, persist to Firestore
      if (targetChar) {
        const updatedChar: Character = {
          ...targetChar,
          avatarUrl: newAvatarUrl,
          updatedAt: Date.now()
        };
        const saved = await saveCharacter(updatedChar);
        setSelectedCharacter(saved);
        setCharacters(prev => prev.map(c => c.id === saved.id ? saved : c));
      }

      toast.success(`Custom token "${asset.name}" uploaded and saved to Saved Custom Tokens!`);
    } catch (err: any) {
      console.error('[CharacterCompendium] Failed to upload avatar:', err);
      toast.error('Failed to upload custom token image');
    } finally {
      setIsUploadingAvatar(false);
      e.target.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-amber-500/40 w-full max-w-7xl h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-zinc-100 relative">
        
        {/* Top Header */}
        <div className="px-5 py-3.5 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold font-serif tracking-wide text-amber-100">Hero & Character Compendium</h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold border border-emerald-500/40 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-400" /> AI PDF Digester Active
                </span>
              </div>
              <p className="text-xs font-mono text-zinc-400">Review full D&D stats, defenses, attacks, and upload multi-page PDFs to auto-extract table data</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setEditingChar({
                  name: '',
                  race: 'Human',
                  classLevel: 'Fighter 1',
                  background: 'Soldier',
                  alignment: 'Neutral Good',
                  ac: 15,
                  hp: 30,
                  maxHp: 30,
                  tempHp: 0,
                  speed: '30 ft.',
                  avatarUrl: 'https://img1.wsimg.com/isteam/ip/ae0194f8-656a-49f5-ac8e-6a453300a6df/Varrak.png/:/rs=w:1440,h:1440',
                  stats: { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 10 },
                  features: [],
                  spells: [],
                  notes: ''
                });
                setRecentDigestSummary(null);
                setIsEditing(true);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold font-mono text-xs flex items-center gap-1.5 transition-all shadow-lg cursor-pointer"
            >
              <Plus className="w-4 h-4" /> New Character
            </button>
            <button
              onClick={() => setIsDdbSyncOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-red-950 via-slate-900 to-red-950 hover:from-red-900 hover:to-slate-800 text-amber-200 border border-red-700/60 font-bold font-mono text-xs flex items-center gap-1.5 transition-all shadow-lg cursor-pointer"
              title="Sync Party & Live Hit Points directly from D&D Beyond"
            >
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>D&D Beyond Party</span>
            </button>
            <button
              onClick={handleSyncAllCampaigns}
              disabled={isSyncingAllCampaigns}
              className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-emerald-400 hover:text-emerald-300 border border-emerald-500/40 font-bold font-mono text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
              title="Pull all characters across all active D&D Beyond campaigns into Compendium"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingAllCampaigns ? 'animate-spin' : ''}`} />
              <span>{isSyncingAllCampaigns ? 'Pulling...' : 'Pull DDB Heroes'}</span>
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* AI Digestion Loading Banner */}
        {isDigestingPdf && (
          <div className="bg-gradient-to-r from-indigo-900/90 via-purple-900/90 to-amber-900/90 px-4 py-2.5 border-b border-indigo-500/40 flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-2.5">
              <RefreshCw className="w-4 h-4 text-amber-300 animate-spin" />
              <span className="text-xs font-mono font-bold text-amber-100">
                {digestionStatus || 'AI is reviewing all pages of the character sheet PDF...'}
              </span>
            </div>
            <span className="text-[10px] font-mono text-amber-200/80 uppercase tracking-wider">
              Gemini Multimodal OCR Digester
            </span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Sidebar: Character List */}
          <div className="w-80 border-r border-zinc-800 flex flex-col bg-zinc-950/60 shrink-0">
            <div className="p-3 border-b border-zinc-800">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search heroes or class..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-amber-500/60"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1.5 sidebar-scrollbar">
              {filteredCharacters.map((c) => {
                const isSelected = selectedCharacter?.id === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      setSelectedCharacter(c);
                      setIsEditing(false);
                    }}
                    className={`p-2.5 rounded-xl border transition-all flex items-center gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-500/50 text-amber-200 shadow-md ring-1 ring-amber-500/30'
                        : 'bg-zinc-900/60 border-zinc-800/80 hover:bg-zinc-800/50 text-zinc-300'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-emerald-500/50 shadow-sm shrink-0 bg-zinc-950 relative">
                      <img
                        src={getCharacterTokenUrl(c.name, c.avatarUrl)}
                        alt={c.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-xs truncate font-serif">{c.name}</h4>
                        {c.pdfUrl && (
                          <span title="PDF Character Sheet Attached">
                            <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-mono text-zinc-400 truncate">{c.race} • {c.classLevel}</p>
                      <div className="flex items-center gap-2 mt-1 text-[9px] font-mono">
                        <span className="text-emerald-400 font-bold">AC {c.ac}</span>
                        <span className="text-rose-400 font-bold">HP {c.hp}/{c.maxHp}</span>
                        <span className="text-cyan-400">⚡ {c.speed}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {filteredCharacters.length === 0 && (
                <div className="p-6 text-center text-xs font-mono text-zinc-500">
                  No characters found matching search.
                </div>
              )}
            </div>
          </div>

          {/* Right Main Area: Character Details / Edit Form */}
          <div className="flex-1 flex flex-col bg-zinc-900/40 overflow-y-auto sidebar-scrollbar">
            {isEditing ? (
              /* Create / Edit Form */
              <form onSubmit={handleSave} className="p-6 space-y-6 max-w-4xl mx-auto w-full">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                  <div>
                    <h3 className="text-base font-bold font-serif text-amber-300">
                      {editingChar.id ? `Edit Character: ${editingChar.name}` : 'Create New Hero Character'}
                    </h3>
                    <p className="text-xs font-mono text-zinc-400">Upload a D&D Beyond PDF to auto-populate all fields or fill manually</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-mono cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold font-mono text-xs cursor-pointer shadow"
                    >
                      Save Character
                    </button>
                  </div>
                </div>

                {/* PDF Character Sheet Upload & AI Review Banner */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/30 via-purple-950/20 to-zinc-950 border border-amber-500/40 flex flex-col gap-3 shadow-lg">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <span className="text-xs font-bold font-serif text-amber-300 flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-amber-400" /> D&D Character Sheet PDF (D&D Beyond / 5e)
                      </span>
                      <p className="text-[10px] font-mono text-zinc-300">
                        Upload your multi-page PDF character sheet. Gemini AI will review and extract HP, AC, abilities, saving throws, weapon attacks, defenses, resistances, and lore!
                      </p>
                    </div>
                    <label className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 text-xs font-mono font-bold cursor-pointer flex items-center gap-1.5 transition-all shadow">
                      <Upload className="w-4 h-4" /> {isUploadingPdf ? 'Uploading...' : isDigestingPdf ? 'Digesting...' : 'Upload & Digest PDF'}
                      <input type="file" accept=".pdf,application/pdf" onChange={handlePdfUpload} className="hidden" />
                    </label>
                  </div>
                  {editingChar.pdfName && (
                    <div className="flex items-center justify-between bg-zinc-900/90 px-3 py-2 rounded-xl text-xs font-mono border border-zinc-800">
                      <span className="text-emerald-400 truncate flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> {editingChar.pdfName}
                      </span>
                      <div className="flex items-center gap-2">
                        {editingChar.pdfUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              if (editingChar.pdfUrl) {
                                digestPdfDocument(editingChar.pdfUrl, editingChar.pdfName || 'character.pdf');
                              }
                            }}
                            className="text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer text-[10px] font-bold"
                          >
                            <RefreshCw className={`w-3 h-3 ${isDigestingPdf ? 'animate-spin' : ''}`} /> Re-digest PDF
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setEditingChar(prev => ({ ...prev, pdfUrl: undefined, pdfName: undefined }))}
                          className="text-zinc-500 hover:text-rose-400 cursor-pointer text-[10px]"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Character Token Image Selector */}
                <div className="p-4 rounded-2xl bg-zinc-950 border border-emerald-500/30 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold font-serif text-emerald-300 flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-emerald-400" /> Character Token Portrait
                      </span>
                      <p className="text-[10px] font-mono text-zinc-400">Select a hero token image or upload a custom circular token asset</p>
                    </div>
                    <label className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 hover:bg-emerald-500/30 text-emerald-300 text-xs font-mono font-bold cursor-pointer flex items-center gap-1 transition-all">
                      <Upload className="w-3.5 h-3.5" /> {isUploadingAvatar ? 'Uploading...' : 'Upload Custom Token Image'}
                      <input type="file" accept="image/*" onChange={(e) => handleAvatarUpload(e)} className="hidden" />
                    </label>
                  </div>
                  
                  {/* Current Active Token Preview */}
                  <div className="flex items-center gap-3 bg-zinc-900/70 p-2.5 rounded-xl border border-zinc-800">
                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-emerald-400 shadow-md shrink-0 bg-zinc-950">
                      <img
                        src={getCharacterTokenUrl(editingChar.name || '', editingChar.avatarUrl)}
                        alt="Current Token"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <span className="text-xs font-bold font-mono text-zinc-200">Active Token Artwork</span>
                      <p className="text-[10px] font-mono text-emerald-400">
                        {editingChar.avatarUrl?.startsWith('/uploads/') || editingChar.avatarUrl?.startsWith('data:') ? '✓ Custom Uploaded Asset (Saved to Custom Tokens)' : 'Preset Hero Artwork'}
                      </p>
                    </div>
                  </div>

                  {/* Token Options Quick Picker */}
                  <div className="flex items-center gap-3 overflow-x-auto pb-1 sidebar-scrollbar">
                    {Object.entries(CHARACTER_TOKEN_IMAGES).map(([heroName, tokenUrl]) => {
                      const isSelected = editingChar.avatarUrl === tokenUrl;
                      return (
                        <button
                          key={heroName}
                          type="button"
                          onClick={() => setEditingChar(prev => ({ ...prev, avatarUrl: tokenUrl }))}
                          className={`flex flex-col items-center gap-1 p-1 rounded-xl transition-all cursor-pointer ${
                            isSelected ? 'bg-emerald-500/20 ring-2 ring-emerald-400' : 'opacity-60 hover:opacity-100 hover:bg-zinc-800'
                          }`}
                          title={`Use ${heroName.charAt(0).toUpperCase() + heroName.slice(1)} token image`}
                        >
                          <div className="w-10 h-10 rounded-full overflow-hidden border border-emerald-500/50">
                            <img src={tokenUrl} alt={heroName} className="w-full h-full object-cover" />
                          </div>
                          <span className="text-[8px] font-mono text-zinc-300 capitalize">{heroName}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Core Identification */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">Character Name</label>
                    <input
                      type="text"
                      required
                      value={editingChar.name || ''}
                      onChange={(e) => setEditingChar(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-zinc-200"
                      placeholder="e.g. Varrak 'Onikuma' of Sky Veil Clan"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">Species / Race</label>
                    <input
                      type="text"
                      value={editingChar.race || ''}
                      onChange={(e) => setEditingChar(prev => ({ ...prev, race: e.target.value }))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-zinc-200"
                      placeholder="e.g. Goliath, Dwarf, Elf"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">Class & Level</label>
                    <input
                      type="text"
                      value={editingChar.classLevel || ''}
                      onChange={(e) => setEditingChar(prev => ({ ...prev, classLevel: e.target.value }))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-zinc-200"
                      placeholder="e.g. Barbarian 6"
                    />
                  </div>
                </div>

                {/* Secondary Traits */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">Background</label>
                    <input
                      type="text"
                      value={editingChar.background || ''}
                      onChange={(e) => setEditingChar(prev => ({ ...prev, background: e.target.value }))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-zinc-200"
                      placeholder="e.g. Soldier"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">Alignment</label>
                    <input
                      type="text"
                      value={editingChar.alignment || ''}
                      onChange={(e) => setEditingChar(prev => ({ ...prev, alignment: e.target.value }))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-zinc-200"
                      placeholder="e.g. Neutral, Chaotic Good"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">Armor Class (AC)</label>
                    <input
                      type="number"
                      value={editingChar.ac || 10}
                      onChange={(e) => setEditingChar(prev => ({ ...prev, ac: parseInt(e.target.value) || 10 }))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-zinc-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">Speed</label>
                    <input
                      type="text"
                      value={editingChar.speed || '30 ft.'}
                      onChange={(e) => setEditingChar(prev => ({ ...prev, speed: e.target.value }))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-zinc-200"
                      placeholder="e.g. 45 ft."
                    />
                  </div>
                </div>

                {/* HP & Hit Dice */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">Max HP</label>
                    <input
                      type="number"
                      value={editingChar.maxHp || editingChar.hp || 10}
                      onChange={(e) => setEditingChar(prev => ({ ...prev, maxHp: parseInt(e.target.value) || 10, hp: parseInt(e.target.value) || 10 }))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-zinc-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">Hit Dice</label>
                    <input
                      type="text"
                      value={editingChar.hitDice || ''}
                      onChange={(e) => setEditingChar(prev => ({ ...prev, hitDice: e.target.value }))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-zinc-200"
                      placeholder="e.g. 6d12"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">Proficiency Bonus</label>
                    <input
                      type="number"
                      value={editingChar.proficiencyBonus || 2}
                      onChange={(e) => setEditingChar(prev => ({ ...prev, proficiencyBonus: parseInt(e.target.value) || 2 }))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-zinc-200"
                    />
                  </div>
                </div>

                {/* Ability Scores */}
                <div>
                  <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-2">Ability Scores</label>
                  <div className="grid grid-cols-6 gap-2">
                    {(['str', 'dex', 'con', 'int', 'wis', 'cha'] as const).map(stat => (
                      <div key={stat} className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800 text-center">
                        <span className="text-[10px] font-mono text-zinc-400 uppercase block">{stat}</span>
                        <input
                          type="number"
                          value={editingChar.stats?.[stat] || 10}
                          onChange={(e) => setEditingChar(prev => ({
                            ...prev,
                            stats: { ...(prev.stats || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }), [stat]: parseInt(e.target.value) || 10 }
                          }))}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg text-center py-1 text-xs font-mono font-bold text-amber-300 mt-1"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">DM Tactical Notes & Summary</label>
                  <textarea
                    rows={3}
                    value={editingChar.notes || ''}
                    onChange={(e) => setEditingChar(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs font-mono text-zinc-200"
                    placeholder="Tactics, backstory, resistances, or key triggers..."
                  />
                </div>
              </form>
            ) : selectedCharacter ? (
              /* Character Inspection View */
              <div className="flex-1 flex flex-col overflow-y-auto">
                
                {/* Top Character Profile Banner */}
                <div className="p-5 bg-gradient-to-b from-zinc-950 to-zinc-900/90 border-b border-zinc-800">
                  <div className="flex items-start justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-emerald-500/60 shadow-2xl shrink-0 bg-zinc-950 relative group">
                        <img
                          src={getCharacterTokenUrl(selectedCharacter.name, selectedCharacter.avatarUrl)}
                          alt={selectedCharacter.name}
                          className="w-full h-full object-cover"
                        />
                        <label
                          className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white z-10"
                          title="Click to upload/change token portrait"
                        >
                          <Upload className="w-4 h-4 text-emerald-400 mb-0.5" />
                          <span className="text-[8px] font-mono uppercase font-bold text-emerald-200">Change</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleAvatarUpload(e, selectedCharacter)}
                            className="hidden"
                          />
                        </label>
                        <span className="absolute bottom-0 inset-x-0 bg-emerald-950/90 text-emerald-300 text-[8px] font-bold py-0.5 text-center font-mono border-t border-emerald-700/40 pointer-events-none">
                          HERO
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-2xl font-bold font-serif text-amber-200">{selectedCharacter.name}</h2>
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold border border-amber-500/40">
                            {selectedCharacter.alignment}
                          </span>
                          {selectedCharacter.background && (
                            <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-mono text-[10px]">
                              {selectedCharacter.background}
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-mono text-zinc-400 mt-0.5">
                          {selectedCharacter.race} • <span className="text-amber-300 font-semibold">{selectedCharacter.classLevel}</span>
                        </p>
                        
                        {/* Quick DM Stat Badges */}
                        <div className="flex items-center gap-2 mt-2 text-xs font-mono flex-wrap">
                          <span className="flex items-center gap-1 text-emerald-400 bg-emerald-950/50 px-2.5 py-1 rounded-lg border border-emerald-800/60 font-bold">
                            <Shield className="w-3.5 h-3.5" /> AC {selectedCharacter.ac}
                          </span>
                          <span className="flex items-center gap-1 text-rose-400 bg-rose-950/50 px-2.5 py-1 rounded-lg border border-rose-800/60 font-bold">
                            <Heart className="w-3.5 h-3.5" /> HP {selectedCharacter.hp}/{selectedCharacter.maxHp}
                            {selectedCharacter.tempHp ? ` (+${selectedCharacter.tempHp})` : ''}
                          </span>
                          <span className="flex items-center gap-1 text-cyan-400 bg-cyan-950/50 px-2.5 py-1 rounded-lg border border-cyan-800/60 font-bold">
                            ⚡ {selectedCharacter.speed}
                          </span>
                          {selectedCharacter.initiativeBonus !== undefined && (
                            <span className="flex items-center gap-1 text-amber-400 bg-amber-950/50 px-2.5 py-1 rounded-lg border border-amber-800/60">
                              Init {selectedCharacter.initiativeBonus >= 0 ? `+${selectedCharacter.initiativeBonus}` : selectedCharacter.initiativeBonus}
                            </span>
                          )}
                          {selectedCharacter.passivePerception && (
                            <span className="flex items-center gap-1 text-zinc-300 bg-zinc-800/70 px-2.5 py-1 rounded-lg border border-zinc-700/60">
                              <Eye className="w-3 h-3 text-zinc-400" /> Pass Perc {selectedCharacter.passivePerception}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Controls */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => {
                          const tokenImg = getCharacterTokenUrl(selectedCharacter.name, selectedCharacter.avatarUrl);
                          onSpawnTokenOnMap({
                            name: selectedCharacter.name,
                            avatarUrl: tokenImg,
                            hp: selectedCharacter.hp,
                            maxHp: selectedCharacter.maxHp || selectedCharacter.hp,
                            currentHp: selectedCharacter.hp,
                            ac: selectedCharacter.ac,
                            size: 1
                          });
                          toast.success(`Spawned hero token "${selectedCharacter.name}" onto battlemap!`);
                          onClose();
                        }}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold font-mono text-xs flex items-center gap-2 transition-all shadow-lg cursor-pointer"
                        title="Spawn this hero token onto the active tactical battlemap"
                      >
                        <Play className="w-4 h-4 fill-current" /> Spawn Token on Map
                      </button>

                      {selectedCharacter.pdfUrl && (
                        <button
                          onClick={() => {
                            if (selectedCharacter.pdfUrl) {
                              digestPdfDocument(selectedCharacter.pdfUrl, selectedCharacter.pdfName || 'character.pdf', selectedCharacter.id);
                            }
                          }}
                          disabled={isDigestingPdf}
                          className="px-3 py-2 rounded-xl bg-purple-950/60 hover:bg-purple-900/80 border border-purple-500/40 text-purple-200 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow"
                          title="Re-run AI parser across the attached PDF character sheet"
                        >
                          <Sparkles className={`w-3.5 h-3.5 text-purple-400 ${isDigestingPdf ? 'animate-spin' : ''}`} />
                          {isDigestingPdf ? 'Digesting...' : 'Re-digest PDF'}
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setEditingChar(selectedCharacter);
                          setIsEditing(true);
                        }}
                        className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center transition-colors cursor-pointer"
                        title="Edit Character"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setCharToDelete(selectedCharacter)}
                        className="p-2 rounded-xl bg-zinc-800 hover:bg-rose-950/50 text-zinc-400 hover:text-rose-400 flex items-center justify-center transition-colors cursor-pointer"
                        title="Delete Character"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* 6 Ability Scores Bar */}
                  <div className="grid grid-cols-6 gap-2 mt-4 pt-3 border-t border-zinc-800/80">
                    {(['str', 'dex', 'con', 'int', 'wis', 'cha'] as const).map(stat => {
                      const val = selectedCharacter.stats[stat] || 10;
                      return (
                        <div key={stat} className="bg-zinc-950/70 p-2 rounded-xl border border-zinc-800 text-center">
                          <span className="text-[10px] font-mono text-zinc-400 uppercase font-bold">{stat}</span>
                          <p className="text-base font-bold font-mono text-amber-300">{val}</p>
                          <span className="text-[10px] font-mono text-zinc-400 font-semibold">{getMod(val)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Tab Navigation */}
                <div className="px-5 bg-zinc-950/90 border-b border-zinc-800 flex items-center gap-2 overflow-x-auto sidebar-scrollbar">
                  {[
                    { id: 'combat', label: 'Combat & Actions', icon: Swords },
                    { id: 'features', label: 'Features & Traits', icon: Award },
                    { id: 'skills', label: 'Skills & Proficiencies', icon: Crosshair },
                    { id: 'equipment', label: 'Equipment & Currency', icon: Coins },
                    { id: 'roleplay', label: 'Roleplay & Lore', icon: User },
                    ...(selectedCharacter.spellcasting || (selectedCharacter.spells && selectedCharacter.spells.length > 0)
                      ? [{ id: 'spells', label: 'Spells & Magic', icon: Sparkles }]
                      : []),
                    ...(selectedCharacter.pdfUrl ? [{ id: 'pdf', label: 'PDF Character Sheet', icon: FileText }] : [])
                  ].map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`py-3 px-3.5 text-xs font-mono font-bold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                          isActive
                            ? 'border-amber-500 text-amber-300 bg-amber-500/10'
                            : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                {/* Tab Content Panels */}
                <div className="p-6 space-y-6 flex-1">
                  
                  {/* TAB: COMBAT & ACTIONS */}
                  {activeTab === 'combat' && (
                    <div className="space-y-6">
                      
                      {/* Defenses, Resistances & Immunities */}
                      <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 space-y-3">
                        <h4 className="text-xs font-bold font-serif text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                          <Shield className="w-4 h-4 text-rose-400" /> Defenses, Resistances & Immunities
                        </h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                          <div className="bg-zinc-900/80 p-3 rounded-xl border border-zinc-800">
                            <span className="text-[10px] uppercase text-zinc-400 block mb-1">Damage Resistances</span>
                            {selectedCharacter.defenses?.resistances && selectedCharacter.defenses.resistances.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {selectedCharacter.defenses.resistances.map((r, i) => (
                                  <span key={i} className="bg-rose-950/50 text-rose-300 border border-rose-800/40 px-2 py-0.5 rounded-md text-[11px]">
                                    {r}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-zinc-500 italic">None</span>
                            )}
                          </div>

                          <div className="bg-zinc-900/80 p-3 rounded-xl border border-zinc-800">
                            <span className="text-[10px] uppercase text-zinc-400 block mb-1">Immunities & Critical Defenses</span>
                            {selectedCharacter.defenses?.immunities && selectedCharacter.defenses.immunities.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {selectedCharacter.defenses.immunities.map((imm, i) => (
                                  <span key={i} className="bg-amber-950/50 text-amber-300 border border-amber-800/40 px-2 py-0.5 rounded-md text-[11px]">
                                    {imm}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-zinc-500 italic">None</span>
                            )}
                          </div>
                        </div>

                        {/* Saving Throw Modifiers */}
                        {selectedCharacter.savingThrowModifiers && (
                          <div className="bg-indigo-950/30 p-2.5 rounded-xl border border-indigo-900/40 text-xs font-mono text-indigo-300 flex items-start gap-2">
                            <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold text-indigo-200">Saving Throw Modifiers: </span>
                              {selectedCharacter.savingThrowModifiers}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Weapon Attacks & Standard Actions */}
                      <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 space-y-3">
                        <h4 className="text-xs font-bold font-serif text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                          <Swords className="w-4 h-4 text-amber-400" /> Weapon Attacks & Actions
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {selectedCharacter.actions && selectedCharacter.actions.length > 0 ? (
                            selectedCharacter.actions.map((act, idx) => (
                              <div key={idx} className="bg-zinc-900 p-3 rounded-xl border border-zinc-800 flex flex-col justify-between">
                                <div>
                                  <div className="flex items-center justify-between">
                                    <h5 className="font-bold text-xs font-serif text-amber-200">{act.name}</h5>
                                    {act.hitBonus !== undefined && (
                                      <span className="bg-amber-500/20 text-amber-300 font-mono text-[10px] px-2 py-0.5 rounded-md font-bold">
                                        {String(act.hitBonus).startsWith('+') ? act.hitBonus : `+${act.hitBonus}`} to hit
                                      </span>
                                    )}
                                  </div>
                                  {act.damage && (
                                    <p className="text-xs font-mono font-bold text-rose-400 mt-1">
                                      💥 {act.damage}
                                    </p>
                                  )}
                                  {act.notes && (
                                    <p className="text-[10px] font-mono text-zinc-400 mt-0.5">
                                      🏷️ {act.notes}
                                    </p>
                                  )}
                                  {act.description && (
                                    <p className="text-[11px] font-sans text-zinc-300 mt-1.5 leading-relaxed">
                                      {act.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="col-span-2 text-center py-4 text-xs font-mono text-zinc-500">
                              No explicit weapon attacks found. Basic attacks use standard ability modifiers.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Bonus Actions & Reactions */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        
                        {/* Bonus Actions */}
                        <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 space-y-2.5">
                          <h4 className="text-xs font-bold font-serif text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                            <Zap className="w-4 h-4 text-cyan-400" /> Bonus Actions
                          </h4>
                          {selectedCharacter.bonusActions && selectedCharacter.bonusActions.length > 0 ? (
                            <div className="space-y-2">
                              {selectedCharacter.bonusActions.map((ba, idx) => (
                                <div key={idx} className="bg-zinc-900 p-2.5 rounded-xl border border-zinc-800">
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-xs text-cyan-200">{ba.name}</span>
                                    {ba.source && (
                                      <span className="text-[9px] font-mono text-zinc-500">{ba.source}</span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-zinc-300 mt-1 leading-snug">{ba.description}</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs font-mono text-zinc-500 italic">None specified</p>
                          )}
                        </div>

                        {/* Reactions */}
                        <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 space-y-2.5">
                          <h4 className="text-xs font-bold font-serif text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                            <Activity className="w-4 h-4 text-purple-400" /> Reactions
                          </h4>
                          {selectedCharacter.reactions && selectedCharacter.reactions.length > 0 ? (
                            <div className="space-y-2">
                              {selectedCharacter.reactions.map((rx, idx) => (
                                <div key={idx} className="bg-zinc-900 p-2.5 rounded-xl border border-zinc-800">
                                  <span className="font-bold text-xs text-purple-200">{rx.name}</span>
                                  <p className="text-[11px] text-zinc-300 mt-1 leading-snug">{rx.description}</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="bg-zinc-900 p-2.5 rounded-xl border border-zinc-800">
                              <span className="font-bold text-xs text-purple-200">Opportunity Attack</span>
                              <p className="text-[11px] text-zinc-300 mt-1 leading-snug">
                                Make 1 melee attack when a hostile creature moves out of your reach.
                              </p>
                            </div>
                          )}
                        </div>

                      </div>

                    </div>
                  )}

                  {/* TAB: FEATURES & TRAITS */}
                  {activeTab === 'features' && (
                    <div className="space-y-4">
                      {selectedCharacter.specialFeatures && selectedCharacter.specialFeatures.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {selectedCharacter.specialFeatures.map((feat, idx) => (
                            <div key={idx} className="p-3.5 rounded-2xl bg-zinc-950/80 border border-zinc-800 space-y-1">
                              <div className="flex items-center justify-between">
                                <h4 className="font-bold text-xs font-serif text-amber-200">{feat.name}</h4>
                                {feat.category && (
                                  <span className="text-[9px] font-mono uppercase bg-zinc-850 px-2 py-0.5 rounded text-zinc-400">
                                    {feat.category}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-zinc-300 leading-relaxed">{feat.description}</p>
                            </div>
                          ))}
                        </div>
                      ) : selectedCharacter.features && selectedCharacter.features.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {selectedCharacter.features.map((f, i) => (
                            <div key={i} className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 flex items-start gap-2">
                              <Award className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                              <span className="text-xs text-zinc-200">{f}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-8 text-center text-xs font-mono text-zinc-500">
                          No features or feats recorded for this character.
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB: SKILLS & PROFICIENCIES */}
                  {activeTab === 'skills' && (
                    <div className="space-y-6">
                      
                      {/* Skills Grid */}
                      <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 space-y-3">
                        <h4 className="text-xs font-bold font-serif text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                          <Crosshair className="w-4 h-4 text-emerald-400" /> Skill Modifiers & Proficiencies
                        </h4>

                        {selectedCharacter.skillsList && selectedCharacter.skillsList.length > 0 ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                            {selectedCharacter.skillsList.map((sk, idx) => (
                              <div
                                key={idx}
                                className={`p-2 rounded-xl border flex items-center justify-between ${
                                  sk.proficient
                                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                                    : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-400'
                                }`}
                              >
                                <span className="text-xs font-mono flex items-center gap-1.5">
                                  {sk.proficient && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                                  {sk.name}
                                </span>
                                <span className={`text-xs font-mono font-bold ${sk.proficient ? 'text-emerald-400' : 'text-zinc-300'}`}>
                                  {String(sk.bonus).startsWith('+') || String(sk.bonus).startsWith('-') ? sk.bonus : `+${sk.bonus}`}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs font-mono text-zinc-500">Standard ability modifier skills apply.</p>
                        )}
                      </div>

                      {/* Proficiencies & Training */}
                      {selectedCharacter.proficiencies && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 space-y-2">
                            <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold block">Armor & Weapons</span>
                            <div className="space-y-1.5 text-xs font-mono">
                              <p><strong className="text-zinc-300">Armor:</strong> <span className="text-zinc-400">{selectedCharacter.proficiencies.armor?.join(', ') || 'None'}</span></p>
                              <p><strong className="text-zinc-300">Weapons:</strong> <span className="text-zinc-400">{selectedCharacter.proficiencies.weapons?.join(', ') || 'None'}</span></p>
                            </div>
                          </div>

                          <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 space-y-2">
                            <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold block">Tools & Languages</span>
                            <div className="space-y-1.5 text-xs font-mono">
                              <p><strong className="text-zinc-300">Tools:</strong> <span className="text-zinc-400">{selectedCharacter.proficiencies.tools?.join(', ') || 'None'}</span></p>
                              <p><strong className="text-zinc-300">Languages:</strong> <span className="text-zinc-400">{selectedCharacter.proficiencies.languages?.join(', ') || 'Common'}</span></p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB: EQUIPMENT & CURRENCY */}
                  {activeTab === 'equipment' && (
                    <div className="space-y-6">
                      
                      {/* Currency Breakdown */}
                      {selectedCharacter.currency && (
                        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 via-yellow-950/20 to-zinc-950 border border-amber-500/30 flex items-center justify-between flex-wrap gap-3">
                          <div>
                            <span className="text-xs font-bold font-serif text-amber-300 flex items-center gap-1.5">
                              <Coins className="w-4 h-4 text-amber-400" /> Wealth & Coinage
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs font-mono font-bold">
                            <span className="text-yellow-400 bg-yellow-950/60 px-3 py-1 rounded-xl border border-yellow-700/50">
                              💰 {selectedCharacter.currency.gp || 0} GP
                            </span>
                            <span className="text-zinc-300 bg-zinc-900 px-3 py-1 rounded-xl border border-zinc-800">
                              {selectedCharacter.currency.sp || 0} SP
                            </span>
                            <span className="text-amber-600 bg-zinc-900 px-3 py-1 rounded-xl border border-zinc-800">
                              {selectedCharacter.currency.cp || 0} CP
                            </span>
                            {selectedCharacter.currency.pp ? (
                              <span className="text-cyan-300 bg-cyan-950/60 px-3 py-1 rounded-xl border border-cyan-800">
                                {selectedCharacter.currency.pp} PP
                              </span>
                            ) : null}
                          </div>
                        </div>
                      )}

                      {/* Equipment List */}
                      <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 space-y-3">
                        <h4 className="text-xs font-bold font-serif text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                          <Scroll className="w-4 h-4 text-amber-400" /> Inventory, Magic Items & Gear
                        </h4>

                        {selectedCharacter.equipment && selectedCharacter.equipment.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                            {selectedCharacter.equipment.map((eq, i) => (
                              <div key={i} className="p-2.5 rounded-xl bg-zinc-900/70 border border-zinc-800 flex items-center justify-between">
                                <div>
                                  <span className="text-xs font-mono text-zinc-200 font-medium">{eq.name}</span>
                                  {eq.isAttuned && (
                                    <span className="ml-1.5 px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 text-[8px] font-mono border border-purple-800/40">
                                      Attuned
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] font-mono text-zinc-400">
                                  {eq.quantity && eq.quantity > 1 ? `x${eq.quantity}` : ''} {eq.weight && eq.weight !== '--' ? `(${eq.weight})` : ''}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs font-mono text-zinc-500">Standard adventurer gear.</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB: ROLEPLAY & LORE */}
                  {activeTab === 'roleplay' && (
                    <div className="space-y-4">
                      {selectedCharacter.roleplay ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          
                          {/* Personality & Background */}
                          <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 space-y-3">
                            <h4 className="text-xs font-bold font-serif text-amber-300 uppercase">Personality & Ideals</h4>
                            {selectedCharacter.roleplay.personalityTraits && (
                              <div className="bg-zinc-900/60 p-3 rounded-xl border border-zinc-800">
                                <span className="text-[10px] font-mono text-zinc-400 uppercase font-bold block mb-1">Personality Traits</span>
                                <p className="text-xs text-zinc-200 italic">"{selectedCharacter.roleplay.personalityTraits}"</p>
                              </div>
                            )}
                            {selectedCharacter.roleplay.ideals && (
                              <div className="bg-zinc-900/60 p-3 rounded-xl border border-zinc-800">
                                <span className="text-[10px] font-mono text-zinc-400 uppercase font-bold block mb-1">Ideals</span>
                                <p className="text-xs text-zinc-200 italic">"{selectedCharacter.roleplay.ideals}"</p>
                              </div>
                            )}
                            {selectedCharacter.roleplay.bonds && (
                              <div className="bg-zinc-900/60 p-3 rounded-xl border border-zinc-800">
                                <span className="text-[10px] font-mono text-zinc-400 uppercase font-bold block mb-1">Bonds</span>
                                <p className="text-xs text-zinc-200 italic">"{selectedCharacter.roleplay.bonds}"</p>
                              </div>
                            )}
                            {selectedCharacter.roleplay.flaws && (
                              <div className="bg-zinc-900/60 p-3 rounded-xl border border-zinc-800">
                                <span className="text-[10px] font-mono text-zinc-400 uppercase font-bold block mb-1">Flaws</span>
                                <p className="text-xs text-rose-300/90 italic">"{selectedCharacter.roleplay.flaws}"</p>
                              </div>
                            )}
                          </div>

                          {/* Physical Characteristics & DM Notes */}
                          <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 space-y-3">
                            <h4 className="text-xs font-bold font-serif text-amber-300 uppercase">Physical & Background Lore</h4>
                            
                            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                              <div className="bg-zinc-900 p-2.5 rounded-xl border border-zinc-800">
                                <span className="text-[9px] uppercase text-zinc-400 block">Height / Weight</span>
                                <span className="text-zinc-200">{selectedCharacter.roleplay.height || '--'} • {selectedCharacter.roleplay.weight || '--'}</span>
                              </div>
                              <div className="bg-zinc-900 p-2.5 rounded-xl border border-zinc-800">
                                <span className="text-[9px] uppercase text-zinc-400 block">Age / Faith</span>
                                <span className="text-zinc-200">{selectedCharacter.roleplay.age ? `${selectedCharacter.roleplay.age} yrs` : '--'} • {selectedCharacter.roleplay.faith || 'None'}</span>
                              </div>
                            </div>

                            {selectedCharacter.roleplay.skin && (
                              <div className="bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800 text-xs font-mono">
                                <span className="text-[10px] uppercase text-zinc-400 block">Appearance</span>
                                <span className="text-zinc-300">Skin: {selectedCharacter.roleplay.skin}, Eyes: {selectedCharacter.roleplay.eyes || '--'}, Hair: {selectedCharacter.roleplay.hair || '--'}</span>
                              </div>
                            )}

                            {selectedCharacter.notes && (
                              <div className="bg-zinc-900/60 p-3 rounded-xl border border-zinc-800 text-xs font-sans leading-relaxed text-zinc-300">
                                <span className="text-[10px] font-mono uppercase text-zinc-400 block font-bold mb-1">DM Tactical Summary</span>
                                {selectedCharacter.notes}
                              </div>
                            )}
                          </div>

                        </div>
                      ) : (
                        <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 text-xs font-mono text-zinc-400">
                          {selectedCharacter.notes || 'No roleplay background recorded yet.'}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB: SPELLS & MAGIC */}
                  {activeTab === 'spells' && (
                    <div className="space-y-4">
                      {selectedCharacter.spellcasting && (
                        <div className="p-4 rounded-2xl bg-purple-950/30 border border-purple-500/40 flex items-center justify-between flex-wrap gap-4">
                          <div>
                            <span className="text-xs font-bold font-serif text-purple-200">
                              {selectedCharacter.spellcasting.spellcastingClass || 'Spellcaster'} Magic
                            </span>
                            <p className="text-[10px] font-mono text-zinc-400">
                              Ability: {selectedCharacter.spellcasting.spellcastingAbility || 'Intelligence'}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 text-xs font-mono font-bold">
                            <span className="bg-purple-900/80 text-purple-200 px-3 py-1 rounded-xl border border-purple-700">
                              DC {selectedCharacter.spellcasting.spellSaveDc || 15}
                            </span>
                            <span className="bg-purple-900/80 text-purple-200 px-3 py-1 rounded-xl border border-purple-700">
                              +{selectedCharacter.spellcasting.spellAttackBonus || 7} Spell Attack
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 space-y-3">
                        <h4 className="text-xs font-bold font-serif text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-purple-400" /> Prepared Spells
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {selectedCharacter.spells && selectedCharacter.spells.length > 0 ? (
                            selectedCharacter.spells.map((sp, idx) => (
                              <div key={idx} className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs font-mono text-purple-200">
                                🔮 {sp}
                              </div>
                            ))
                          ) : (
                            <p className="text-xs font-mono text-zinc-500">No spells prepared.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB: PDF CHARACTER SHEET EMBED */}
                  {activeTab === 'pdf' && selectedCharacter.pdfUrl && (
                    <div className="h-[550px] w-full rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 flex flex-col">
                      <div className="p-3 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-amber-400" />
                          <span className="text-xs font-mono font-bold text-zinc-200">{selectedCharacter.pdfName || 'Character_Sheet.pdf'}</span>
                        </div>
                        <a
                          href={selectedCharacter.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 text-xs font-mono font-bold flex items-center gap-1 transition-all"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Open in New Tab
                        </a>
                      </div>
                      <iframe
                        src={selectedCharacter.pdfUrl}
                        title="PDF Character Sheet"
                        className="w-full flex-1 border-0"
                      />
                    </div>
                  )}

                </div>

              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-500">
                <Award className="w-12 h-12 text-zinc-700 mb-3" />
                <h3 className="text-base font-bold font-serif text-zinc-400">Select a character or upload a PDF</h3>
                <p className="text-xs font-mono max-w-sm mt-1">
                  Choose a hero from the catalog on the left to inspect stats, or click "+ New Character" to upload a character sheet PDF for AI digestion.
                </p>
              </div>
            )}
          </div>

        </div>

        {/* Delete Confirmation Modal */}
        {charToDelete && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-zinc-900 border border-rose-500/50 p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-4">
              <h3 className="text-base font-bold font-serif text-rose-300">Delete Character?</h3>
              <p className="text-xs font-mono text-zinc-300">
                Are you sure you want to delete <span className="text-white font-bold">"{charToDelete.name}"</span> from the Hero & Character Compendium?
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setCharToDelete(null)}
                  className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-mono cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(charToDelete)}
                  className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold font-mono text-xs cursor-pointer shadow"
                >
                  Delete Forever
                </button>
              </div>
            </div>
          </div>
        )}

        {/* D&D Beyond Campaign & Live HP Modal */}
        <DdbSyncModal
          isOpen={isDdbSyncOpen}
          onClose={() => setIsDdbSyncOpen(false)}
          initialTab="campaign"
        />

      </div>
    </div>
  );
};
