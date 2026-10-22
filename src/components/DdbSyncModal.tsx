import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  Sparkles,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  ExternalLink,
  Eye,
  Shield,
  Heart,
  Zap,
  Plus,
  Flame,
  Filter,
  Check,
  Globe,
  ChevronLeft,
  ChevronRight,
  Users,
  Radio,
  Activity,
  Skull,
  User,
  HelpCircle,
  Trash2
} from 'lucide-react';
import { io } from 'socket.io-client';
import { Monster } from '../types/monster';
import { Character } from '../types/character';
import { saveMonster, saveCharacter } from '../lib/firebase';
import { getCharacterTokenUrl } from '../data/defaultCharacters';
import { toast } from 'sonner';
import { CobaltInstructionsModal } from './CobaltInstructionsModal';

interface DdbBookStatus {
  id: string;
  name: string;
  category: 'Core' | 'Expansion' | 'Adventure';
  chapters: string[];
  estimatedCount: number;
  syncedCount: number;
  isSynced: boolean;
}

interface DdbStatusResponse {
  hasToken: boolean;
  tokenPreview: string | null;
  hasDmToken?: boolean;
  dmTokenPreview?: string | null;
  totalCachedMonsters: number;
  booksAvailable: number;
}

export interface DdbCampaignSummary {
  id: string;
  name: string;
  characterCount: number;
  dm: string;
}

export interface DdbSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMonsterImportedToCompendium?: (monster: Monster) => void;
  onCharacterImportedToCompendium?: (character: Character) => void;
  initialSearchQuery?: string;
  initialTab?: 'live_search' | 'campaign' | 'books' | 'catalog';
}

export const DdbSyncModal: React.FC<DdbSyncModalProps> = ({
  isOpen,
  onClose,
  onMonsterImportedToCompendium,
  onCharacterImportedToCompendium,
  initialSearchQuery = '',
  initialTab = 'live_search'
}) => {
  const [activeTab, setActiveTab] = useState<'live_search' | 'campaign' | 'books' | 'catalog' | 'settings'>(initialTab);
  const [status, setStatus] = useState<DdbStatusResponse | null>(null);
  const [books, setBooks] = useState<DdbBookStatus[]>([]);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);

  // Settings & DM Token state
  const [dmTokenInput, setDmTokenInput] = useState('');
  const [playerTokenInput, setPlayerTokenInput] = useState('');
  const [isSavingToken, setIsSavingToken] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  // Sync state
  const [syncingBookId, setSyncingBookId] = useState<string | null>(null);
  const [syncProgress, setSyncProgress] = useState<string | null>(null);

  // Live Search state (6,000+ monsters across all D&D Beyond content)
  const [liveSearchQuery, setLiveSearchQuery] = useState(initialSearchQuery);
  const [liveCrFilter, setLiveCrFilter] = useState('all');
  const [liveTypeFilter, setLiveTypeFilter] = useState('all');
  const [liveSizeFilter, setLiveSizeFilter] = useState('all');
  const [livePage, setLivePage] = useState(1);
  const [liveTotal, setLiveTotal] = useState(6001);
  const [liveTotalPages, setLiveTotalPages] = useState(250);
  const [liveMonsters, setLiveMonsters] = useState<Monster[]>([]);
  const [isLoadingLive, setIsLoadingLive] = useState(false);

  // Offline Catalog browse state
  const [catalogMonsters, setCatalogMonsters] = useState<Monster[]>([]);
  const [catalogTotal, setCatalogTotal] = useState(0);
  const [catalogPage, setCatalogPage] = useState(1);
  const [catalogSearchQuery, setCatalogSearchQuery] = useState('');
  const [selectedBookFilter, setSelectedBookFilter] = useState('all');
  const [selectedCrFilter, setSelectedCrFilter] = useState('all');
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);

  // Detailed monster viewer modal/drawer
  const [viewingMonster, setViewingMonster] = useState<Monster | null>(null);
  const [addingToFirestoreIds, setAddingToFirestoreIds] = useState<Set<string>>(new Set());
  const [addedMonsterIds, setAddedMonsterIds] = useState<Set<string>>(new Set());

  // Campaign & Live HP state
  const [campaigns, setCampaigns] = useState<DdbCampaignSummary[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('3290944');
  const [campaignTitle, setCampaignTitle] = useState<string>('');
  const [campaignCharacters, setCampaignCharacters] = useState<any[]>([]);
  const [isLoadingCampaign, setIsLoadingCampaign] = useState(false);
  const [isManualPolling, setIsManualPolling] = useState(false);
  const [isImportingParty, setIsImportingParty] = useState(false);
  const [importingCharId, setImportingCharId] = useState<string | null>(null);

  // Fetch campaigns
  const fetchCampaigns = async () => {
    try {
      const res = await fetch('/api/ddb/campaigns');
      const data = await res.json();
      if (data.campaigns && Array.isArray(data.campaigns)) {
        setCampaigns(data.campaigns);
        if (data.campaigns.length > 0 && !selectedCampaignId) {
          setSelectedCampaignId(data.campaigns[0].id);
        }
      }
    } catch (err) {
      console.error('Error loading campaigns:', err);
    }
  };

  // Fetch characters for active campaign
  const fetchCampaignCharacters = async (campId: string) => {
    if (!campId) return;
    setIsLoadingCampaign(true);
    try {
      const res = await fetch(`/api/ddb/campaigns/${campId}/characters`);
      const data = await res.json();
      setCampaignTitle(data.campaignTitle || `Campaign ${campId}`);
      if (Array.isArray(data.characters)) {
        setCampaignCharacters(data.characters);
      }
    } catch (err) {
      console.error('Error loading campaign characters:', err);
    } finally {
      setIsLoadingCampaign(false);
    }
  };

  // Select campaign to monitor
  const handleSelectCampaign = async (campId: string) => {
    setSelectedCampaignId(campId);
    try {
      await fetch('/api/ddb/campaigns/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: campId })
      });
      fetchCampaignCharacters(campId);
    } catch (err) {
      console.error('Error selecting campaign:', err);
    }
  };

  // Manual Poll
  const handlePollNow = async () => {
    setIsManualPolling(true);
    try {
      const res = await fetch('/api/ddb/campaigns/poll-now', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success('Live HP poll completed! Latest values retrieved from D&D Beyond.');
        if (selectedCampaignId) {
          fetchCampaignCharacters(selectedCampaignId);
        }
      }
    } catch (err) {
      console.error('Error triggering manual poll:', err);
    } finally {
      setIsManualPolling(false);
    }
  };

  // Import single character into Character Compendium
  const handleImportCharacterToCompendium = async (c: any) => {
    setImportingCharId(c.id);
    try {
      const fullChar: Character = {
        id: `char_ddb_${c.id}`,
        ddbCharacterId: String(c.id),
        name: c.name,
        race: c.race || 'Humanoid',
        classLevel: c.classLevel || 'Level 1',
        alignment: 'Neutral',
        avatarUrl: c.avatarUrl || getCharacterTokenUrl(c.name),
        ac: c.ac || 10,
        hp: c.currentHp,
        maxHp: c.maxHp,
        tempHp: c.tempHp || 0,
        speed: c.speed || '30 ft.',
        stats: c.stats || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
        features: [],
        spells: [],
        notes: `Imported from D&D Beyond Campaign "${campaignTitle}" (Player: ${c.playerName || 'Player'}). Direct URL: ${c.readonlyUrl || ''}`,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      await saveCharacter(fullChar);
      if (onCharacterImportedToCompendium) {
        onCharacterImportedToCompendium(fullChar);
      }
      toast.success(`Saved "${c.name}" to Hero & Character Compendium!`);
    } catch (err) {
      console.error('Error importing character:', err);
      toast.error(`Failed to save "${c.name}" to compendium`);
    } finally {
      setImportingCharId(null);
    }
  };

  // Import entire party into compendium
  const handleImportEntireParty = async () => {
    if (!campaignCharacters || campaignCharacters.length === 0) return;
    setIsImportingParty(true);
    let count = 0;
    try {
      for (const c of campaignCharacters) {
        const fullChar: Character = {
          id: `char_ddb_${c.id}`,
          ddbCharacterId: String(c.id),
          name: c.name,
          race: c.race || 'Humanoid',
          classLevel: c.classLevel || 'Level 1',
          alignment: 'Neutral',
          avatarUrl: c.avatarUrl || getCharacterTokenUrl(c.name),
          ac: c.ac || 10,
          hp: c.currentHp,
          maxHp: c.maxHp,
          tempHp: c.tempHp || 0,
          speed: c.speed || '30 ft.',
          stats: c.stats || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
          features: [],
          spells: [],
          notes: `Imported from D&D Beyond Campaign "${campaignTitle}" (Player: ${c.playerName || 'Player'}). Direct URL: ${c.readonlyUrl || ''}`,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        await saveCharacter(fullChar);
        if (onCharacterImportedToCompendium) {
          onCharacterImportedToCompendium(fullChar);
        }
        count++;
      }
      toast.success(`Successfully imported ${count} party characters into your Character Compendium!`, {
        description: 'You can now drag & drop their tokens directly onto any battlemap!'
      });
    } catch (err) {
      console.error('Error importing party:', err);
      toast.error('Failed to import some characters into compendium');
    } finally {
      setIsImportingParty(false);
    }
  };

  // Reset tab and query if initial props change
  useEffect(() => {
    if (isOpen) {
      if (initialTab) setActiveTab(initialTab);
      if (initialSearchQuery) setLiveSearchQuery(initialSearchQuery);
      fetchCampaigns();
      if (selectedCampaignId) {
        fetchCampaignCharacters(selectedCampaignId);
      }
    }
  }, [isOpen, initialTab, initialSearchQuery]);

  // Socket listener for live HP updates inside the modal
  useEffect(() => {
    if (!isOpen) return;
    const socket = io();
    socket.on('DDB_CHARACTER_HP_CHANGED', (data: {
      characterId: number;
      name: string;
      currentHp: number;
      maxHp: number;
      tempHp: number;
      previousHp: number;
      timestamp: number;
    }) => {
      setCampaignCharacters(prev =>
        prev.map(c => {
          if (String(c.id) === String(data.characterId) || c.name.toLowerCase() === data.name.toLowerCase()) {
            return {
              ...c,
              currentHp: data.currentHp,
              maxHp: data.maxHp,
              tempHp: data.tempHp,
              lastUpdated: data.timestamp
            };
          }
          return c;
        })
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [isOpen]);

  // Load status and books
  const fetchStatusAndBooks = async () => {
    setIsLoadingStatus(true);
    try {
      const [resStatus, resBooks] = await Promise.all([
        fetch('/api/ddb/status').then(r => r.json()),
        fetch('/api/ddb/books').then(r => r.json())
      ]);
      setStatus(resStatus);
      if (resBooks.books) {
        setBooks(resBooks.books);
      }
    } catch (err) {
      console.error('Error fetching DDB status:', err);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatusAndBooks();
    }
  }, [isOpen]);

  // Fetch Live D&D Beyond monsters (all 6,000+)
  const fetchLiveSearch = async (page = 1) => {
    setIsLoadingLive(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '24'
      });
      if (liveSearchQuery.trim()) params.append('q', liveSearchQuery.trim());
      if (liveCrFilter !== 'all') params.append('cr', liveCrFilter);
      if (liveTypeFilter !== 'all') params.append('type', liveTypeFilter);
      if (liveSizeFilter !== 'all') params.append('size', liveSizeFilter);

      const res = await fetch(`/api/ddb/search?${params.toString()}`);
      const data = await res.json();
      setLiveMonsters(data.monsters || []);
      setLiveTotal(data.total || 0);
      setLivePage(data.page || 1);
      setLiveTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error('Error searching live DDB monsters:', err);
    } finally {
      setIsLoadingLive(false);
    }
  };

  // Trigger live search on query/filter changes with debounce
  useEffect(() => {
    if (isOpen && activeTab === 'live_search') {
      const timer = setTimeout(() => {
        fetchLiveSearch(1);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [isOpen, activeTab, liveSearchQuery, liveCrFilter, liveTypeFilter, liveSizeFilter]);

  // Load local offline catalog monsters with debounce
  const fetchCatalog = async (page = 1) => {
    setIsLoadingCatalog(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '24'
      });
      if (catalogSearchQuery.trim()) params.append('search', catalogSearchQuery.trim());
      if (selectedBookFilter !== 'all') params.append('book', selectedBookFilter);
      if (selectedCrFilter !== 'all') params.append('cr', selectedCrFilter);

      const res = await fetch(`/api/ddb/compendium?${params.toString()}`);
      const data = await res.json();
      setCatalogMonsters(data.monsters || []);
      setCatalogTotal(data.total || 0);
      setCatalogPage(data.page || 1);
    } catch (err) {
      console.error('Error fetching catalog:', err);
    } finally {
      setIsLoadingCatalog(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === 'catalog') {
      const timer = setTimeout(() => {
        fetchCatalog(1);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [isOpen, activeTab, catalogSearchQuery, selectedBookFilter, selectedCrFilter]);

  // Handle Sync Book
  const handleSyncBook = async (bookId: string) => {
    setSyncingBookId(bookId);
    setSyncProgress('Connecting to D&D Beyond...');

    try {
      const res = await fetch('/api/ddb/sync-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Successfully ingested ${data.totalIngested} creatures from ${bookId.toUpperCase()}!`);
        await fetchStatusAndBooks();
      } else {
        toast.error(`Sync failed: ${data.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      toast.error(`Sync request failed: ${err.message}`);
    } finally {
      setSyncingBookId(null);
      setSyncProgress(null);
    }
  };

  // Add monster to Firestore and persist to local JSON cache
  const handleAddToFirestore = async (monster: Monster) => {
    setAddingToFirestoreIds(prev => new Set(prev).add(monster.monsterId));
    try {
      await saveMonster(monster);
      
      // Also cache in local JSON compendium
      fetch('/api/ddb/cache-monster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monster })
      }).catch(err => console.warn('Cache save notice:', err));

      setAddedMonsterIds(prev => new Set(prev).add(monster.monsterId));
      toast.success(`${monster.name} saved directly to Monster Compendium!`);
      if (onMonsterImportedToCompendium) {
        onMonsterImportedToCompendium(monster);
      }
    } catch (err: any) {
      toast.error(`Failed to save monster: ${err.message}`);
    } finally {
      setAddingToFirestoreIds(prev => {
        const next = new Set(prev);
        next.delete(monster.monsterId);
        return next;
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl h-[88vh] bg-slate-900 border border-red-900/60 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-gradient-to-r from-red-950/40 via-slate-900 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center shadow-lg shadow-red-950/50 border border-red-500/30">
              <Sparkles className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  D&D Beyond Compendium Sync
                </h2>
                {status?.hasToken ? (
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Connected via CobaltSession
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Token Missing
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Live search over 6,000+ official creatures, statblocks, and high-res circular tokens across all D&D Beyond content.
              </p>
            </div>
          </div>

          {/* Navigation Tab buttons */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
              <button
                onClick={() => setActiveTab('live_search')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'live_search'
                    ? 'bg-red-600 text-white shadow-md shadow-red-950'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                }`}
              >
                <Globe className="w-3.5 h-3.5 text-amber-300" />
                Search All D&D Beyond ({liveTotal > 0 ? liveTotal.toLocaleString() : '6,000+'})
              </button>
              <button
                onClick={() => setActiveTab('campaign')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'campaign'
                    ? 'bg-red-600 text-white shadow-md shadow-red-950'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                <span>Campaign & Live HP</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
              </button>
              <button
                onClick={() => setActiveTab('books')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'books'
                    ? 'bg-red-600 text-white shadow-md shadow-red-950'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                Sourcebooks ({books.length})
              </button>
              <button
                onClick={() => setActiveTab('catalog')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'catalog'
                    ? 'bg-red-600 text-white shadow-md shadow-red-950'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Offline Catalog ({status?.totalCachedMonsters || 0})
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'settings'
                    ? 'bg-red-600 text-white shadow-md shadow-red-950'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                }`}
                title="D&D Beyond Session & DM Token Settings"
              >
                <Shield className="w-3.5 h-3.5" />
                Settings
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors ml-2 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* TAB 1: Live Search All 6,000+ D&D Beyond Monsters */}
          {activeTab === 'live_search' && (
            <div className="space-y-4">
              
              {/* Search & Filter Controls */}
              <div className="flex flex-wrap items-center gap-3 bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60">
                <div className="relative flex-1 min-w-[260px]">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search 6,000+ monsters across all D&D Beyond books (e.g. Adult Red Dragon, Strahd, Acolyte, Lich)..."
                    value={liveSearchQuery}
                    onChange={(e) => setLiveSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-red-500"
                  />
                  {liveSearchQuery && (
                    <button
                      onClick={() => setLiveSearchQuery('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* CR Filter */}
                <div className="flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={liveCrFilter}
                    onChange={(e) => setLiveCrFilter(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-red-500"
                  >
                    <option value="all">All Challenge Ratings</option>
                    <option value="0">CR 0</option>
                    <option value="1/8">CR 1/8</option>
                    <option value="1/4">CR 1/4</option>
                    <option value="1/2">CR 1/2</option>
                    <option value="1 ">CR 1</option>
                    <option value="2 ">CR 2</option>
                    <option value="3 ">CR 3</option>
                    <option value="4 ">CR 4</option>
                    <option value="5 ">CR 5</option>
                    <option value="6 ">CR 6</option>
                    <option value="7 ">CR 7</option>
                    <option value="8 ">CR 8</option>
                    <option value="9 ">CR 9</option>
                    <option value="10 ">CR 10</option>
                    <option value="15 ">CR 15</option>
                    <option value="20 ">CR 20+</option>
                  </select>
                </div>

                {/* Type Filter */}
                <select
                  value={liveTypeFilter}
                  onChange={(e) => setLiveTypeFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-red-500"
                >
                  <option value="all">All Creature Types</option>
                  <option value="Aberration">Aberration</option>
                  <option value="Beast">Beast</option>
                  <option value="Celestial">Celestial</option>
                  <option value="Construct">Construct</option>
                  <option value="Dragon">Dragon</option>
                  <option value="Elemental">Elemental</option>
                  <option value="Fey">Fey</option>
                  <option value="Fiend">Fiend</option>
                  <option value="Giant">Giant</option>
                  <option value="Humanoid">Humanoid</option>
                  <option value="Monstrosity">Monstrosity</option>
                  <option value="Ooze">Ooze</option>
                  <option value="Plant">Plant</option>
                  <option value="Undead">Undead</option>
                </select>

                {/* Size Filter */}
                <select
                  value={liveSizeFilter}
                  onChange={(e) => setLiveSizeFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-red-500"
                >
                  <option value="all">All Sizes</option>
                  <option value="Tiny">Tiny</option>
                  <option value="Small">Small</option>
                  <option value="Medium">Medium</option>
                  <option value="Large">Large</option>
                  <option value="Huge">Huge</option>
                  <option value="Gargantuan">Gargantuan</option>
                </select>

                {/* Top Pagination Buttons */}
                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-xs text-slate-400">
                    <strong className="text-white">{liveTotal.toLocaleString()}</strong> creatures found
                  </span>
                  <div className="flex items-center gap-1 border-l border-slate-700 pl-3">
                    <button
                      onClick={() => fetchLiveSearch(livePage - 1)}
                      disabled={livePage <= 1 || isLoadingLive}
                      className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      title="Previous Page"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-mono px-2 text-slate-300">
                      {livePage} / {liveTotalPages}
                    </span>
                    <button
                      onClick={() => fetchLiveSearch(livePage + 1)}
                      disabled={livePage >= liveTotalPages || isLoadingLive}
                      className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      title="Next Page"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Live Monster Cards Grid */}
              {isLoadingLive ? (
                <div className="h-72 flex flex-col items-center justify-center gap-3 text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin text-red-500" />
                  <span className="text-sm font-medium">Searching 6,000+ official D&D Beyond monsters...</span>
                </div>
              ) : liveMonsters.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center gap-3 text-slate-400 border border-dashed border-slate-700/60 rounded-xl">
                  <Search className="w-8 h-8 text-slate-500" />
                  <span className="text-sm font-medium">No creatures found matching your query.</span>
                  <p className="text-xs text-slate-400">
                    Try searching for common names like "Dragon", "Zombie", "Goblin", "Beholder", or clear your filters.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {liveMonsters.map(monster => {
                    const isAdded = addedMonsterIds.has(monster.monsterId);
                    const isAdding = addingToFirestoreIds.has(monster.monsterId);
                    const rawId = monster.monsterId.replace('ddb_', '');

                    return (
                      <div
                        key={monster.monsterId}
                        className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/70 hover:border-red-900/60 transition-all flex flex-col justify-between group shadow-sm hover:shadow-md"
                      >
                        <div className="flex gap-3">
                          {/* Circular Token Avatar */}
                          <div className="relative w-14 h-14 rounded-full bg-slate-900 border-2 border-red-700/40 group-hover:border-red-500 overflow-hidden flex-shrink-0 flex items-center justify-center shadow-lg transition-colors">
                            {monster.avatarUrl ? (
                              <img
                                src={monster.avatarUrl}
                                alt={monster.name}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <Shield className="w-6 h-6 text-slate-600" />
                            )}
                          </div>

                          {/* Info Column */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-1">
                              <h4 className="text-sm font-bold text-white truncate group-hover:text-amber-200 transition-colors" title={monster.name}>
                                {monster.name}
                              </h4>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/70 text-amber-300 border border-amber-800/50 flex-shrink-0">
                                CR {monster.challenge.split(' ')[0]}
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
                              {monster.size} {monster.type} • {monster.alignment}
                            </p>

                            {/* Combat Stats Row */}
                            <div className="flex items-center gap-3 mt-2 text-xs">
                              <span className="flex items-center gap-1 text-sky-400 font-semibold" title={`Armor Class: ${monster.ac}`}>
                                <Shield className="w-3.5 h-3.5" />
                                {monster.ac}
                              </span>
                              <span className="flex items-center gap-1 text-emerald-400 font-semibold" title={`Hit Points: ${monster.hp}`}>
                                <Heart className="w-3.5 h-3.5" />
                                {monster.hp} HP
                              </span>
                              <span className="flex items-center gap-1 text-amber-400 font-medium text-[11px] truncate" title={`Speed: ${monster.speed}`}>
                                <Zap className="w-3.5 h-3.5" />
                                {monster.speed.split(',')[0]}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Card Footer */}
                        <div className="mt-4 pt-3 border-t border-slate-700/50 flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 truncate max-w-[150px]" title={monster.source}>
                            {monster.source || 'D&D Beyond'}
                          </span>

                          <div className="flex items-center gap-1.5">
                            {/* D&D Beyond External Link */}
                            <a
                              href={`https://www.dndbeyond.com/monsters/${rawId}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-400 hover:text-white transition-colors"
                              title="View on D&D Beyond"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>

                            {/* Inspect Statblock */}
                            <button
                              onClick={() => setViewingMonster(monster)}
                              className="p-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                              title="Inspect Full Statblock"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* 1-Click Import Button */}
                            <button
                              onClick={() => handleAddToFirestore(monster)}
                              disabled={isAdded || isAdding}
                              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                isAdded
                                  ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 cursor-default'
                                  : 'bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-950'
                              } disabled:opacity-60`}
                            >
                              {isAdding ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : isAdded ? (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  Saved
                                </>
                              ) : (
                                <>
                                  <Plus className="w-3.5 h-3.5" />
                                  Compendium
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Bottom Pagination Bar */}
              {liveTotalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                  <span className="text-xs text-slate-400">
                    Showing page <strong className="text-white">{livePage}</strong> of <strong className="text-white">{liveTotalPages}</strong> ({liveTotal.toLocaleString()} total monsters)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => fetchLiveSearch(livePage - 1)}
                      disabled={livePage <= 1 || isLoadingLive}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      Previous
                    </button>
                    <button
                      onClick={() => fetchLiveSearch(livePage + 1)}
                      disabled={livePage >= liveTotalPages || isLoadingLive}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium cursor-pointer"
                    >
                      Next
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: Campaign & Real-Time Live HP */}
          {activeTab === 'campaign' && (
            <div className="space-y-6">
              
              {/* Campaign Control Bar */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-slate-800/90 via-slate-800/60 to-slate-900/90 border border-slate-700/70 flex flex-wrap items-center justify-between gap-4 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-400">D&D Beyond Campaign:</span>
                      <select
                        value={selectedCampaignId}
                        onChange={(e) => handleSelectCampaign(e.target.value)}
                        className="bg-slate-900 border border-slate-700 text-sm font-bold text-white rounded-lg px-2.5 py-1 focus:outline-none focus:border-emerald-500"
                      >
                        {campaigns.map(camp => (
                          <option key={camp.id} value={camp.id}>
                            {camp.name} ({camp.characterCount} characters - DM: {camp.dm})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Live Polling Active (every 3.5s)
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Updates to player HP in D&D Beyond reflect here and on canvas tokens automatically!
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePollNow}
                    disabled={isManualPolling}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                    title="Force immediate HP poll of all campaign character sheets"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isManualPolling ? 'animate-spin text-emerald-400' : ''}`} />
                    <span>Poll Now</span>
                  </button>

                  <button
                    onClick={handleImportEntireParty}
                    disabled={isImportingParty || campaignCharacters.length === 0}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/50 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                    title="Import/update all campaign characters in the Character Compendium so their tokens can be placed on any map"
                  >
                    {isImportingParty ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Users className="w-4 h-4" />
                    )}
                    <span>Import Entire Party ({campaignCharacters.length})</span>
                  </button>
                </div>
              </div>

              {/* Character Grid */}
              {isLoadingCampaign ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-3" />
                  <p className="text-sm font-mono text-slate-400">Loading campaign character sheets & real-time stats...</p>
                </div>
              ) : campaignCharacters.length === 0 ? (
                <div className="text-center py-16 bg-slate-800/20 rounded-2xl border border-slate-800">
                  <p className="text-slate-400 text-sm">No characters found in this campaign.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {campaignCharacters.map(char => {
                    const ratio = Math.max(0, Math.min(1, char.currentHp / Math.max(1, char.maxHp)));
                    const hpColor = char.currentHp === 0 ? '#ef4444' : ratio > 0.5 ? '#10b981' : ratio > 0.25 ? '#f59e0b' : '#ef4444';
                    const avatarUrl = char.avatarUrl || getCharacterTokenUrl(char.name);

                    return (
                      <div
                        key={char.id}
                        className="bg-slate-800/60 hover:bg-slate-800/90 border border-slate-700/70 hover:border-emerald-500/50 rounded-2xl p-4 transition-all duration-200 shadow-lg flex flex-col justify-between relative group"
                      >
                        {/* Top: Avatar, Name, Player */}
                        <div>
                          <div className="flex items-start gap-3.5 mb-3">
                            <div className="relative shrink-0">
                              <div
                                className="w-14 h-14 rounded-full overflow-hidden bg-slate-900 border-2 shadow-md"
                                style={{ borderColor: hpColor }}
                              >
                                {avatarUrl ? (
                                  <img src={avatarUrl} alt={char.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-400">
                                    <User className="w-6 h-6" />
                                  </div>
                                )}
                              </div>
                              {/* 0 HP indicator */}
                              {char.currentHp === 0 && (
                                <div className="absolute -top-1 -right-1 w-5 h-5 bg-rose-600 rounded-full flex items-center justify-center border border-white text-white shadow">
                                  <Skull className="w-3 h-3" />
                                </div>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-bold text-white truncate" title={char.name}>
                                {char.name}
                              </h3>
                              <p className="text-xs font-mono text-emerald-400 truncate">
                                {char.classLevel}
                              </p>
                              <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                                <span>{char.race}</span>
                                {char.playerName && (
                                  <>
                                    <span>•</span>
                                    <span className="text-slate-300">Player: <strong>{char.playerName}</strong></span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Large Prominent Live HP Bar */}
                          <div className="bg-slate-900/90 rounded-xl p-3 border border-slate-700/80 mb-3 shadow-inner">
                            <div className="flex items-center justify-between text-xs font-mono font-bold mb-1.5">
                              <span className="text-slate-300 flex items-center gap-1.5">
                                <Heart className="w-3.5 h-3.5 text-rose-500" />
                                Hit Points:
                              </span>
                              <span className="text-white text-sm">
                                {char.currentHp} / {char.maxHp}
                                {char.tempHp > 0 && (
                                  <span className="text-cyan-400 text-xs ml-1 font-bold">
                                    (+{char.tempHp} temp)
                                  </span>
                                )}
                              </span>
                            </div>

                            {/* Progress Bar Track */}
                            <div className="w-full h-4 bg-slate-950 rounded-full p-0.5 border border-slate-800 overflow-hidden relative shadow-inner">
                              <div
                                className="h-full rounded-full transition-all duration-500 ease-out"
                                style={{
                                  width: `${Math.round(ratio * 100)}%`,
                                  backgroundColor: hpColor,
                                  boxShadow: `0 0 10px ${hpColor}88`
                                }}
                              />
                            </div>

                            {/* HP Status Badges */}
                            <div className="flex items-center justify-between mt-2 text-[10px] font-mono">
                              <span
                                className="px-2 py-0.5 rounded-full font-bold"
                                style={{
                                  backgroundColor: `${hpColor}22`,
                                  color: hpColor,
                                  border: `1px solid ${hpColor}55`
                                }}
                              >
                                {char.currentHp === 0 ? 'Down (0 HP)' : ratio > 0.5 ? 'Healthy' : ratio > 0.25 ? 'Wounded' : 'Bloodied'}
                              </span>
                              <span className="text-slate-400 font-bold">
                                {Math.round(ratio * 100)}%
                              </span>
                            </div>
                          </div>

                          {/* Attributes Badges */}
                          <div className="flex items-center gap-2 mb-3">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-cyan-300">
                              <Shield className="w-3 h-3 text-cyan-400" />
                              AC {char.ac || 10}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-emerald-300">
                              <Activity className="w-3 h-3 text-emerald-400" />
                              {char.speed || '30 ft.'}
                            </span>
                          </div>

                          {/* Private Sheet Notice if applicable */}
                          {char.isPrivate && (
                            <div className="bg-amber-950/40 border border-amber-600/40 rounded-lg p-2 text-[10px] text-amber-300 mb-3">
                              <strong>Private Sheet:</strong> Set character privacy to Public on D&D Beyond to enable automatic live player sheet sync.
                              <div className="mt-1.5">
                                <a
                                  href={`https://www.dndbeyond.com/characters/${char.id}/builder#/home/basic`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-600/30 hover:bg-amber-500/40 border border-amber-500/60 text-amber-100 rounded font-bold transition-colors"
                                >
                                  <ExternalLink className="w-2.5 h-2.5" />
                                  Open Privacy Settings (Make Public)
                                </a>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Bottom Actions */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-700/60 mt-1">
                          <a
                            href={char.readonlyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>D&D Beyond</span>
                          </a>

                          <button
                            onClick={() => handleImportCharacterToCompendium(char)}
                            disabled={importingCharId === char.id}
                            className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                          >
                            {importingCharId === char.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Plus className="w-3 h-3" />
                            )}
                            <span>Import to Compendium</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Unlocked Bestiary Sourcebooks */}
          {activeTab === 'books' && (
            <div className="space-y-6">
              
              {/* Summary Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-slate-800/80 to-slate-800/40 border border-slate-700/60 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">Your Unlocked Bestiaries</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Select a bestiary below to parse its creatures, download circular official tokens, and save to your offline compendium.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-2xl font-black text-amber-400">{status?.totalCachedMonsters || 0}</span>
                    <span className="text-xs text-slate-400 block">Total Cached</span>
                  </div>
                  <button
                    onClick={fetchStatusAndBooks}
                    disabled={isLoadingStatus}
                    className="p-2.5 rounded-xl bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="Refresh Status"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoadingStatus ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Books Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {books.map(book => {
                  const isSyncingThis = syncingBookId === book.id;
                  const isAnySyncing = !!syncingBookId;

                  return (
                    <div
                      key={book.id}
                      className={`relative flex flex-col justify-between p-5 rounded-2xl border transition-all ${
                        book.isSynced
                          ? 'bg-slate-800/60 border-emerald-900/40 hover:border-emerald-700/60'
                          : 'bg-slate-800/40 border-slate-700/60 hover:border-red-900/50'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                            book.category === 'Core'
                              ? 'bg-purple-950/60 text-purple-300 border-purple-800/50'
                              : book.category === 'Expansion'
                              ? 'bg-amber-950/60 text-amber-300 border-amber-800/50'
                              : 'bg-blue-950/60 text-blue-300 border-blue-800/50'
                          }`}>
                            {book.category}
                          </span>

                          {book.isSynced ? (
                            <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-800/40">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {book.syncedCount} Synced
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">
                              ~{book.estimatedCount} monsters
                            </span>
                          )}
                        </div>

                        <h4 className="text-base font-bold text-white leading-snug">
                          {book.name}
                        </h4>
                        <p className="text-xs text-slate-400 mt-1">
                          {book.chapters.length} chapter{book.chapters.length > 1 ? 's' : ''} containing monsters and official token artwork.
                        </p>
                      </div>

                      <div className="mt-5 pt-4 border-t border-slate-700/50 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400 font-mono">
                          id: {book.id}
                        </span>

                        <button
                          onClick={() => handleSyncBook(book.id)}
                          disabled={isAnySyncing}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                            isSyncingThis
                              ? 'bg-red-700 text-white cursor-wait animate-pulse'
                              : book.isSynced
                              ? 'bg-slate-700/70 hover:bg-slate-700 text-slate-200'
                              : 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-950/50'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {isSyncingThis ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              Syncing...
                            </>
                          ) : book.isSynced ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5" />
                              Re-sync Book
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5" />
                              Sync Bestiary
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Progress Toast Bar if active */}
              {syncProgress && (
                <div className="p-4 rounded-xl bg-red-950/60 border border-red-800/80 flex items-center gap-3 animate-pulse">
                  <Loader2 className="w-5 h-5 text-red-400 animate-spin" />
                  <span className="text-sm font-medium text-red-200">{syncProgress}</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Offline Cached Catalog */}
          {activeTab === 'catalog' && (
            <div className="space-y-4">
              
              {/* Filters Bar */}
              <div className="flex flex-wrap items-center gap-3 bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search cached creatures by name, type..."
                    value={catalogSearchQuery}
                    onChange={(e) => setCatalogSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-400" />
                  <select
                    value={selectedBookFilter}
                    onChange={(e) => setSelectedBookFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-red-500"
                  >
                    <option value="all">All Sourcebooks</option>
                    {books.map(b => (
                      <option key={b.id} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <select
                  value={selectedCrFilter}
                  onChange={(e) => setSelectedCrFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-red-500"
                >
                  <option value="all">All Challenge Ratings</option>
                  <option value="1/8">CR 1/8</option>
                  <option value="1/4">CR 1/4</option>
                  <option value="1/2">CR 1/2</option>
                  <option value="1 ">CR 1</option>
                  <option value="2 ">CR 2</option>
                  <option value="3 ">CR 3</option>
                  <option value="4 ">CR 4</option>
                  <option value="5 ">CR 5</option>
                  <option value="10 ">CR 10</option>
                  <option value="15 ">CR 15</option>
                  <option value="20 ">CR 20+</option>
                </select>

                <div className="text-xs text-slate-400 ml-auto">
                  Showing <span className="text-white font-bold">{catalogMonsters.length}</span> of <span className="text-white font-bold">{catalogTotal}</span> cached
                </div>
              </div>

              {/* Monster Cards Grid */}
              {isLoadingCatalog ? (
                <div className="h-64 flex flex-col items-center justify-center gap-3 text-slate-400">
                  <Loader2 className="w-7 h-7 animate-spin text-red-500" />
                  <span className="text-xs">Loading cached monsters...</span>
                </div>
              ) : catalogMonsters.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center gap-3 text-slate-400 border border-dashed border-slate-700/60 rounded-xl">
                  <BookOpen className="w-8 h-8 text-slate-500" />
                  <span className="text-sm font-medium">No monsters found in offline catalog matching filters.</span>
                  <p className="text-xs text-slate-400">
                    Switch to "Search All D&D Beyond" to search through the entire 6,000+ creature bestiary.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {catalogMonsters.map(monster => {
                    const isAdded = addedMonsterIds.has(monster.monsterId);
                    const isAdding = addingToFirestoreIds.has(monster.monsterId);

                    return (
                      <div
                        key={monster.monsterId}
                        className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/70 hover:border-slate-600 transition-all flex flex-col justify-between group"
                      >
                        <div className="flex gap-3">
                          <div className="w-14 h-14 rounded-full bg-slate-900 border border-slate-700 overflow-hidden flex-shrink-0 flex items-center justify-center shadow-inner">
                            {monster.avatarUrl ? (
                              <img
                                src={monster.avatarUrl}
                                alt={monster.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <Shield className="w-6 h-6 text-slate-600" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-1">
                              <h4 className="text-sm font-bold text-white truncate" title={monster.name}>
                                {monster.name}
                              </h4>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/60 text-amber-300 border border-amber-800/40 flex-shrink-0">
                                CR {monster.challenge.split(' ')[0]}
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
                              {monster.size} {monster.type} • {monster.alignment}
                            </p>

                            <div className="flex items-center gap-3 mt-2 text-xs">
                              <span className="flex items-center gap-1 text-sky-400 font-semibold">
                                <Shield className="w-3 h-3" />
                                {monster.ac}
                              </span>
                              <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                                <Heart className="w-3 h-3" />
                                {monster.hp} HP
                              </span>
                              <span className="flex items-center gap-1 text-amber-400 font-medium text-[11px] truncate">
                                <Zap className="w-3 h-3" />
                                {monster.speed.split(',')[0]}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-700/50 flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 truncate max-w-[150px]" title={monster.source}>
                            {monster.source || 'D&D Beyond'}
                          </span>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setViewingMonster(monster)}
                              className="p-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                              title="Inspect Statblock"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleAddToFirestore(monster)}
                              disabled={isAdded || isAdding}
                              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                isAdded
                                  ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 cursor-default'
                                  : 'bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-950'
                              } disabled:opacity-50`}
                            >
                              {isAdding ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : isAdded ? (
                                <>
                                  <Check className="w-3 h-3" />
                                  Saved
                                </>
                              ) : (
                                <>
                                  <Plus className="w-3 h-3" />
                                  Compendium
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: D&D Beyond & DM Cobalt Settings */}
          {activeTab === 'settings' && (
            <div className="max-w-3xl mx-auto space-y-6">
              
              {/* Informational Hero Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-800/80 via-slate-800/40 to-slate-900 border border-slate-700/80 shadow-xl flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0 mt-0.5">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                      D&D Beyond Session & DM Permission Settings
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed font-sans">
                      MistWalker connects directly to D&D Beyond via your secure <code>CobaltSession</code> cookie to stream character stats, live HP, and spell slot levels.
                    </p>
                    <p className="text-xs text-slate-400 leading-relaxed font-sans">
                      <strong>Player Permission Model:</strong> If your DM enters their <strong>DM CobaltSession</strong> token below, spells and heals cast on party members in MistWalker will update their D&D Beyond sheets automatically! Without a DM token, players are safely prompted with a 1-tap approval prompt.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowInstructions(true)}
                  className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-mono font-bold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>How to find this?</span>
                </button>
              </div>

              {/* DM Cobalt Session Configuration Card */}
              <div className="p-6 rounded-2xl bg-slate-850/80 border border-amber-500/40 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                    <h4 className="text-sm font-bold font-mono text-amber-300 uppercase tracking-wider">
                      Dungeon Master Cobalt Session
                    </h4>
                  </div>
                  {status?.hasDmToken ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                      DM Token Active ({status.dmTokenPreview})
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono text-slate-400 bg-slate-800 border border-slate-700">
                      Not Configured (Approval Mode Active)
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-300">
                  Allows automatic cloud synchronization when players cast healing or restoration spells on other party members.
                </p>

                <div className="flex items-center gap-3">
                  <input
                    type="password"
                    placeholder={status?.hasDmToken ? "Enter new DM CobaltSession to replace..." : "Paste DM CobaltSession cookie value here..."}
                    value={dmTokenInput}
                    onChange={(e) => setDmTokenInput(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
                  />
                  <button
                    onClick={async () => {
                      if (!dmTokenInput.trim()) {
                        toast.error('Please enter a valid Cobalt token');
                        return;
                      }
                      setIsSavingToken(true);
                      try {
                        const res = await fetch('/api/ddb/set-token', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ token: dmTokenInput.trim(), isDmToken: true })
                        });
                        const data = await res.json();
                        if (data.success) {
                          toast.success('DM Cobalt token saved! Automatic D&D Beyond sheet mutation unlocked.');
                          setDmTokenInput('');
                          fetchStatusAndBooks();
                        } else {
                          toast.error(data.error || 'Failed to update token');
                        }
                      } catch (err: any) {
                        toast.error(err.message || 'Network error');
                      } finally {
                        setIsSavingToken(false);
                      }
                    }}
                    disabled={isSavingToken || !dmTokenInput.trim()}
                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl font-mono transition-all cursor-pointer shadow-md shadow-amber-950/40 shrink-0"
                  >
                    {isSavingToken ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save DM Token'}
                  </button>
                </div>
              </div>

              {/* Player Default Cobalt Session Configuration */}
              <div className="p-6 rounded-2xl bg-slate-850/60 border border-slate-700/80 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold font-mono text-slate-200 uppercase tracking-wider">
                    Primary / Compendium Cobalt Session
                  </h4>
                  {status?.hasToken ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                      Active ({status.tokenPreview})
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono text-amber-400 bg-amber-500/10 border border-amber-500/30">
                      Missing
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-400">
                  Primary token used for Compendium book ingestion, live monster searches, and game log streaming.
                </p>

                <div className="flex items-center gap-3">
                  <input
                    type="password"
                    placeholder={status?.hasToken ? "Enter new CobaltSession to replace..." : "Paste CobaltSession cookie value here..."}
                    value={playerTokenInput}
                    onChange={(e) => setPlayerTokenInput(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 font-mono"
                  />
                  <button
                    onClick={async () => {
                      if (!playerTokenInput.trim()) {
                        toast.error('Please enter a valid Cobalt token');
                        return;
                      }
                      setIsSavingToken(true);
                      try {
                        const res = await fetch('/api/ddb/set-token', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ token: playerTokenInput.trim(), isDmToken: false })
                        });
                        const data = await res.json();
                        if (data.success) {
                          toast.success('Cobalt token updated successfully!');
                          setPlayerTokenInput('');
                          fetchStatusAndBooks();
                        } else {
                          toast.error(data.error || 'Failed to update token');
                        }
                      } catch (err: any) {
                        toast.error(err.message || 'Network error');
                      } finally {
                        setIsSavingToken(false);
                      }
                    }}
                    disabled={isSavingToken || !playerTokenInput.trim()}
                    className="px-5 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl font-mono transition-all cursor-pointer shadow-md shadow-red-950/40 shrink-0"
                  >
                    {isSavingToken ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Token'}
                  </button>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Detailed Statblock Modal Drawer */}
        {viewingMonster && (
          <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
            <div className="relative w-full max-w-2xl max-h-[85vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
                <div className="flex items-center gap-3">
                  {viewingMonster.avatarUrl && (
                    <img
                      src={viewingMonster.avatarUrl}
                      alt={viewingMonster.name}
                      className="w-10 h-10 rounded-full object-cover border border-slate-700 shadow-md"
                    />
                  )}
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      {viewingMonster.name}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {viewingMonster.size} {viewingMonster.type} • {viewingMonster.alignment} • {viewingMonster.source}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setViewingMonster(null)}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
                {/* AC, HP, Speed */}
                <div className="grid grid-cols-3 gap-3 p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 text-center">
                  <div>
                    <span className="text-[11px] text-slate-400 block">Armor Class</span>
                    <span className="text-base font-bold text-sky-400">{viewingMonster.ac} {viewingMonster.acNotes}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Hit Points</span>
                    <span className="text-base font-bold text-emerald-400">{viewingMonster.hp} {viewingMonster.hpFormula}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Challenge Rating</span>
                    <span className="text-base font-bold text-amber-400">{viewingMonster.challenge}</span>
                  </div>
                </div>

                {/* Abilities */}
                <div className="grid grid-cols-6 gap-2 p-3 bg-slate-800/40 rounded-xl border border-slate-700/40 text-center">
                  {[
                    ['STR', viewingMonster.str],
                    ['DEX', viewingMonster.dex],
                    ['CON', viewingMonster.con],
                    ['INT', viewingMonster.int],
                    ['WIS', viewingMonster.wis],
                    ['CHA', viewingMonster.cha]
                  ].map(([label, score]) => (
                    <div key={label as string}>
                      <span className="text-[10px] text-slate-400 block">{label}</span>
                      <span className="text-sm font-bold text-white">{score}</span>
                      <span className="text-[10px] text-slate-400">
                        {Math.floor(((score as number) - 10) / 2) >= 0 ? `+${Math.floor(((score as number) - 10) / 2)}` : Math.floor(((score as number) - 10) / 2)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Senses, Languages, Speed */}
                <div className="p-3 rounded-xl bg-slate-800/30 border border-slate-700/30 space-y-1">
                  <div><strong className="text-slate-300">Speed:</strong> <span className="text-slate-400">{viewingMonster.speed}</span></div>
                  {viewingMonster.savingThrows && <div><strong className="text-slate-300">Saving Throws:</strong> <span className="text-slate-400">{viewingMonster.savingThrows}</span></div>}
                  {viewingMonster.skills && <div><strong className="text-slate-300">Skills:</strong> <span className="text-slate-400">{viewingMonster.skills}</span></div>}
                  {viewingMonster.senses && <div><strong className="text-slate-300">Senses:</strong> <span className="text-slate-400">{viewingMonster.senses}</span></div>}
                  {viewingMonster.languages && <div><strong className="text-slate-300">Languages:</strong> <span className="text-slate-400">{viewingMonster.languages}</span></div>}
                </div>

                {/* Traits */}
                {viewingMonster.traits && viewingMonster.traits.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider mb-2">Traits</h4>
                    <div className="space-y-2">
                      {viewingMonster.traits.map((t, idx) => (
                        <div key={idx} className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-700/40">
                          <strong className="text-white">{t.name}.</strong> <span className="text-slate-300 whitespace-pre-line">{t.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                {viewingMonster.actions && viewingMonster.actions.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider mb-2">Actions</h4>
                    <div className="space-y-2">
                      {viewingMonster.actions.map((a, idx) => (
                        <div key={idx} className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-700/40">
                          <strong className="text-white">{a.name}.</strong> <span className="text-slate-300 whitespace-pre-line">{a.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reactions */}
                {viewingMonster.reactions && viewingMonster.reactions.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-sky-300 uppercase tracking-wider mb-2">Reactions</h4>
                    <div className="space-y-2">
                      {viewingMonster.reactions.map((r, idx) => (
                        <div key={idx} className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-700/40">
                          <strong className="text-white">{r.name}.</strong> <span className="text-slate-300 whitespace-pre-line">{r.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Legendary Actions */}
                {viewingMonster.legendaryActions && viewingMonster.legendaryActions.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-purple-300 uppercase tracking-wider mb-2">Legendary Actions</h4>
                    <div className="space-y-2">
                      {viewingMonster.legendaryActions.map((l, idx) => (
                        <div key={idx} className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-700/40">
                          <strong className="text-white">{l.name}.</strong> <span className="text-slate-300 whitespace-pre-line">{l.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
                <a
                  href={`https://www.dndbeyond.com/monsters/${viewingMonster.monsterId.replace('ddb_', '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  View on D&D Beyond
                </a>

                <button
                  onClick={() => {
                    handleAddToFirestore(viewingMonster);
                    setViewingMonster(null);
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-950 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Save to Monster Compendium
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cobalt Instructions Modal */}
        <CobaltInstructionsModal
          isOpen={showInstructions}
          onClose={() => setShowInstructions(false)}
        />

      </div>
    </div>
  );
};
