import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Folder,
  Users,
  RefreshCw,
  CheckCircle2,
  Shield,
  Heart,
  Swords,
  Monitor,
  Tv,
  ArrowRight,
  Loader2,
  X,
  ChevronRight,
  ChevronDown,
  Search,
  Radio,
  MapPin
} from 'lucide-react';
import { Character } from '../types/character';
import {
  DEFAULT_CHARACTERS,
  resolveTokenCharacterStats,
  resolveTokenDdbCharacterId,
  getCharacterTokenUrl,
  isDdbMatch
} from '../data/defaultCharacters';
import { isMonsterToken } from '../types';
import {
  KNOWN_DDB_CAMPAIGNS,
  resolveCharacterCampaign,
  groupCharactersByCampaign
} from '../data/ddbCampaignRegistry';

export interface CampaignSummaryOption {
  id: string;
  title: string;
  isPrimary?: boolean;
  characterCount: number;
  previewHeroNames?: string[];
  description?: string;
}

export interface PlayerCampaignSelectModalProps {
  isOpen: boolean;
  targetMode: 'remote_player' | 'tv_table' | 'arena';
  onClose: () => void;
  onBackToModes?: () => void;
  currentCampaignId?: string;
  compendiumCharacters?: Character[];
  tokens?: any[];
  activeSceneInfo?: {
    campaignId?: string;
    campaignTitle?: string;
    chapterId?: string;
    chapterTitle?: string;
    sceneId?: string;
    sceneTitle?: string;
    mapUrl?: string;
  } | null;
  onConfirmCampaign: (selected: {
    campaignId: string;
    campaignTitle: string;
    characters: Character[];
    selectedCharacter?: Character;
  }) => void;
}

export const PlayerCampaignSelectModal: React.FC<PlayerCampaignSelectModalProps> = ({
  isOpen,
  targetMode,
  onClose,
  onBackToModes,
  currentCampaignId = '6738033',
  compendiumCharacters = [],
  tokens = [],
  activeSceneInfo = null,
  onConfirmCampaign
}) => {
  const isDmSyncMode = targetMode === 'remote_player' || targetMode === 'tv_table';

  const [selectedCampId, setSelectedCampId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('mistwalker_player_campaign_id');
      if (saved) return saved;
    }
    return currentCampaignId || '6738033';
  });

  const [campaignList, setCampaignList] = useState<CampaignSummaryOption[]>([]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [confirmedCharacters, setConfirmedCharacters] = useState<Character[]>([]);
  const [lastSyncedTime, setLastSyncedTime] = useState<number | null>(null);

  // DM Sync state (from /api/ddb/campaigns/sync-status)
  const [serverActiveCampId, setServerActiveCampId] = useState<string | null>(null);
  const [serverCachedChars, setServerCachedChars] = useState<any[]>([]);
  const [serverCampaigns, setServerCampaigns] = useState<Array<{ id: string; name: string; characterCount?: number }>>([]);

  // Collapsible side dropdown state (closed by default to keep screen uncluttered)
  const [isFallbackOpen, setIsFallbackOpen] = useState<boolean>(false);
  const [fallbackSearch, setFallbackSearch] = useState<string>('');
  const [fallbackCampFilter, setFallbackCampFilter] = useState<string>('ALL');
  const [fallbackFetchedChars, setFallbackFetchedChars] = useState<Character[]>([]);
  const [isFallbackLoading, setIsFallbackLoading] = useState<boolean>(false);

  // Pool of all known characters (compendium + defaults) for fallback search & stat resolution
  const allKnownCharacters = useMemo<Character[]>(() => {
    const list: Character[] = [];
    const seen = new Set<string>();

    for (const c of [...(compendiumCharacters || []), ...DEFAULT_CHARACTERS]) {
      if (!c || !c.name) continue;
      const key = (c.name || '').toLowerCase().trim();
      if (!seen.has(key)) {
        seen.add(key);
        list.push(c);
      }
    }
    return list;
  }, [compendiumCharacters]);

  // Build full campaign list (for Arena mode & Fallback side dropdown)
  const buildInitialCampaigns = useCallback((): CampaignSummaryOption[] => {
    const groups = groupCharactersByCampaign(allKnownCharacters);
    const options: CampaignSummaryOption[] = [];

    const gvGroup = groups.find((g) => g.campaignId === '6738033');
    options.push({
      id: '6738033',
      title: 'Keys from the Golden Vault',
      isPrimary: true,
      characterCount: gvGroup ? gvGroup.characters.length : 8,
      previewHeroNames: ['Noctua', 'Varrak', 'Aggie', 'Rowan', 'Sylas', "G'aiah"],
      description: 'Active heist campaign featuring Noctua, Varrak, Rowan, Aggie, and the Golden Vault party.'
    });

    const aupGroup = groups.find((g) => g.campaignId === '3290944');
    options.push({
      id: '3290944',
      title: 'An Unspeakable Power (but this time with a vengeance)',
      isPrimary: true,
      characterCount: aupGroup ? aupGroup.characters.length : 6,
      previewHeroNames: ['Aziza', 'Burmi', 'Stavros', 'Etho', 'Arameng', 'Zal-tan'],
      description: 'Epic campaign party featuring Aziza, Burmi, Stavros, Etho, Arameng, and Zal-tan.'
    });

    for (const group of groups) {
      if (group.campaignId === '6738033' || group.campaignId === '3290944' || group.campaignId === 'custom') {
        continue;
      }
      options.push({
        id: group.campaignId,
        title: group.campaignTitle,
        characterCount: group.characters.length,
        previewHeroNames: group.characters.slice(0, 4).map((c) => c.name.split(/[\s"'(]/)[0]),
        description: `Connected D&D Beyond Campaign with ${group.characters.length} registered adventurers.`
      });
    }

    for (const sc of serverCampaigns) {
      if (!sc.id || options.some((o) => o.id === String(sc.id))) continue;
      options.push({
        id: String(sc.id),
        title: sc.name || KNOWN_DDB_CAMPAIGNS[String(sc.id)] || `Campaign ${sc.id}`,
        characterCount: sc.characterCount || 0,
        description: 'Imported from your active D&D Beyond account.'
      });
    }

    options.push({
      id: 'ALL',
      title: 'All Campaigns & Custom Heroes',
      characterCount: allKnownCharacters.length,
      previewHeroNames: ['All Available Adventurers'],
      description: 'Show every registered hero across all campaigns and pre-gen character sheets.'
    });

    return options;
  }, [allKnownCharacters, serverCampaigns]);

  useEffect(() => {
    setCampaignList(buildInitialCampaigns());
  }, [buildInitialCampaigns]);

  // Fetch remote DDB campaigns list (for fallback dropdown & arena)
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/ddb/campaigns');
        if (res.ok && !cancelled) {
          const data = await res.json();
          if (Array.isArray(data.campaigns)) {
            setServerCampaigns(data.campaigns);
          }
        }
      } catch {
        // Offline / fallback
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  // Read-only refresh of DM's sync-status (never overwrites DM's monitored campaign)
  const refreshDmSyncStatus = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/ddb/campaigns/sync-status');
      if (res.ok) {
        const data = await res.json();
        const status = data?.status;
        if (status?.activeCampaignId) {
          setServerActiveCampId(String(status.activeCampaignId));
        }
        if (Array.isArray(status?.cachedCharacters)) {
          setServerCachedChars(status.cachedCharacters);
        }
        if (Array.isArray(status?.campaigns) && status.campaigns.length > 0) {
          setServerCampaigns((prev) => (prev.length > 0 ? prev : status.campaigns));
        }
        setLastSyncedTime(Date.now());
      }
    } catch {
      // Ignore fetch errors
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && isDmSyncMode) {
      refreshDmSyncStatus();
    }
  }, [isOpen, isDmSyncMode, refreshDmSyncStatus]);

  // Resolve the DM's active campaign ID & title
  const dmCampaign = useMemo(() => {
    const ddbId = serverActiveCampId || currentCampaignId || '6738033';
    const matchedServerCamp = serverCampaigns.find((c) => String(c.id) === String(ddbId));
    const title =
      activeSceneInfo?.campaignTitle ||
      matchedServerCamp?.name ||
      KNOWN_DDB_CAMPAIGNS[ddbId] ||
      'Active DM Campaign';

    return {
      id: activeSceneInfo?.campaignId || ddbId,
      ddbId,
      title
    };
  }, [activeSceneInfo, serverActiveCampId, serverCampaigns, currentCampaignId]);

  // Build the characters the DM has already pre-loaded (map tokens + DM-synced party)
  const dmPreloadedCharacters = useMemo<Array<Character & { isOnMap?: boolean }>>(() => {
    const resolved: Array<Character & { isOnMap?: boolean }> = [];
    const seen = new Set<string>();

    const addUnique = (char: Character & { isOnMap?: boolean }) => {
      const nameKey = (char.name || '').trim().toLowerCase();
      if (!nameKey) return;
      const alreadyExists = resolved.some((existing) =>
        isDdbMatch(existing.name, existing.id, existing.ddbCharacterId, char.ddbCharacterId, char.name)
      );
      if (alreadyExists || seen.has(nameKey)) return;
      seen.add(nameKey);
      resolved.push(char);
    };

    // 1. Pre-loaded player/ally tokens currently on the DM's battlemap
    (tokens || []).forEach((t) => {
      if (!t || t.isCondition) return;
      const isAlly = t.category === 'ally' || Boolean(t.allyId);
      const isMonster =
        !isAlly &&
        (isMonsterToken(t) || t.isMonster === true || t.category === 'monster' || t.isPlayer === false);
      if (isMonster) return;

      const rawName = (t.name || '').trim();
      if (!rawName) return;

      const stats = resolveTokenCharacterStats(t, allKnownCharacters);
      const ddbId = resolveTokenDdbCharacterId(t, allKnownCharacters) || stats.ddbCharacterId;
      const canonicalName = stats.isFromCharacterSheet && stats.characterName ? stats.characterName : rawName;
      const matchedLocal = allKnownCharacters.find((c) =>
        isDdbMatch(c.name, c.id, c.ddbCharacterId, ddbId, canonicalName)
      );

      addUnique({
        ...(matchedLocal || {}),
        id: matchedLocal?.id || String(t.characterId || t.id),
        ddbCharacterId: ddbId || matchedLocal?.ddbCharacterId,
        name: canonicalName,
        race: stats.race || matchedLocal?.race || 'Humanoid',
        classLevel: stats.classLevel || matchedLocal?.classLevel || 'Adventurer',
        alignment: matchedLocal?.alignment || 'Neutral',
        avatarUrl: t.url || t.avatarUrl || matchedLocal?.avatarUrl || getCharacterTokenUrl(canonicalName),
        ac: t.ac ?? stats.ac ?? matchedLocal?.ac ?? 14,
        hp: t.hp ?? t.currentHp ?? stats.hp ?? matchedLocal?.hp ?? 25,
        maxHp: t.maxHp ?? stats.maxHp ?? matchedLocal?.maxHp ?? 25,
        speed: stats.speed || matchedLocal?.speed || '30 ft.',
        ddbCampaignId: matchedLocal?.ddbCampaignId || dmCampaign.ddbId,
        ddbCampaignTitle: matchedLocal?.ddbCampaignTitle || dmCampaign.title,
        playerName: matchedLocal?.playerName || t.playerName || 'Player',
        stats: matchedLocal?.stats || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
        features: matchedLocal?.features || [],
        spells: matchedLocal?.spells || [],
        notes: matchedLocal?.notes || '',
        createdAt: matchedLocal?.createdAt || Date.now(),
        updatedAt: Date.now(),
        isOnMap: true
      });
    });

    // 2. Characters synced from the DM's live session / server cache for the DM's active campaign
    const ddbCampId = dmCampaign.ddbId;
    for (const d of serverCachedChars || []) {
      const dName = (d?.name || '').trim();
      if (!dName) continue;
      if (d.campaignId && ddbCampId && String(d.campaignId) !== String(ddbCampId)) continue;

      const matchedLocal = allKnownCharacters.find((c) =>
        isDdbMatch(c.name, c.id, c.ddbCharacterId, String(d.id), dName)
      );
      addUnique({
        ...(matchedLocal || {}),
        id: matchedLocal?.id || `char_ddb_${d.id}`,
        ddbCharacterId: String(d.id),
        name: dName,
        race: d.race || matchedLocal?.race || 'Humanoid',
        classLevel: d.classLevel || matchedLocal?.classLevel || 'Hero',
        alignment: matchedLocal?.alignment || 'Neutral',
        avatarUrl: d.avatarUrl || matchedLocal?.avatarUrl || getCharacterTokenUrl(dName),
        ac: d.ac ?? matchedLocal?.ac ?? 14,
        hp: d.currentHp ?? d.hp ?? matchedLocal?.hp ?? 25,
        maxHp: d.maxHp ?? matchedLocal?.maxHp ?? 25,
        speed: d.speed || matchedLocal?.speed || '30 ft.',
        ddbCampaignId: d.campaignId || ddbCampId,
        ddbCampaignTitle: d.campaignTitle || dmCampaign.title,
        playerName: d.playerName || matchedLocal?.playerName || 'Player',
        stats: d.stats || matchedLocal?.stats || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
        features: matchedLocal?.features || [],
        spells: matchedLocal?.spells || [],
        notes: matchedLocal?.notes || '',
        createdAt: matchedLocal?.createdAt || Date.now(),
        updatedAt: Date.now(),
        isOnMap: false
      });
    }

    // 3. Compendium characters synced from DM's SYNC_STATE belonging to this campaign
    for (const c of compendiumCharacters || []) {
      if (!c || !c.name) continue;
      const info = resolveCharacterCampaign(c);
      const matchesCamp =
        c.ddbCampaignId === ddbCampId ||
        info.campaignId === ddbCampId ||
        (dmCampaign.title &&
          c.ddbCampaignTitle &&
          c.ddbCampaignTitle.toLowerCase() === dmCampaign.title.toLowerCase());
      if (!matchesCamp) continue;

      addUnique({
        ...c,
        ddbCampaignId: c.ddbCampaignId || info.campaignId,
        ddbCampaignTitle: c.ddbCampaignTitle || info.campaignTitle || dmCampaign.title,
        isOnMap: false
      });
    }

    return resolved;
  }, [tokens, serverCachedChars, compendiumCharacters, allKnownCharacters, dmCampaign]);

  // Fallback side dropdown: fetch characters when user explicitly picks a campaign in the dropdown
  useEffect(() => {
    if (!isOpen || !isFallbackOpen || fallbackCampFilter === 'ALL') {
      setFallbackFetchedChars([]);
      return;
    }

    let cancelled = false;
    setIsFallbackLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/ddb/campaigns/${fallbackCampFilter}/characters`);
        if (res.ok && !cancelled) {
          const data = await res.json();
          if (Array.isArray(data.characters)) {
            const campTitle =
              campaignList.find((c) => c.id === fallbackCampFilter)?.title ||
              KNOWN_DDB_CAMPAIGNS[fallbackCampFilter] ||
              `Campaign ${fallbackCampFilter}`;
            const mapped: Character[] = data.characters.map((d: any) => {
              const localMatch = allKnownCharacters.find((c) =>
                isDdbMatch(c.name, c.id, c.ddbCharacterId, String(d.id), d.name)
              );
              return {
                ...(localMatch || {}),
                id: localMatch?.id || `char_ddb_${d.id}`,
                ddbCharacterId: String(d.id),
                name: d.name,
                race: d.race || localMatch?.race || 'Humanoid',
                classLevel: d.classLevel || localMatch?.classLevel || 'Hero',
                alignment: localMatch?.alignment || 'Neutral',
                avatarUrl: d.avatarUrl || localMatch?.avatarUrl || getCharacterTokenUrl(d.name),
                ac: d.ac ?? localMatch?.ac ?? 14,
                hp: d.currentHp ?? d.hp ?? localMatch?.hp ?? 25,
                maxHp: d.maxHp ?? localMatch?.maxHp ?? 25,
                speed: d.speed || localMatch?.speed || '30 ft.',
                ddbCampaignId: fallbackCampFilter,
                ddbCampaignTitle: d.campaignTitle || campTitle,
                playerName: d.playerName || localMatch?.playerName || 'Player',
                stats: d.stats || localMatch?.stats || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
                features: localMatch?.features || [],
                spells: localMatch?.spells || [],
                notes: localMatch?.notes || '',
                createdAt: localMatch?.createdAt || Date.now(),
                updatedAt: Date.now()
              };
            });
            setFallbackFetchedChars(mapped);
          }
        }
      } catch {
        // Fallback to local registry
      } finally {
        if (!cancelled) setIsFallbackLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, isFallbackOpen, fallbackCampFilter, campaignList, allKnownCharacters]);

  // Filtered characters & campaigns for the fallback side dropdown
  const fallbackFilteredCharacters = useMemo<Character[]>(() => {
    const pool: Character[] = [];
    const seen = new Set<string>();

    const pushIfNew = (c: Character) => {
      if (!c || !c.name) return;
      const key = `${(c.ddbCharacterId || c.id || '').toString()}_${c.name.toLowerCase().trim()}`;
      if (seen.has(key)) return;
      seen.add(key);
      pool.push(c);
    };

    fallbackFetchedChars.forEach(pushIfNew);
    allKnownCharacters.forEach(pushIfNew);

    const q = fallbackSearch.trim().toLowerCase();
    return pool.filter((c) => {
      const info = resolveCharacterCampaign(c);
      const campId = c.ddbCampaignId || info.campaignId;
      const campTitle = c.ddbCampaignTitle || info.campaignTitle || '';

      if (fallbackCampFilter !== 'ALL' && campId !== fallbackCampFilter) {
        return false;
      }
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.classLevel || '').toLowerCase().includes(q) ||
        (c.race || '').toLowerCase().includes(q) ||
        (c.playerName || '').toLowerCase().includes(q) ||
        campTitle.toLowerCase().includes(q)
      );
    });
  }, [fallbackFetchedChars, allKnownCharacters, fallbackSearch, fallbackCampFilter]);

  const fallbackMatchingCampaigns = useMemo(() => {
    const q = fallbackSearch.trim().toLowerCase();
    return campaignList.filter((c) => {
      if (c.id === 'ALL') return false;
      if (!q) return true;
      return c.title.toLowerCase().includes(q);
    });
  }, [campaignList, fallbackSearch]);

  // Arena mode: Pull & refresh characters for selected campaign
  const pullCampaignCharacters = useCallback(
    async (campaignId: string) => {
      setIsRefreshing(true);
      try {
        if (campaignId !== 'ALL' && !campaignId.startsWith('custom')) {
          try {
            await fetch('/api/ddb/campaigns/select', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ campaignId })
            });
          } catch {
            // Proceed with local registry
          }
        }

        let fetchedList: any[] = [];
        if (campaignId !== 'ALL' && !campaignId.startsWith('custom')) {
          try {
            const res = await fetch(`/api/ddb/campaigns/${campaignId}/characters`);
            if (res.ok) {
              const data = await res.json();
              if (Array.isArray(data.characters)) {
                fetchedList = data.characters;
              }
            }
          } catch {
            // Ignore API error
          }
        }

        const resolved: Character[] = [];
        const seenNames = new Set<string>();

        for (const d of fetchedList) {
          const dName = (d.name || '').trim();
          if (!dName || seenNames.has(dName.toLowerCase())) continue;
          seenNames.add(dName.toLowerCase());

          const localMatch = allKnownCharacters.find(
            (c) =>
              c.name.toLowerCase() === dName.toLowerCase() ||
              String((c as any).ddbCharacterId) === String(d.id)
          );

          resolved.push({
            ...(localMatch || {}),
            id: localMatch?.id || `char_ddb_${d.id}`,
            ddbCharacterId: d.id,
            name: dName,
            race: d.race || localMatch?.race || 'Humanoid',
            classLevel: d.classLevel || localMatch?.classLevel || 'Hero',
            alignment: localMatch?.alignment || 'Neutral',
            avatarUrl: d.avatarUrl || localMatch?.avatarUrl || '',
            ac: d.ac ?? localMatch?.ac ?? 14,
            hp: d.currentHp ?? d.hp ?? localMatch?.hp ?? 25,
            maxHp: d.maxHp ?? localMatch?.maxHp ?? 25,
            speed: d.speed || localMatch?.speed || '30 ft.',
            ddbCampaignId: campaignId,
            ddbCampaignTitle: d.campaignTitle || localMatch?.ddbCampaignTitle,
            playerName: d.playerName || localMatch?.playerName || 'Player',
            stats: localMatch?.stats || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
            actions: localMatch?.actions || [],
            features: localMatch?.features || [],
            spells: localMatch?.spells || [],
            notes: localMatch?.notes || '',
            createdAt: localMatch?.createdAt || Date.now(),
            updatedAt: Date.now()
          });
        }

        for (const localChar of allKnownCharacters) {
          const info = resolveCharacterCampaign(localChar);
          const isBelonging =
            campaignId === 'ALL' ||
            info.campaignId === campaignId ||
            localChar.ddbCampaignId === campaignId;

          if (isBelonging && !seenNames.has(localChar.name.toLowerCase().trim())) {
            seenNames.add(localChar.name.toLowerCase().trim());
            resolved.push({
              ...localChar,
              ddbCampaignId: campaignId === 'ALL' ? info.campaignId : campaignId,
              ddbCampaignTitle: info.campaignTitle,
              playerName: localChar.playerName || info.playerName || 'Player'
            });
          }
        }

        setConfirmedCharacters(resolved);
        setLastSyncedTime(Date.now());
      } catch {
        const fallback = allKnownCharacters.filter((c) => {
          if (campaignId === 'ALL') return true;
          const info = resolveCharacterCampaign(c);
          return info.campaignId === campaignId || c.ddbCampaignId === campaignId;
        });
        setConfirmedCharacters(fallback);
        setLastSyncedTime(Date.now());
      } finally {
        setIsRefreshing(false);
      }
    },
    [allKnownCharacters]
  );

  // Only auto-pull campaigns in Arena mode (DM-sync mode uses live DM state)
  useEffect(() => {
    if (isOpen && !isDmSyncMode && selectedCampId) {
      pullCampaignCharacters(selectedCampId);
    }
  }, [isOpen, isDmSyncMode, selectedCampId, pullCampaignCharacters]);

  // Confirm handler
  const handleConfirm = (
    chosenChar?: Character,
    overrideCampaignId?: string,
    overrideCampaignTitle?: string,
    overrideCharacters?: Character[]
  ) => {
    const campId = overrideCampaignId || (isDmSyncMode ? dmCampaign.ddbId : selectedCampId);
    const campTitle =
      overrideCampaignTitle ||
      (isDmSyncMode
        ? dmCampaign.title
        : campaignList.find((c) => c.id === campId)?.title ||
          KNOWN_DDB_CAMPAIGNS[campId] ||
          'Keys from the Golden Vault');
    const chars = overrideCharacters || (isDmSyncMode ? dmPreloadedCharacters : confirmedCharacters);

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('mistwalker_player_campaign_id', campId);
      sessionStorage.setItem('mistwalker_player_campaign_title', campTitle);
    }

    onConfirmCampaign({
      campaignId: campId,
      campaignTitle: campTitle,
      characters: chars,
      selectedCharacter: chosenChar
    });
    onClose();
  };

  if (!isOpen) return null;

  const modeBadge = {
    remote_player: {
      label: 'Remote Player View',
      icon: Monitor,
      color: 'text-amber-400 bg-amber-500/15 border-amber-500/30'
    },
    tv_table: {
      label: 'Digital TV Table',
      icon: Tv,
      color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30'
    },
    arena: {
      label: 'Battle Arena & Skirmish Lobby',
      icon: Swords,
      color: 'text-rose-400 bg-rose-500/15 border-rose-500/30'
    }
  }[targetMode];

  const ModeIcon = modeBadge.icon;

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/90 backdrop-blur-xl p-3 sm:p-5 animate-in fade-in duration-200">
      <div
        className={`relative w-full ${
          isDmSyncMode && isFallbackOpen ? 'max-w-5xl' : isDmSyncMode ? 'max-w-3xl' : 'max-w-4xl'
        } max-h-[92dvh] bg-zinc-950/95 border border-zinc-800 rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.95)] flex flex-col ring-1 ring-white/10 overflow-hidden transition-all duration-200`}
      >
        {/* Top gold accent line */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-amber-500/70 to-transparent" />

        {/* Header */}
        <div className="px-4 sm:px-7 pt-5 pb-4 border-b border-zinc-800/80 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-md shrink-0">
              {isDmSyncMode ? <Radio className="w-5 h-5" /> : <Folder className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 font-mono tracking-tight">
                  {isDmSyncMode ? 'Sync with Dungeon Master' : 'Select Your Campaign'}
                </h2>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${modeBadge.color}`}
                >
                  <ModeIcon className="w-3 h-3" />
                  <span>{modeBadge.label}</span>
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-sans mt-0.5 truncate">
                {isDmSyncMode
                  ? 'Showing the DM’s active campaign and pre-loaded party.'
                  : 'Choose a campaign for your Battle Arena roster.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isDmSyncMode && (
              <button
                type="button"
                onClick={() => setIsFallbackOpen((v) => !v)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-mono text-xs font-bold transition-all cursor-pointer ${
                  isFallbackOpen
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                    : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700/80 text-zinc-300 hover:text-amber-300'
                }`}
                title="Search all campaigns and characters if DM sync isn't loading properly"
              >
                <Search className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">All Campaigns</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${isFallbackOpen ? 'rotate-180' : ''}`}
                />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body: Main Content + Optional Side Dropdown Drawer */}
        <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
          {/* Primary Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {isDmSyncMode ? (
              <>
                {/* Single Active DM Campaign Banner */}
                <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-zinc-900/90 to-zinc-900/90 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-mono font-bold text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>DM ACTIVE CAMPAIGN</span>
                      </span>
                      {activeSceneInfo?.sceneTitle && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-zinc-400 truncate">
                          <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                          <span className="truncate">{activeSceneInfo.sceneTitle}</span>
                        </span>
                      )}
                    </div>
                    <h3 className="text-base sm:text-lg font-mono font-extrabold text-amber-200 truncate">
                      {dmCampaign.title}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={refreshDmSyncStatus}
                    disabled={isRefreshing}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-300 hover:text-amber-300 font-mono text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shrink-0 self-start sm:self-center"
                    title="Re-check DM campaign sync"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span>{isRefreshing ? 'Syncing...' : 'Refresh'}</span>
                  </button>
                </div>

                {/* Pre-Loaded Party Grid */}
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
                  <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-zinc-800">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-emerald-400" />
                      <h3 className="text-xs font-mono font-extrabold text-zinc-100 uppercase tracking-wider">
                        Pre-Loaded Characters ({dmPreloadedCharacters.length})
                      </h3>
                    </div>
                    <span className="text-[11px] font-mono text-zinc-400">
                      {targetMode === 'remote_player' ? 'Click your hero to play' : 'Synced from DM'}
                    </span>
                  </div>

                  {isRefreshing && dmPreloadedCharacters.length === 0 ? (
                    <div className="py-10 flex flex-col items-center justify-center text-zinc-400 font-mono text-xs gap-2">
                      <Loader2 className="w-7 h-7 text-amber-400 animate-spin" />
                      <span>Syncing pre-loaded characters from DM...</span>
                    </div>
                  ) : dmPreloadedCharacters.length === 0 ? (
                    <div className="py-8 text-center space-y-3">
                      <p className="text-zinc-400 font-mono text-xs">
                        No pre-loaded characters detected from the DM yet.
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsFallbackOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-amber-500/40 text-amber-300 font-mono text-xs font-bold transition-colors cursor-pointer"
                      >
                        <Search className="w-3.5 h-3.5" />
                        <span>Search All Campaigns & Characters</span>
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                      {dmPreloadedCharacters.map((char) => (
                        <div
                          key={char.id}
                          onClick={() => {
                            if (targetMode === 'remote_player') {
                              handleConfirm(char);
                            }
                          }}
                          className={`p-3 rounded-xl border border-zinc-800 bg-zinc-950/80 hover:border-amber-500/50 hover:bg-zinc-900 transition-all flex items-center gap-3 ${
                            targetMode === 'remote_player' ? 'cursor-pointer group' : ''
                          }`}
                          title={targetMode === 'remote_player' ? `Click to play as ${char.name}` : char.name}
                        >
                          <div className="w-11 h-11 rounded-xl overflow-hidden bg-zinc-800 border border-zinc-700 shrink-0 flex items-center justify-center">
                            {char.avatarUrl ? (
                              <img
                                src={char.avatarUrl}
                                alt={char.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            ) : (
                              <Users className="w-4 h-4 text-zinc-500" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-mono font-bold text-white truncate group-hover:text-amber-300">
                                {char.name}
                              </span>
                              {char.isOnMap && (
                                <span className="px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[9px] font-mono font-bold shrink-0">
                                  ON MAP
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-zinc-400 truncate">
                              {char.race || 'Hero'} • {char.classLevel || 'Level 1'}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-[9px] font-mono">
                              <span className="text-rose-400 flex items-center gap-0.5">
                                <Heart className="w-2.5 h-2.5 fill-rose-500/20 text-rose-500" />
                                <span>{char.hp ?? 25} HP</span>
                              </span>
                              <span className="text-amber-400 flex items-center gap-0.5">
                                <Shield className="w-2.5 h-2.5 text-amber-500" />
                                <span>AC {char.ac ?? 14}</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Arena Mode: Active Campaign Card + Dropdown to Select Other Campaigns */
              <>
                <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-zinc-900/90 to-zinc-900/90 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-[10px] font-mono font-bold text-amber-300">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>ACTIVE CAMPAIGN</span>
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-mono font-extrabold text-amber-200 truncate">
                      {campaignList.find((c) => c.id === selectedCampId)?.title ||
                        KNOWN_DDB_CAMPAIGNS[selectedCampId] ||
                        'Keys from the Golden Vault'}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <div className="relative">
                      <select
                        value={selectedCampId}
                        onChange={(e) => setSelectedCampId(e.target.value)}
                        className="pl-3 pr-8 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 focus:border-amber-500/60 focus:outline-none text-xs font-mono font-bold text-zinc-200 cursor-pointer"
                        aria-label="Select another campaign"
                      >
                        {campaignList.map((camp) => (
                          <option key={camp.id} value={camp.id}>
                            {camp.title} ({camp.characterCount})
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => pullCampaignCharacters(selectedCampId)}
                      disabled={isRefreshing}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-300 hover:text-amber-300 font-mono text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isRefreshing ? 'animate-spin' : ''}`} />
                      <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2.5 border-b border-zinc-800">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-emerald-400" />
                      <h3 className="text-xs font-mono font-extrabold text-zinc-100 uppercase tracking-wider flex items-center gap-2">
                        <span>Confirmed Campaign Players ({confirmedCharacters.length})</span>
                        {isRefreshing && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 font-normal">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Pulling from D&amp;D Beyond...</span>
                          </span>
                        )}
                      </h3>
                    </div>

                    {lastSyncedTime && !isRefreshing && (
                      <span className="text-[10px] font-mono text-emerald-400/90 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>Verified &amp; ready for {modeBadge.label}</span>
                      </span>
                    )}
                  </div>

                  {isRefreshing && confirmedCharacters.length === 0 ? (
                    <div className="py-10 flex flex-col items-center justify-center text-zinc-400 font-mono text-xs gap-2">
                      <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                      <span>Pulling campaign adventurers and stats...</span>
                    </div>
                  ) : confirmedCharacters.length === 0 ? (
                    <div className="py-8 text-center text-zinc-500 font-mono text-xs">
                      No characters found for this campaign.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                      {confirmedCharacters.map((char) => (
                        <div
                          key={char.id}
                          className="p-2.5 rounded-xl border border-zinc-800 bg-zinc-950/80 flex items-center gap-2.5"
                        >
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-zinc-800 border border-zinc-700 shrink-0 flex items-center justify-center">
                            {char.avatarUrl ? (
                              <img src={char.avatarUrl} alt={char.name} className="w-full h-full object-cover" />
                            ) : (
                              <Users className="w-4 h-4 text-zinc-500" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-mono font-bold text-white truncate block">
                              {char.name}
                            </span>
                            <p className="text-[10px] text-zinc-400 truncate">
                              {char.race || 'Hero'} • {char.classLevel || 'Level 1'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Collapsible Side Dropdown Panel (DM-sync fallback browser) */}
          {isDmSyncMode && isFallbackOpen && (
            <aside className="w-full lg:w-80 xl:w-96 border-t lg:border-t-0 lg:border-l border-zinc-800 bg-zinc-900/70 flex flex-col max-h-[45dvh] lg:max-h-none animate-in fade-in duration-150">
              <div className="p-3.5 border-b border-zinc-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-mono font-extrabold text-amber-300 uppercase tracking-wider">
                      All Campaigns &amp; Heroes
                    </h4>
                    <p className="text-[10px] text-zinc-400 font-sans">
                      Fallback search if DM sync isn&apos;t loading properly
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsFallbackOpen(false)}
                    className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
                    aria-label="Close side menu"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Search all campaigns & characters */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={fallbackSearch}
                    onChange={(e) => setFallbackSearch(e.target.value)}
                    placeholder="Search campaigns or characters..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-700/80 focus:border-amber-500/60 focus:outline-none text-xs font-mono text-zinc-200 placeholder:text-zinc-500"
                  />
                </div>

                {/* Campaign dropdown */}
                <select
                  value={fallbackCampFilter}
                  onChange={(e) => setFallbackCampFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-zinc-950 border border-zinc-700/80 focus:border-amber-500/60 focus:outline-none text-xs font-mono text-zinc-200 cursor-pointer"
                >
                  <option value="ALL">All Campaigns ({allKnownCharacters.length})</option>
                  {campaignList
                    .filter((c) => c.id !== 'ALL')
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                </select>
              </div>

              {/* Scrollable Fallback Results */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {/* Matching Campaigns (quick filter) */}
                {fallbackSearch.trim().length > 0 && fallbackMatchingCampaigns.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 px-1">
                      Campaigns
                    </span>
                    {fallbackMatchingCampaigns.map((camp) => (
                      <button
                        key={camp.id}
                        type="button"
                        onClick={() => {
                          setFallbackCampFilter(camp.id);
                          setFallbackSearch('');
                        }}
                        className="w-full px-2.5 py-2 rounded-xl bg-zinc-950/80 hover:bg-zinc-800 border border-zinc-800 hover:border-amber-500/40 text-left flex items-center justify-between gap-2 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Folder className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span className="text-xs font-mono font-bold text-zinc-200 truncate">
                            {camp.title}
                          </span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Matching Characters */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500">
                      Characters ({fallbackFilteredCharacters.length})
                    </span>
                    {isFallbackLoading && <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />}
                  </div>

                  {fallbackFilteredCharacters.length === 0 ? (
                    <p className="text-[11px] text-zinc-500 font-mono text-center py-6">
                      No matching characters found.
                    </p>
                  ) : (
                    fallbackFilteredCharacters.map((char) => {
                      const info = resolveCharacterCampaign(char);
                      const campTitle = char.ddbCampaignTitle || info.campaignTitle;
                      const campId = char.ddbCampaignId || info.campaignId;
                      return (
                        <button
                          key={`${char.id}_${campId}`}
                          type="button"
                          onClick={() =>
                            handleConfirm(
                              targetMode === 'remote_player' ? char : undefined,
                              campId,
                              campTitle,
                              fallbackFilteredCharacters
                            )
                          }
                          className="w-full p-2 rounded-xl bg-zinc-950/80 hover:bg-zinc-800/90 border border-zinc-800 hover:border-amber-500/50 text-left flex items-center gap-2.5 cursor-pointer transition-all group"
                        >
                          <div className="w-8 h-8 rounded-lg overflow-hidden bg-zinc-800 border border-zinc-700 shrink-0 flex items-center justify-center">
                            {char.avatarUrl ? (
                              <img src={char.avatarUrl} alt={char.name} className="w-full h-full object-cover" />
                            ) : (
                              <Users className="w-3.5 h-3.5 text-zinc-500" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-mono font-bold text-zinc-100 group-hover:text-amber-300 truncate">
                              {char.name}
                            </div>
                            <div className="text-[10px] text-zinc-400 truncate">
                              {char.classLevel || 'Hero'} • {campTitle}
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </aside>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-4 sm:px-7 py-3.5 border-t border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          {onBackToModes ? (
            <button
              type="button"
              onClick={onBackToModes}
              className="text-xs font-mono text-zinc-400 hover:text-white transition-colors cursor-pointer self-start sm:self-auto"
            >
              ← Back to Mode Select
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 font-mono text-xs font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleConfirm()}
              disabled={!isDmSyncMode && confirmedCharacters.length === 0}
              className="flex-1 sm:flex-initial px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-mono text-xs font-extrabold shadow-lg shadow-amber-500/20 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>
                {targetMode === 'remote_player'
                  ? 'Continue to Character Select'
                  : targetMode === 'arena'
                  ? 'Launch Battle Arena'
                  : 'Enter Digital TV Table'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
